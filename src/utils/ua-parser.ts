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

  const normalized = `${type}|${osName}|${osVersion}|${deviceModel}`.toLowerCase();

  return { type, os: osName, osVersion, deviceModel, normalized };
}

/** Keep only major.minor version to avoid over-splitting fingerprints */
function simplifyVersion(version: string): string {
  const parts = version.split('.');
  return parts.slice(0, 2).join('.');
}
