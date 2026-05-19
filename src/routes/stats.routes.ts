import { Router, Request, Response } from 'express';
import { getStorage } from '../storage';
import * as campaignService from '../services/campaign.service';

const router = Router();

// GET /api/v1/stats/active-users - Get active user stats (30 days)
router.get('/active-users', async (req: Request, res: Response): Promise<void> => {
  const storage = getStorage();
  const stats = await storage.getActiveUserStats();
  res.json(stats);
});

// DELETE /api/v1/stats/active-users - Clear all active user data
router.delete('/active-users', async (req: Request, res: Response): Promise<void> => {
  const storage = getStorage();
  await storage.clearAppLaunches();
  res.json({ message: 'All active user data cleared' });
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
