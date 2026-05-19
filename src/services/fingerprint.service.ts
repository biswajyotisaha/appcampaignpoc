import crypto from 'crypto';
import { parseUserAgent } from '../utils/ua-parser';
import { logger } from '../utils/logger';

export interface FingerprintInput {
  ip: string;
  userAgent: string;
}

/**
 * Generates a SHA-256 fingerprint hash from IP + OS type + device model.
 * Used for click dedup and primary attribution matching.
 */
export function generateFingerprint(input: FingerprintInput): string {
  const parsed = parseUserAgent(input.userAgent);
  const model = (parsed.deviceModel || 'unknown').toLowerCase();
  const raw = `${input.ip}|${parsed.type}|${model}`;
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

/**
 * Generates a loose fingerprint using only IP + OS type.
 * Used as fallback for attribution matching when exact fingerprint fails
 * (e.g., Chrome UA Reduction reports "K" as model in browser but app
 * reports real model like "Pixel 8 Pro").
 */
export function generateLooseFingerprint(input: FingerprintInput): string {
  const parsed = parseUserAgent(input.userAgent);
  const raw = `${input.ip}|${parsed.type}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
