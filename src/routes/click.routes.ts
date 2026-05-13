import { Router, Request, Response } from 'express';
import * as campaignService from '../services/campaign.service';
import { recordClick } from '../services/click.service';
import { resolveRedirect } from '../services/redirect.service';
import { logger } from '../utils/logger';

const router = Router();

// GET /c/:slug - Record click and redirect to store
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const campaign = await campaignService.getCampaignBySlug(slug);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const userAgent = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || 'unknown';
  const referer = req.headers['referer'] || null;

  // Resolve redirect target
  const { url, device } = resolveRedirect(campaign, userAgent);

  // Record the click asynchronously (don't block redirect)
  recordClick({
    campaignId: campaign.id,
    ip,
    userAgent,
    device,
    referer,
  }).catch(err => {
    logger.error({ err, slug }, 'Failed to record click');
  });

  logger.info({ slug, device, ip: ip.substring(0, 10) + '...' }, 'Click redirect');

  res.redirect(302, url);
});

export default router;
