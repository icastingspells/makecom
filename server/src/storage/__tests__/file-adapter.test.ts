import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FileAdapter } from '../file-adapter.js';
import type { SiteVersion } from '../types.js';

describe('legacy JSON storage safety', () => {
  it('reports corrupted storage instead of presenting an empty library', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-json-corruption-'));
    try {
      const storage = new FileAdapter(directory);
      expect(await storage.getCore('missing')).toBeNull();
      await mkdir(path.join(directory, 'companies'));
      await writeFile(path.join(directory, 'companies/broken.json'), '{');
      await expect(storage.listCores()).rejects.toThrow();
      await expect(storage.getCore('broken')).rejects.toThrow();
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('refuses to overwrite a saved site version and preserves its original files', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-json-immutable-'));
    try {
      const storage = new FileAdapter(directory);
      const version: SiteVersion = { id: 'site-1', coreId: 'company-1', lang: 'de', style: 'Simple', storagePath: 'local', createdAt: '2026-10-26T00:00:00Z', files: { 'index.html': '<h1>Original</h1>' } };
      await storage.saveSiteVersion(version);
      await expect(storage.saveSiteVersion({ ...version, files: { 'index.html': 'overwrite' } })).rejects.toThrow();
      expect(await storage.getSiteVersions('company-1')).toEqual([version]);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
