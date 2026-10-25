import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SqliteAdapter } from '../sqlite-adapter.js';
import { FileAdapter } from '../file-adapter.js';
import { loadFileSnapshot } from '../import-files.js';
import { createStorage, closeStorageConnections } from '../index.js';
import type { CompanyCore } from '../../core/types.js';
import type { SiteVersion, CompanyModuleResult } from '../types.js';
import type { GenerationOperation } from '../../services/operations.js';

function core(): CompanyCore {
  const person = { name: 'Anna', title: 'Research', bio: 'Experience' };
  return {
    id: '11111111-1111-4111-8111-111111111111', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z',
    inputs: { country: 'DE', scale: 'small' }, identity: { brandName: 'Alpha', legalEntityName: 'Alpha GmbH' },
    contacts: { city: 'Berlin', address: 'Berlin 1', phone: '+49 30 7654321', email: 'info@alpha.de' },
    people: { ceo: person, heads: [person, person] }, business: { history: 'History', specialization: 'Research', targetAudience: 'Analysts', clientProblem: 'Research cost' },
    product: { inputs: 'Data', process: 'Analysis', result: 'Reports', limits: 'Research only' },
    faq: [{ q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }, { q: 'Q3', a: 'A3' }, { q: 'Q4', a: 'A4' }, { q: 'Q5', a: 'A5' }],
    facts: {}, extensions: {}, meta: { version: 1, approval: { version: 1, approvedAt: '2026-10-26T00:00:00.000Z' } }
  };
}
const company = core();
const version: SiteVersion = { id: 'version-1', coreId: company.id, lang: 'ru', style: 'Simple', storagePath: 'local', createdAt: company.createdAt, snapshot: { core: company, hash: 'original-snapshot', createdAt: company.createdAt }, files: { 'index.html': '<h1>Alpha</h1>' } };
const moduleResult: CompanyModuleResult = { id: 'module-1', coreId: company.id, moduleKey: 'sample', payload: { text: 'Original' }, snapshotHash: 'original-snapshot', createdAt: company.createdAt };
const operation: GenerationOperation = { id: 'operation-1', kind: 'site', model: 'test/model', status: 'succeeded', stage: 'done', createdAt: company.createdAt, updatedAt: company.updatedAt, freeOnly: false, mock: true, limitUsd: 0.1, attempts: [{ number: 1, status: 'reported', costUsd: 0.02 }] };

describe('SQLite local storage', () => {
  it('preserves all contracts across connection close and a separate process reading the database', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-sqlite-'));
    const filename = path.join(directory, 'library.sqlite');
    let database = new SqliteAdapter(filename);
    try {
      await database.saveCore(company); await database.saveSiteVersion(version); await database.saveModuleResult(moduleResult); await database.saveOperation(operation);
      const updated = structuredClone(company); updated.identity.brandName = 'Beta'; updated.meta.version = 2; delete updated.meta.approval;
      await database.saveCore(updated);
      await expect(database.saveSiteVersion({ ...version, files: { 'index.html': 'overwrite' } })).rejects.toThrow();
      database.close();
      const child = execFileSync(process.execPath, ['--input-type=module', '-e', "import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1]);console.log(db.prepare('SELECT payload FROM companies').get().payload);db.close();", filename], { encoding: 'utf8' });
      expect(JSON.parse(child).identity.brandName).toBe('Beta');
      database = new SqliteAdapter(filename);
      expect(await database.getCore(company.id)).toEqual(updated);
      expect(await database.listCores()).toEqual([updated]);
      expect(await database.getCore("' OR 1=1 --")).toBeNull();
      expect(await database.getSiteVersions(company.id)).toEqual([version]);
      expect(await database.getModuleResults(company.id)).toEqual([moduleResult]);
      expect(await database.listOperations()).toEqual([operation]);
      expect(await database.getOperation(operation.id)).toEqual(operation);
      await database.saveOperation({ ...operation, status: 'failed' });
      expect((await database.getOperation(operation.id))?.status).toBe('failed');
    } finally { database.close(); await rm(directory, { recursive: true, force: true }); }
  });

  it('imports legacy JSON without losing files/snapshots/approval and refuses to overwrite a populated database', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-import-'));
    const source = new FileAdapter(path.join(directory, 'source'));
    const database = new SqliteAdapter(path.join(directory, 'destination.sqlite'));
    try {
      await source.saveCore(company); await source.saveSiteVersion(version); await source.saveModuleResult(moduleResult); await source.saveOperation(operation);
      const original = await readFile(path.join(directory, 'source/companies', company.id + '.json'), 'utf8');
      const snapshot = await loadFileSnapshot(path.join(directory, 'source'));
      database.importSnapshot(snapshot);
      expect(await database.getCore(company.id)).toEqual(company);
      expect(await database.getSiteVersions(company.id)).toEqual([version]);
      expect(await database.getModuleResults(company.id)).toEqual([moduleResult]);
      expect(await database.listOperations()).toEqual([operation]);
      expect(() => database.importSnapshot(snapshot)).toThrow('empty database');
      expect(await readFile(path.join(directory, 'source/companies', company.id + '.json'), 'utf8')).toBe(original);
    } finally { database.close(); await rm(directory, { recursive: true, force: true }); }
  });

  it('rolls back the entire import if any destination write fails', async () => {
    const database = new SqliteAdapter(':memory:');
    try {
      expect(() => database.importSnapshot({ cores: [company], versions: [version, version], modules: [], operations: [] })).toThrow();
      expect(await database.listCores()).toEqual([]);
      expect(await database.getSiteVersions(company.id)).toEqual([]);
    } finally { database.close(); }
  });

  it('rejects corrupt/empty sources instead of pretending missing records migrated', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-corrupt-import-'));
    try {
      await expect(loadFileSnapshot(directory)).rejects.toThrow('no records');
      await mkdir(path.join(directory, 'companies'));
      await writeFile(path.join(directory, 'companies', 'broken.json'), '{');
      await expect(loadFileSnapshot(directory)).rejects.toThrow('Cannot read JSON');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('selects SQLite through the same environment factory without Supabase credentials', async () => {
    const oldDriver = process.env.STORAGE_DRIVER, oldPath = process.env.DATABASE_PATH;
    process.env.STORAGE_DRIVER = 'sqlite'; process.env.DATABASE_PATH = ':memory:';
    const database = createStorage() as SqliteAdapter;
    try { expect(database).toBeInstanceOf(SqliteAdapter); await database.saveCore(company); expect(await database.getCore(company.id)).toEqual(company); }
    finally {
      closeStorageConnections();
      if (oldDriver === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = oldDriver;
      if (oldPath === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = oldPath;
    }
  });
});
