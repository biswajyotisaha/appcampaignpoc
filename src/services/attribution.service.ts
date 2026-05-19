import { AttributionRequest, AttributionResult } from '../models/attribution.model';
import { generateFingerprint } from './fingerprint.service';
import { getClicksByFingerprint } from './click.service';
import { getCampaignById } from './campaign.service';
import { getStorage } from '../storage';
import { config } from '../config';
import { parseUserAgent } from '../utils/ua-parser';
import { logger } from '../utils/logger';

/**
 * Attempts to match a device's first launch to a prior campaign click.
 * Uses fingerprint (IP + OS type + device model) for exact match,
 * falls back to IP + device type for loose match (handles Chrome UA Reduction).
 */
export async function matchAttribution(request: AttributionRequest): Promise<AttributionResult> {
  const fingerprint = generateFingerprint({ ip: request.ip, userAgent: request.userAgent });
  const storage = getStorage();

  // 1. Try exact fingerprint match first
  let clicks = await getClicksByFingerprint(fingerprint);

  // 2. Fallback: search by IP + device type (handles Chrome UA Reduction
  //    where browser reports "Android 10; K" but app reports "Android 16; Pixel 8 Pro")
  if (clicks.length === 0) {
    const parsed = parseUserAgent(request.userAgent);
    clicks = await storage.getClicksByIpAndDevice(request.ip, parsed.type);

    if (clicks.length > 0) {
      logger.info({
        source: 'attribution-loose-match',
        ip: request.ip,
        device: parsed.type,
        clickCount: clicks.length,
      }, 'Exact fingerprint miss, found clicks via IP+device fallback');
    }
  }

  if (clicks.length === 0) {
    return { matched: false, attribution: null };
  }

  const now = new Date(request.installedAt);

  // Filter: only clicks that haven't expired, happened before the install, and are unconsumed
  const validClicks = clicks.filter(click => {
    return !click.consumed && click.expiresAt > now && click.clickedAt <= now;
  });

  if (validClicks.length === 0) {
    return { matched: false, attribution: null };
  }

  // Pick the most recent valid click (closest to install time)
  const bestMatch = validClicks.sort(
    (a, b) => b.clickedAt.getTime() - a.clickedAt.getTime()
  )[0];

  // Get campaign details
  const campaign = await getCampaignById(bestMatch.campaignId);
  if (!campaign) {
    return { matched: false, attribution: null };
  }

  // Calculate confidence based on time delta
  const deltaHours = (now.getTime() - bestMatch.clickedAt.getTime()) / (1000 * 60 * 60);
  const matchConfidence = getConfidence(deltaHours);

  // Increment install count for this campaign
  await storage.incrementInstallCount(campaign.id);
  await storage.recordInstallEvent(campaign.id, now);

  // Mark this click as consumed — prevents repeat attribution until user clicks again
  await storage.markClickConsumed(bestMatch.id);

  return {
    matched: true,
    attribution: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignSlug: campaign.slug,
      metadata: campaign.metadata,
      clickedAt: bestMatch.clickedAt.toISOString(),
      matchConfidence,
      matchMethod: 'fingerprint',
    },
  };
}

function getConfidence(deltaHours: number): 'high' | 'medium' | 'low' {
  if (deltaHours <= config.confidenceThresholds.high) return 'high';
  if (deltaHours <= config.confidenceThresholds.medium) return 'medium';
  return 'low';
}
