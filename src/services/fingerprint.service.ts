import crypto from 'crypto';
import { parseUserAgent } from '../utils/ua-parser';
import { logger } from '../utils/logger';

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
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  logger.info({
    ip: input.ip,
    userAgent: input.userAgent.substring(0, 150),
    parsed: {
      type: parsed.type,
      os: parsed.os,
      osVersion: parsed.osVersion,
      deviceModel: parsed.deviceModel,
      normalized: parsed.normalized,
    },
    rawInput: raw,
    fingerprint: hash.substring(0, 16) + '...',
  }, 'Fingerprint generated');

  return hash;
}
