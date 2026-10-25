import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

describe('local application with SQLite and no external services', () => {
  it('creates, approves, versions, exports and reloads the library after reopening the application', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-sqlite-api-'));
    vi.stubEnv('STORAGE_DRIVER', 'sqlite'); vi.stubEnv('DATABASE_PATH', path.join(directory, 'library.sqlite'));
    vi.stubEnv('MOCK_LLM', 'true'); vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('APP_ACCESS_PASSWORD', '');
    vi.stubEnv('SUPABASE_URL', ''); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    let server: Server | undefined;
    let closeDatabase = () => {};
    let base = '';
    const start = async () => {
      vi.resetModules();
      const { createApp } = await import('../../app.js');
      closeDatabase = (await import('../index.js')).closeStorageConnections;
      server = createApp().listen(0, '127.0.0.1');
      await new Promise<void>(resolve => server!.once('listening', resolve));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    };
    const stop = async () => {
      if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
      server = undefined; closeDatabase();
    };
    const send = (url: string, body: unknown, method = 'POST') => fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    try {
      await start();
      const response = await send('/api/core/create', { model: 'test/model', brandName: 'SQLite QA' });
      expect(response.status).toBe(200);
      const { core } = await response.json();
      expect((await send('/api/site/generate', { coreId: core.id, model: 'test/model', lang: 'ru', style: 'Simple' })).status).toBe(409);
      expect((await send(`/api/core/${core.id}/approve`, { expectedVersion: 1, consistencyReviewed: true })).status).toBe(200);
      const generated = await send('/api/site/generate', { coreId: core.id, model: 'test/model', lang: 'ru', style: 'Simple' });
      expect(generated.status).toBe(200);
      const site = await generated.json();
      expect(site.fileList).toHaveLength(5);
      const edit = { identity: { ...core.identity, brandName: 'Edited QA' }, contacts: core.contacts, people: core.people, business: core.business, product: core.product, faq: core.faq, expectedVersion: 1, consistencyReviewed: true };
      expect((await send(`/api/core/${core.id}`, edit, 'PUT')).status).toBe(200);
      await stop();
      await start();
      const exported = await fetch(`${base}/api/core/${core.id}/export`).then(result => result.json());
      expect(exported.identity.brandName).toBe('Edited QA');
      expect(exported.meta.approval).toBeUndefined();
      const saved = await fetch(`${base}/api/site/versions/${core.id}`).then(result => result.json());
      expect(saved.versions[0].snapshot.core.identity.brandName).toBe('SQLite QA');
      expect(saved.versions[0].files).toEqual(site.files);
      const history = await fetch(base + '/api/operations').then(result => result.json());
      expect(history.operations).toHaveLength(2);
      expect(history.operations.every((operation: any) => operation.status === 'succeeded')).toBe(true);
    } finally { await stop(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); }
  });
});
