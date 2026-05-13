import { IStorage } from './storage.interface';
import { MemoryStorage } from './memory.storage';

// Singleton storage instance — swap implementation here when adding a database
let storage: IStorage | null = null;

export function getStorage(): IStorage {
  if (!storage) {
    storage = new MemoryStorage();
  }
  return storage;
}

export { IStorage } from './storage.interface';
