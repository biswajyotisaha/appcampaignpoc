import { Router, Request, Response } from 'express';
import * as campaignService from '../services/campaign.service';
import { recordClick } from '../services/click.service';
import { resolveRedirect } from '../services/redirect.service';
import { renderDeepLinkPage } from '../services/deeplink-page.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Detects prefetch/preview requests from bots, link unfurlers, and email scanners.
 * These should not count as real user clicks.
 */
function isPrefetchOrBot(req: Request): boolean {
  // Prefetch headers sent by browsers and apps
  const purpose = req.headers['purpose'] || req.headers['sec-purpose'] || req.headers['x-purpose'] || '';
  if (typeof purpose === 'string' && /prefetch|preview/i.test(purpose)) return true;

  const ua = (req.headers['user-agent'] || '').toLowerCase();

  // Empty user-agent is almost always a bot
  if (!ua || ua.length < 10) return true;

  // Known bot/scanner patterns
  const botPatterns = [
    'bot', 'crawler', 'spider', 'preview', 'prefetch',
    'slackbot', 'twitterbot', 'facebookexternalhit', 'linkedinbot',
    'whatsapp', 'telegrambot', 'discordbot',
    'outlook', 'safelinks', 'microsoft office',
    'google-safety', 'barracuda',
    'wget', 'curl', 'python-requests', 'java/', 'go-http',
  ];

  return botPatterns.some(p => ua.includes(p));
}

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

  // Only record click for real user requests (skip bots/prefetches)
  if (isPrefetchOrBot(req)) {
    logger.info({
      source: 'click-bot-skip',
      slug,
      ip,
      userAgent: userAgent.substring(0, 150),
    }, 'Skipped click from bot/prefetch');
  } else {
    try {
      await recordClick({
        campaignId: campaign.id,
        ip,
        userAgent,
        device,
        referer,
      });
    } catch (err) {
      logger.error({ err, slug }, 'Failed to record click');
    }

    logger.info({
      source: 'click',
      slug,
      device,
      ip,
      userAgent: userAgent.substring(0, 150),
    }, 'Click recorded');
  }

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
