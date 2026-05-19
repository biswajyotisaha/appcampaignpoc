import { ClickRecord } from '../models/click.model';
import { DeviceType } from '../utils/ua-parser';
import { getStorage } from '../storage';
import { generateId } from '../utils/id-generator';
import { generateFingerprint } from './fingerprint.service';
import { config } from '../config';

export interface RecordClickInput {
  campaignId: string;
  ip: string;
  userAgent: string;
  device: DeviceType;
  referer: string | null;
}

export async function recordClick(input: RecordClickInput): Promise<ClickRecord> {
  const storage = getStorage();
  const fingerprint = generateFingerprint({ ip: input.ip, userAgent: input.userAgent });
  const now = new Date();

  // Deduplicate: skip if same fingerprint clicked same campaign in last 30 seconds
  const existingClicks = await storage.getClicksByFingerprint(fingerprint);
  const recentDuplicate = existingClicks.find(
    c => c.campaignId === input.campaignId &&
      (now.getTime() - c.clickedAt.getTime()) < 30_000
  );
  if (recentDuplicate) {
    return recentDuplicate;
  }

  const expiresAt = new Date(now.getTime() + config.attributionWindowHours * 60 * 60 * 1000);

  const click: ClickRecord = {
    id: generateId(),
    campaignId: input.campaignId,
    fingerprint,
    ip: input.ip,
    userAgent: input.userAgent,
    device: input.device,
    referer: input.referer,
    clickedAt: now,
    expiresAt,
    consumed: false,
  };

  await storage.createClick(click);
  await storage.incrementClickCount(input.campaignId);

  return click;
}

export async function getClicksByFingerprint(fingerprint: string): Promise<ClickRecord[]> {
  return getStorage().getClicksByFingerprint(fingerprint);
}
