import * as path from 'path';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import healthRoutes from './routes/health.routes';
import campaignRoutes from './routes/campaign.routes';
import clickRoutes from './routes/click.routes';
import attributionRoutes from './routes/attribution.routes';

export function createApp() {
  const app = express();

  // Trust proxy (needed for correct IP behind Render/load balancers)
  app.set('trust proxy', 1);

  // Global middleware
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Routes
  app.use('/', healthRoutes);
  app.use('/c', clickRoutes);
  app.use('/api/v1/campaigns', campaignRoutes);
  app.use('/api/v1/attribution', attributionRoutes);

  // Serve React frontend in production
  if (config.nodeEnv === 'production') {
    const webDist = path.join(__dirname, '..', 'web-dist');
    app.use(express.static(webDist));
    // Fallback to index.html for client-side routing
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
