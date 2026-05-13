import crypto from 'crypto';
import { parseUserAgent } from '../utils/ua-parser';

export interface FingerprintInput {
  ip: string;
  userAgent: string;
}

/**
 * Generates a SHA-256 fingerprint hash from IP + normalized User-Agent.
 * This is the core matching mechanism — same device from same network
 * will produce the same fingerprint within a session.
 */
export function generateFingerprint(input: FingerprintInput): string {
  const parsed = parseUserAgent(input.userAgent);
  const raw = `${input.ip}|${parsed.normalized}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
