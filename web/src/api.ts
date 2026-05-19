export interface DeepLinkConfig {
  iosScheme?: string;
  androidPackage?: string;
  deepLinkPath?: string;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  iosUrl: string;
  androidUrl: string;
  fallbackUrl: string;
  metadata: Record<string, string>;
  deepLink?: DeepLinkConfig;
  clickCount: number;
  installCount: number;
  trackingLink: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;
  slug: string;
  iosUrl: string;
  androidUrl: string;
  fallbackUrl: string;
  metadata?: Record<string, string>;
  deepLink?: DeepLinkConfig;
}

const BASE = '/api/v1';

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${BASE}/campaigns`);
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  const data = await res.json();
  return data.campaigns;
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const res = await fetch(`${BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create campaign');
  }
  return res.json();
}

export async function updateCampaign(id: string, input: Partial<CreateCampaignInput>): Promise<Campaign> {
  const res = await fetch(`${BASE}/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update campaign');
  }
  return res.json();
}

export async function deleteCampaign(id: string): Promise<void> {
  const res = await fetch(`${BASE}/campaigns/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete campaign');
}

export interface DailyStat {
  date: string;
  clicks: number;
  installs: number;
}

export interface CampaignStats {
  campaignId: string;
  campaignName: string;
  totalClicks: number;
  totalInstalls: number;
  daily: DailyStat[];
}

export async function fetchCampaignStats(campaignId: string): Promise<CampaignStats> {
  const res = await fetch(`${BASE}/stats/${campaignId}`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// --- Active Users ---

export interface ActiveUserDailyStat {
  date: string;
  total: number;
  organic: number;
  nonOrganic: number;
}

export interface ActiveUserStats {
  totalActiveUsers: number;
  nonOrganicInstalls: number;
  organicInstalls: number;
  daily: ActiveUserDailyStat[];
}

export async function fetchActiveUserStats(): Promise<ActiveUserStats> {
  const res = await fetch(`${BASE}/stats/active-users`);
  if (!res.ok) throw new Error('Failed to fetch active user stats');
  return res.json();
}

export async function clearActiveUserData(): Promise<void> {
  const res = await fetch(`${BASE}/stats/active-users`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear active user data');
}
