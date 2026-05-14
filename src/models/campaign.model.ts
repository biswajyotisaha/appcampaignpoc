export interface DeepLinkConfig {
  iosScheme?: string;       // e.g., "myapp" (without "://")
  androidPackage?: string;  // e.g., "com.lilly.myapp"
  deepLinkPath?: string;    // e.g., "/campaign/{slug}" — {slug} is substituted at runtime
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
  deepLink?: DeepLinkConfig;
}

export interface UpdateCampaignDto {
  name?: string;
  slug?: string;
  iosUrl?: string;
  androidUrl?: string;
  fallbackUrl?: string;
  metadata?: Record<string, string>;
  deepLink?: DeepLinkConfig;
}
