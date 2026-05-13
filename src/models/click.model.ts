import { DeviceType } from '../utils/ua-parser';

export interface ClickRecord {
  id: string;
  campaignId: string;
  fingerprint: string;   // SHA-256 hash of IP + normalized UA
  ip: string;
  userAgent: string;
  device: DeviceType;
  referer: string | null;
  clickedAt: Date;
  expiresAt: Date;       // clickedAt + attribution window
  consumed: boolean;     // true after attribution match — prevents repeat matches
}
