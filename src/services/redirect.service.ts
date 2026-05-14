import { Campaign } from '../models/campaign.model';
import { DeviceType, parseUserAgent } from '../utils/ua-parser';

export interface DeepLinkPageContext {
  device: DeviceType;
  slug: string;
  campaignName: string;
  iosScheme?: string;
  iosDeepLink?: string;
  iosStoreUrl: string;
  androidPackage?: string;
  androidDeepLink?: string;
  androidIntentUri?: string;
  androidStoreUrl: string;
  fallbackUrl: string;
}

export type RedirectAction =
  | { type: 'redirect'; url: string }
  | { type: 'deeplink_page'; context: DeepLinkPageContext };

export interface RedirectResult {
  device: DeviceType;
  action: RedirectAction;
}

/**
 * Determines the appropriate redirect action based on the user's device
 * and whether deep linking is configured for the campaign.
 */
export function resolveRedirect(campaign: Campaign, userAgent: string): RedirectResult {
  const parsed = parseUserAgent(userAgent);

  // Check if deep linking should be used for this device
  if (campaign.deepLink) {
    const hasIosConfig = !!campaign.deepLink.iosScheme;
    const hasAndroidConfig = !!campaign.deepLink.androidPackage;

    if ((parsed.type === 'ios' && hasIosConfig) || (parsed.type === 'android' && hasAndroidConfig)) {
      const path = (campaign.deepLink.deepLinkPath || '/campaign/{slug}')
        .replace('{slug}', campaign.slug);

      const context: DeepLinkPageContext = {
        device: parsed.type,
        slug: campaign.slug,
        campaignName: campaign.name,
        iosScheme: campaign.deepLink.iosScheme,
        iosDeepLink: hasIosConfig ? `${campaign.deepLink.iosScheme}:/${path}` : undefined,
        iosStoreUrl: campaign.iosUrl,
        androidPackage: campaign.deepLink.androidPackage,
        androidDeepLink: hasAndroidConfig ? `${campaign.deepLink.androidPackage}:/${path}` : undefined,
        androidIntentUri: hasAndroidConfig
          ? buildAndroidIntentUri(campaign.deepLink.androidPackage!, path, campaign.androidUrl)
          : undefined,
        androidStoreUrl: campaign.androidUrl,
        fallbackUrl: campaign.fallbackUrl,
      };

      return { device: parsed.type, action: { type: 'deeplink_page', context } };
    }
  }

  // Fallback: standard 302 redirect
  let url: string;
  switch (parsed.type) {
    case 'ios':
      url = campaign.iosUrl;
      break;
    case 'android':
      url = campaign.androidUrl;
      break;
    default:
      url = campaign.fallbackUrl;
      break;
  }

  return { device: parsed.type, action: { type: 'redirect', url } };
}

function buildAndroidIntentUri(packageName: string, path: string, fallbackUrl: string): string {
  return `intent:/${path}#Intent;scheme=${packageName};package=${packageName};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}
