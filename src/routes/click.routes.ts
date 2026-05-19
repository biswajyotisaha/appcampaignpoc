import { Router, Request, Response } from 'express';
import * as campaignService from '../services/campaign.service';
import { recordClick } from '../services/click.service';
import { resolveRedirect } from '../services/redirect.service';
import { renderDeepLinkPage } from '../services/deeplink-page.service';
import { logger } from '../utils/logger';

const router = Router();

// GET /c/:slug - Record click and redirect to store (or serve deep link interstitial)
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
  const { device, action } = resolveRedirect(campaign, userAgent);

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

  logger.info({
    source: 'click',
    slug,
    device,
    ip,
    userAgent: userAgent.substring(0, 150),
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'user-agent': req.headers['user-agent']?.substring(0, 150),
    },
  }, 'Click received');

  if (action.type === 'deeplink_page') {
    // Serve HTML interstitial that tries to open app, falls back to store
    const html = renderDeepLinkPage(action.context);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(html);
  } else {
    // Standard 302 redirect to store
    res.redirect(302, action.url);
  }
});

export default router;
