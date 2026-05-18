import { config } from './config';
import { createApp } from './app';
import { logger } from './utils/logger';
import { initializeStorage } from './storage';

async function main() {
  // Initialize storage (Postgres if DATABASE_URL is set, otherwise in-memory)
  await initializeStorage();

  const app = createApp();

  app.listen(config.port, () => {
    logger.info({
      port: config.port,
      env: config.nodeEnv,
      storage: config.databaseUrl ? 'postgresql' : 'memory',
    }, `Campaign Attribution Server running on port ${config.port}`);
  });
}

main().catch(err => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
