import { IStorage } from './storage.interface';
import { MemoryStorage } from './memory.storage';
import { PostgresStorage } from './postgres.storage';
import { config } from '../config';
import { logger } from '../utils/logger';

// Singleton storage instance
let storage: IStorage | null = null;

export async function initializeStorage(): Promise<IStorage> {
  if (storage) return storage;

  if (config.databaseUrl) {
    logger.info('Using PostgreSQL storage');
    const pgStorage = new PostgresStorage(config.databaseUrl);
    await pgStorage.initialize();
    storage = pgStorage;
  } else {
    logger.info('No DATABASE_URL set — using in-memory storage (data will not persist across restarts)');
    storage = new MemoryStorage();
  }

  return storage;
}

export function getStorage(): IStorage {
  if (!storage) {
    throw new Error('Storage not initialized. Call initializeStorage() before using getStorage().');
  }
  return storage;
}

export { IStorage } from './storage.interface';
