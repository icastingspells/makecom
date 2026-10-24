import { IStorage } from './types.js';
import { FileAdapter } from './file-adapter.js';
import { SupabaseAdapter } from './supabase-adapter.js';

/**
 * Фабрика хранилища
 * Выбор адаптера по переменной окружения
 */
export function createStorage(): IStorage {
  const driver = process.env.STORAGE_DRIVER || 'file';

  if (driver === 'supabase') {
    return new SupabaseAdapter();
  }

  const dataDir = process.env.DATA_DIR || './data';
  return new FileAdapter(dataDir);
}

export * from './types.js';
export * from './file-adapter.js';
export * from './supabase-adapter.js';
