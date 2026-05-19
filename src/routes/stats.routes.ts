import { Router, Request, Response } from 'express';
import { getStorage } from '../storage';
import * as campaignService from '../services/campaign.service';

const router = Router();

// GET /api/v1/stats/active-users - Get active user stats (30 days), with optional filters
router.get('/active-users', async (req: Request, res: Response): Promise<void> => {
  const storage = getStorage();
  const platform = req.query.platform as string | undefined;
  const bundleId = req.query.bundleId as string | undefined;

  const filter: { platform?: string; bundleId?: string } = {};
  if (platform) filter.platform = platform;
  if (bundleId) filter.bundleId = bundleId;

  const stats = await storage.getActiveUserStats(Object.keys(filter).length > 0 ? filter : undefined);
  res.json(stats);
});

// GET /api/v1/stats/apps - Get list of registered apps (platform + bundleId)
router.get('/apps', async (req: Request, res: Response): Promise<void> => {
  const storage = getStorage();
  const apps = await storage.getRegisteredApps();
  res.json({ apps });
});

// DELETE /api/v1/stats/active-users - Clear all active user data
router.delete('/active-users', async (req: Request, res: Response): Promise<void> => {
  const storage = getStorage();
  await storage.clearAppLaunches();
  res.json({ message: 'All data cleared' });
});

// GET /api/v1/stats/:campaignId - Get daily click/install stats for a campaign
router.get('/:campaignId', async (req: Request, res: Response): Promise<void> => {
  const { campaignId } = req.params;

  const campaign = await campaignService.getCampaignById(campaignId);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const storage = getStorage();
  const dailyStats = await storage.getDailyStats(campaignId);

  res.json({
    campaignId: campaign.id,
    campaignName: campaign.name,
    totalClicks: campaign.clickCount,
    totalInstalls: campaign.installCount,
    daily: dailyStats,
  });
});

export default router;
