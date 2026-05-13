import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { matchAttribution } from '../services/attribution.service';

const router = Router();

const attributionRequestSchema = z.object({
  ip: z.string().min(1),
  userAgent: z.string().min(1),
  installedAt: z.string().datetime(),
  bundleId: z.string().optional(),
});

// POST /api/v1/attribution/match - Match device to campaign
router.post('/match', async (req: Request, res: Response): Promise<void> => {
  const parsed = attributionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const result = await matchAttribution(parsed.data);
  res.json(result);
});

export default router;
