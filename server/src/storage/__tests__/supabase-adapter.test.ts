import { describe, it, expect, vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAdapter } from '../supabase-adapter.js';
import { SiteVersion } from '../types.js';
import type { GenerationOperation } from '../../services/operations.js';

const version: SiteVersion = { id: 'v1', coreId: 'c1', lang: 'de', style: 'Strict', storagePath: 'unused', createdAt: '2026-10-25T00:00:00Z', files: { 'index.html': '<h1>Alpha</h1>', 'style.css': 'body{color:black}' } };
describe('Supabase private site bundles', () => {
  it('persists and retrieves the operation ledger without using site bundles', async () => {
    const operation: GenerationOperation = { id: '11111111-1111-4111-8111-111111111111', kind: 'site', model: 'test/model', status: 'failed', stage: 'validation', createdAt: '2026-10-25T00:00:00Z', updatedAt: '2026-10-25T00:00:00Z', limitUsd: 0.1, freeOnly: false, mock: false, attempts: [{ number: 1, status: 'reported', costUsd: 0.004 }] };
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { operation }, error: null });
    const order = vi.fn().mockResolvedValue({ data: [{ operation }], error: null });
    const from = vi.fn().mockReturnValue({ upsert, select: () => ({ eq: () => ({ maybeSingle }), order }) });
    const adapter = new SupabaseAdapter({ from } as unknown as SupabaseClient);
    await adapter.saveOperation(operation);
    expect(upsert).toHaveBeenCalledWith({ id: operation.id, operation, created_at: operation.createdAt });
    expect(await adapter.getOperation(operation.id)).toEqual(operation);
    expect(await adapter.listOperations()).toEqual([operation]);
    expect(from.mock.calls.every(call => call[0] === 'generation_operations')).toBe(true);
  });
  it('uploads immutable files separately and stores metadata in Postgres', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null }), insert = vi.fn().mockResolvedValue({ error: null });
    const client = { storage: { from: vi.fn().mockReturnValue({ upload }) }, from: vi.fn().mockReturnValue({ insert }) } as unknown as SupabaseClient;
    const saved = await new SupabaseAdapter(client).saveSiteVersion(version);
    expect(upload).toHaveBeenCalledWith('v1/files.json', JSON.stringify(version.files), { contentType: 'application/json', upsert: false });
    expect(insert.mock.calls[0][0].version.files).toBeUndefined();
    expect(saved.files).toEqual(version.files); expect(saved.storagePath).toBe('v1/files.json');
  });
  it('reassembles saved versions for ZIP and preview without calling OpenRouter', async () => {
    const stored = { ...version, storagePath: 'v1/files.json', files: undefined };
    const order = vi.fn().mockResolvedValue({ data: [{ version: stored }], error: null });
    const download = vi.fn().mockResolvedValue({ data: new Blob([JSON.stringify(version.files)]), error: null });
    const client = { from: () => ({ select: () => ({ eq: () => ({ order }) }) }), storage: { from: () => ({ download }) } } as unknown as SupabaseClient;
    const result = await new SupabaseAdapter(client).getSiteVersions('c1');
    expect(result[0].files).toEqual(version.files); expect(download).toHaveBeenCalledWith('v1/files.json');
  });
  it('cleans up newly uploaded bundle if metadata insert fails and does not expose service errors', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const client = { storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }), remove }) }, from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'private detail' } }) }) } as unknown as SupabaseClient;
    await expect(new SupabaseAdapter(client).saveSiteVersion(version)).rejects.toThrow('failed to save site version');
    expect(remove).toHaveBeenCalledWith(['v1/files.json']);
  });
});
