import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { matchAttribution } from '../services/attribution.service';
import { logger } from '../utils/logger';

const router = Router();

const attributionRequestSchema = z.object({
  // All optional — server auto-detects from request headers if not provided
  ip: z.string().min(1).optional(),
  userAgent: z.string().min(1).optional(),
  installedAt: z.string().datetime().optional(),
  bundleId: z.string().optional(),
});

// POST /api/v1/attribution/match - Match device to campaign
// The app just needs to call this endpoint — IP and User-Agent are read from headers
router.post('/match', async (req: Request, res: Response): Promise<void> => {
  const parsed = attributionRequestSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  // Auto-detect IP and User-Agent from request if not explicitly provided
  const ip = parsed.data?.ip
    || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';

  const userAgent = parsed.data?.userAgent
    || req.headers['user-agent']
    || '';

  const installedAt = parsed.data?.installedAt || new Date().toISOString();

  logger.info({
    source: 'attribution-match',
    ip,
    userAgent: userAgent.substring(0, 150),
    installedAt,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'user-agent': req.headers['user-agent']?.substring(0, 150),
    },
  }, 'Attribution match request received');

  const result = await matchAttribution({ ip, userAgent, installedAt });

  logger.info({
    source: 'attribution-match',
    matched: result.matched,
    campaignName: result.attribution?.campaignName || null,
    confidence: result.attribution?.matchConfidence || null,
  }, 'Attribution match result');

  res.json(result);
});

export default router;
