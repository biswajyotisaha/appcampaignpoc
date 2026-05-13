import { Campaign } from '../models/campaign.model';
import { DeviceType, parseUserAgent } from '../utils/ua-parser';

export interface RedirectResult {
  url: string;
  device: DeviceType;
}

/**
 * Determines the appropriate redirect URL based on the user's device.
 */
export function resolveRedirect(campaign: Campaign, userAgent: string): RedirectResult {
  const parsed = parseUserAgent(userAgent);

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

  return { url, device: parsed.type };
}
