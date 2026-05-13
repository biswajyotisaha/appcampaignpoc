import { AttributionRequest, AttributionResult } from '../models/attribution.model';
import { generateFingerprint } from './fingerprint.service';
import { getClicksByFingerprint } from './click.service';
import { getCampaignById } from './campaign.service';
import { getStorage } from '../storage';
import { config } from '../config';

const storage = getStorage();

/**
 * Attempts to match a device's first launch to a prior campaign click.
 * Uses fingerprint (IP + normalized UA) and time-window matching.
 */
export async function matchAttribution(request: AttributionRequest): Promise<AttributionResult> {
  const fingerprint = generateFingerprint({ ip: request.ip, userAgent: request.userAgent });

  // Get all clicks with this fingerprint
  const clicks = await getClicksByFingerprint(fingerprint);

  if (clicks.length === 0) {
    return { matched: false, attribution: null };
  }

  const now = new Date(request.installedAt);

  // Filter: only clicks that haven't expired and happened before the install
  const validClicks = clicks.filter(click => {
    return click.expiresAt > now && click.clickedAt <= now;
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
