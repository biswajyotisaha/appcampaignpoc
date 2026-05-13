export interface Campaign {
  id: string;
  name: string;
  slug: string;
  iosUrl: string;
  androidUrl: string;
  fallbackUrl: string;
  metadata: Record<string, string>;
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
