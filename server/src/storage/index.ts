import { IStorage } from './types.js';
import { FileAdapter } from './file-adapter.js';
import { SupabaseAdapter } from './supabase-adapter.js';
import { SqliteAdapter } from './sqlite-adapter.js';
import path from 'node:path';

const sqliteConnections = new Map<string, SqliteAdapter>();

/**
 * Фабрика хранилища
 * Выбор адаптера по переменной окружения
 */
export function createStorage(): IStorage {
  const driver = process.env.STORAGE_DRIVER || 'file';

  if (driver === 'sqlite') {
    const configured = process.env.DATABASE_PATH || path.join(process.env.DATA_DIR || './data', 'makecom.sqlite');
    const filename = configured === ':memory:' ? configured : path.resolve(configured);
    let connection = sqliteConnections.get(filename);
    if (!connection) { connection = new SqliteAdapter(filename); sqliteConnections.set(filename, connection); }
    return connection;
  }

  if (driver === 'supabase') {
    return new SupabaseAdapter();
  }

  if (driver !== 'file') throw new Error('Unknown storage driver');
  const dataDir = process.env.DATA_DIR || './data';
  return new FileAdapter(dataDir);
}

export function closeStorageConnections(): void {
  for (const connection of sqliteConnections.values()) connection.close();
  sqliteConnections.clear();
}

export * from './types.js';
export * from './file-adapter.js';
export * from './supabase-adapter.js';
export * from './sqlite-adapter.js';
