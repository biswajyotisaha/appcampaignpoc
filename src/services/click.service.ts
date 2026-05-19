import { ClickRecord } from '../models/click.model';
import { DeviceType } from '../utils/ua-parser';
import { getStorage } from '../storage';
import { generateId } from '../utils/id-generator';
import { generateFingerprint } from './fingerprint.service';
import { config } from '../config';
import { logger } from '../utils/logger';

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

  const recorded = await storage.createClickIfNotDuplicate(click);

  if (!recorded) {
    logger.info({
      source: 'click-dedup',
      campaignId: input.campaignId,
      fingerprint: fingerprint.substring(0, 16) + '...',
    }, 'Duplicate click blocked by DB (same device + campaign within 10s)');
  }

  return click;
}

export async function getClicksByFingerprint(fingerprint: string): Promise<ClickRecord[]> {
  return getStorage().getClicksByFingerprint(fingerprint);
}
