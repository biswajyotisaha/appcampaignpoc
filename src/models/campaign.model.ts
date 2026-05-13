export interface Campaign {
  id: string;
  name: string;
  slug: string;
  iosUrl: string;
  androidUrl: string;
  fallbackUrl: string;
  metadata: Record<string, string>;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignDto {
  name: string;
  slug: string;
  iosUrl: string;
  androidUrl: string;
  fallbackUrl: string;
  metadata?: Record<string, string>;
}

export interface UpdateCampaignDto {
  name?: string;
  slug?: string;
  iosUrl?: string;
  androidUrl?: string;
  fallbackUrl?: string;
  metadata?: Record<string, string>;
}
