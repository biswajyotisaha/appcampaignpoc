import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as campaignService from '../services/campaign.service';

const router = Router();

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  iosUrl: z.string().url(),
  androidUrl: z.string().url(),
  fallbackUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  iosUrl: z.string().url().optional(),
  androidUrl: z.string().url().optional(),
  fallbackUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
});

// POST /api/v1/campaigns - Create campaign
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }

    const campaign = await campaignService.createCampaign(parsed.data);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      ...campaign,
      trackingLink: `${baseUrl}/c/${campaign.slug}`,
    });
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// GET /api/v1/campaigns - List all campaigns
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const campaigns = await campaignService.getAllCampaigns();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    campaigns: campaigns.map(c => ({
      ...c,
      trackingLink: `${baseUrl}/c/${c.slug}`,
    })),
    total: campaigns.length,
  });
});

// GET /api/v1/campaigns/:id - Get campaign by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const campaign = await campaignService.getCampaignById(req.params.id);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    ...campaign,
    trackingLink: `${baseUrl}/c/${campaign.slug}`,
  });
});

// PUT /api/v1/campaigns/:id - Update campaign
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
      return;
    }

    const updated = await campaignService.updateCampaign(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      ...updated,
      trackingLink: `${baseUrl}/c/${updated.slug}`,
    });
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// DELETE /api/v1/campaigns/:id - Delete campaign
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const deleted = await campaignService.deleteCampaign(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }
  res.status(204).send();
});

export default router;
