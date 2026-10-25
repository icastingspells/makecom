import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { CompanyCore } from '../core/types.js';
import type { GenerationOperation } from '../services/operations.js';
import type { IStorage, SiteVersion, CompanyModuleResult } from './types.js';

/** Local database. JSON payloads preserve the same contract as the file/cloud adapters. */
export class SqliteAdapter implements IStorage {
  private readonly database: DatabaseSync;

  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    this.database = new DatabaseSync(filename);
    const version = Number(this.database.prepare('PRAGMA user_version').get()!.user_version);
    if (version > 1) { this.database.close(); throw new Error('Database schema is newer than this application; refusing to modify it'); }
    this.database.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS site_versions (id TEXT PRIMARY KEY, core_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS site_versions_core ON site_versions(core_id, created_at);
      CREATE TABLE IF NOT EXISTS module_results (id TEXT PRIMARY KEY, core_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS module_results_core ON module_results(core_id, created_at);
      CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL);
      PRAGMA user_version = 1;
    `);
  }

  close(): void { this.database.close(); }

  private read<T>(sql: string, ...params: string[]): T | null {
    const row = this.database.prepare(sql).get(...params);
    return row ? JSON.parse(row.payload as string) as T : null;
  }
  private list<T>(sql: string, ...params: string[]): T[] {
    return this.database.prepare(sql).all(...params).map(row => JSON.parse(row.payload as string) as T);
  }

  async saveCore(core: CompanyCore): Promise<CompanyCore> {
    this.database.prepare('INSERT INTO companies VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, created_at=excluded.created_at')
      .run(core.id, JSON.stringify(core), core.createdAt);
    return core;
  }
  async getCore(id: string): Promise<CompanyCore | null> { return this.read('SELECT payload FROM companies WHERE id=?', id); }
  async listCores(): Promise<CompanyCore[]> { return this.list('SELECT payload FROM companies ORDER BY created_at DESC, id'); }

  async saveSiteVersion(version: SiteVersion): Promise<SiteVersion> {
    // Versions are immutable. Duplicate IDs must not silently overwrite an existing site.
    this.database.prepare('INSERT INTO site_versions VALUES (?, ?, ?, ?)').run(version.id, version.coreId, JSON.stringify(version), version.createdAt);
    return version;
  }
  async getSiteVersions(coreId: string): Promise<SiteVersion[]> { return this.list('SELECT payload FROM site_versions WHERE core_id=? ORDER BY created_at DESC, id', coreId); }

  async saveModuleResult(result: CompanyModuleResult): Promise<CompanyModuleResult> {
    this.database.prepare('INSERT INTO module_results VALUES (?, ?, ?, ?)').run(result.id, result.coreId, JSON.stringify(result), result.createdAt);
    return result;
  }
  async getModuleResults(coreId: string): Promise<CompanyModuleResult[]> { return this.list('SELECT payload FROM module_results WHERE core_id=? ORDER BY created_at DESC, id', coreId); }

  async saveOperation(operation: GenerationOperation): Promise<void> {
    this.database.prepare('INSERT INTO operations VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, created_at=excluded.created_at')
      .run(operation.id, JSON.stringify(operation), operation.createdAt);
  }
  async getOperation(id: string): Promise<GenerationOperation | null> { return this.read('SELECT payload FROM operations WHERE id=?', id); }
  async listOperations(): Promise<GenerationOperation[]> { return this.list('SELECT payload FROM operations ORDER BY created_at DESC, id'); }

  /** Import a previously verified file snapshot as one transaction. Never merge/overwrite an existing database. */
  importSnapshot(snapshot: { cores: CompanyCore[]; versions: SiteVersion[]; modules: CompanyModuleResult[]; operations: GenerationOperation[] }): void {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      for (const table of ['companies', 'site_versions', 'module_results', 'operations']) {
        if (Number(this.database.prepare(`SELECT count(*) AS count FROM ${table}`).get()!.count) > 0) throw new Error('Import requires an empty database; existing data was not changed');
      }
      for (const core of snapshot.cores) this.database.prepare('INSERT INTO companies VALUES (?, ?, ?)').run(core.id, JSON.stringify(core), core.createdAt);
      for (const version of snapshot.versions) this.database.prepare('INSERT INTO site_versions VALUES (?, ?, ?, ?)').run(version.id, version.coreId, JSON.stringify(version), version.createdAt);
      for (const result of snapshot.modules) this.database.prepare('INSERT INTO module_results VALUES (?, ?, ?, ?)').run(result.id, result.coreId, JSON.stringify(result), result.createdAt);
      for (const operation of snapshot.operations) this.database.prepare('INSERT INTO operations VALUES (?, ?, ?)').run(operation.id, JSON.stringify(operation), operation.createdAt);
      this.database.exec('COMMIT');
    } catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }
}
