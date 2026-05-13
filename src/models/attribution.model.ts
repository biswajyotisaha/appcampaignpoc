export interface AttributionResult {
  matched: boolean;
  attribution: {
    campaignId: string;
    campaignName: string;
    campaignSlug: string;
    metadata: Record<string, string>;
    clickedAt: string;          // ISO 8601
    matchConfidence: 'high' | 'medium' | 'low';
    matchMethod: 'fingerprint';
  } | null;
}

export interface AttributionRequest {
  ip: string;
  userAgent: string;
  installedAt: string;   // ISO 8601
  bundleId?: string;
}
