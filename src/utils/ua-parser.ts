import UAParser from 'ua-parser-js';

export type DeviceType = 'ios' | 'android' | 'other';

export interface ParsedDevice {
  type: DeviceType;
  os: string;
  osVersion: string;
  deviceModel: string;
  normalized: string; // Used for fingerprinting
}

export function parseUserAgent(ua: string): ParsedDevice {
  const parser = new UAParser(ua);
  const os = parser.getOS();
  const device = parser.getDevice();

  const osName = (os.name || 'unknown').toLowerCase();
  const osVersion = simplifyVersion(os.version || 'unknown');
  const deviceModel = device.model || 'unknown';

  let type: DeviceType = 'other';
  if (osName === 'ios' || osName === 'mac os') {
    // Check if it's actually a mobile device (iPhone/iPad)
    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
      type = 'ios';
    }
  } else if (osName === 'android') {
    type = 'android';
  }

  // Native iOS apps use CFNetwork/Darwin UA — detect these as iOS
  if (type === 'other' && ua.includes('CFNetwork') && ua.includes('Darwin')) {
    type = 'ios';
  }

  // Native Android apps typically use OkHttp or Dalvik — detect these as Android
  // Also normalize model to "K" to match Chrome UA Reduction (Chrome 110+ reports
  // model as "K" for all Android devices), enabling exact fingerprint match.
  let finalModel = deviceModel;
  if (type === 'other' && (/okhttp/i.test(ua) || /Dalvik/i.test(ua))) {
    type = 'android';
    if (finalModel === 'unknown') {
      finalModel = 'K'; // Match Chrome UA Reduction default
    }
  }

  const normalized = `${type}|${osName}|${osVersion}|${finalModel}`.toLowerCase();

  return { type, os: osName, osVersion, deviceModel: finalModel, normalized };
}

/** Keep only major.minor version to avoid over-splitting fingerprints */
function simplifyVersion(version: string): string {
  const parts = version.split('.');
  return parts.slice(0, 2).join('.');
}
