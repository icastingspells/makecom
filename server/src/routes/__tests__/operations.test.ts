import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import type { AddressInfo } from 'net';

vi.mock('../../config/env.js', () => ({ getEnv: () => ({ MOCK_LLM: 'false', APP_BASE_URL: 'http://localhost:3000', OPENROUTER_SPEND_LIMIT_PER_OP_USD: '0.10', LLM_MAX_RETRIES: '3', LLM_RETRY_DELAY_MS: '0', LLM_REQUEST_TIMEOUT_MS: '1000' }) }));

describe('generation progress and history API', () => {
  it('saves company costs on success and invalid JSON; enforces requested budget before sending', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-operations-api-'));
    vi.stubEnv('DATA_DIR', directory); vi.stubEnv('STORAGE_DRIVER', 'file');
    const originalFetch = globalThis.fetch;
    let keyData: Record<string, unknown> = { label: 'private label', hash: 'private hash', limit: 10, limit_remaining: 5, usage: 5, usage_daily: 0.5, usage_weekly: 1, usage_monthly: 2, limit_reset: 'monthly', free_model_daily_requests: { used: 2, limit: 50, remaining: 48 } };
    const provider = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'invalid json' } }], usage: { prompt_tokens: 20, completion_tokens: 10, cost: 0.002 } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"_mock":true}' } }], usage: { prompt_tokens: 20, completion_tokens: 10, cost: 0.003 } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"identity":{"brandName":"Wrong brand"}}' } }], usage: { prompt_tokens: 20, completion_tokens: 10, cost: 0.001 } })));
    vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).endsWith('/api/v1/models')) return Promise.resolve(new Response(JSON.stringify({ data: [{ id: 'test/model', pricing: { prompt: '0.000001', completion: '0.000001' } }] })));
      if (String(input).endsWith('/chat/completions')) return provider(input, init);
      if (String(input).endsWith('/api/v1/key')) return Promise.resolve(new Response(JSON.stringify({ data: keyData })));
      return originalFetch(input, init);
    });
    const { default: coreRouter } = await import('../core.js');
    const { default: operationsRouter } = await import('../operations.js');
    const { sealSessionToken } = await import('../session.js');
    const app = express(); app.use(express.json()); app.use('/api/core', coreRouter); app.use('/api/operations', operationsRouter);
    const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const headers = { 'Content-Type': 'application/json', Cookie: `makecom_openrouter=${sealSessionToken('private-test-key')}` };
    const send = (budget = '0.1', brandName?: string) => originalFetch(base + '/api/core/create', { method: 'POST', headers: { ...headers, 'X-Operation-Budget': budget }, body: JSON.stringify({ model: 'test/model', brandName, businessDirection: 'AI research', b2bServiceType: 'Research reports' }) });
    try {
      expect((await send()).status).toBe(502);
      const successful = await send('0.1', 'Exact Brand');
      expect(successful.status).toBe(200);
      const created = await successful.json();
      expect(created.core.identity.brandName).toBe('Exact Brand');
      expect(created.core.inputs).toMatchObject({ brandName: 'Exact Brand', businessDirection: 'AI research', b2bServiceType: 'Research reports' });
      expect((await send('0')).status).toBe(500);
      expect(provider).toHaveBeenCalledTimes(2);
      const malformed = await send('0.1', 'Required Brand');
      expect(malformed.status).toBe(502); expect((await malformed.json()).error).toContain('формату карточки');
      const outgoing = JSON.parse(provider.mock.calls.at(-1)![1].body);
      expect(outgoing.response_format.json_schema.schema.properties.identity.properties.brandName.enum).toEqual(['Required Brand']);
      expect(outgoing.messages[1].content).toContain('Previous profiles to differentiate from');
      expect(outgoing.messages[1].content).toContain('Exact Brand');
      const library = await originalFetch(base + '/api/core/list').then(r => r.json());
      expect(library.cores).toHaveLength(1);
      const catalog = await originalFetch(base + '/api/core/catalogs').then(r => r.json());
      expect(catalog.catalog.countries).toHaveLength(10);
      expect(catalog.catalog.scales).toHaveLength(5);
      expect(catalog.catalog.countries.filter((entry: any) => entry.supported).map((entry: any) => entry.value)).toEqual(['DE']);
      const response = await originalFetch(base + '/api/operations');
      expect(response.headers.get('cache-control')).toBe('no-store');
      const { operations } = await response.json();
      expect(operations).toHaveLength(4);
      expect(operations.find((o: any) => o.status === 'succeeded')).toMatchObject({ resultId: expect.any(String), attempts: [{ status: 'reported', costUsd: 0.003 }] });
      expect(operations.find((o: any) => o.attempts[0]?.costUsd === 0.002)).toMatchObject({ status: 'failed', stage: 'validation' });
      expect(operations.find((o: any) => o.attempts[0]?.costUsd === 0.001)).toMatchObject({ status: 'failed', stage: 'validation' });
      expect(JSON.stringify(operations)).not.toMatch(/private-test-key|Authorization|invalid json/);
      const quota = await originalFetch(base + '/api/operations/quota', { headers });
      expect(await quota.json()).toEqual({ limitUsd: 10, limitState: 'limited', remainingUsd: 5, usageUsd: 5, usageDailyUsd: 0.5, usageWeeklyUsd: 1, usageMonthlyUsd: 2, limitReset: 'monthly', freeDaily: { used: 2, limit: 50, remaining: 48 } });
      keyData = { limit: null, usage: 0, label: 'private label' };
      const unlimited = await originalFetch(base + '/api/operations/quota', { headers }).then(r => r.json());
      expect(unlimited).toMatchObject({ limitUsd: null, limitState: 'unlimited', usageUsd: 0, remainingUsd: null, freeDaily: null, limitReset: 'unknown' });
      expect(JSON.stringify(unlimited)).not.toMatch(/private|label|hash/);
      keyData = { limit: 0, limit_remaining: 0, usage: 0, limit_reset: null };
      expect(await originalFetch(base + '/api/operations/quota', { headers }).then(r => r.json())).toMatchObject({ limitUsd: 0, remainingUsd: 0, limitState: 'limited', limitReset: 'none' });
      keyData = { limit: 'invalid', usage: -1, limit_reset: 'private value' };
      expect(await originalFetch(base + '/api/operations/quota', { headers }).then(r => r.json())).toMatchObject({ limitUsd: null, usageUsd: null, limitState: 'unknown', limitReset: 'unknown' });
      expect((await originalFetch(base + '/api/operations/quota')).status).toBe(401);
      const invalid = await originalFetch(base + '/api/operations/..%2Fprivate'); expect(invalid.status).toBe(400);
    } finally {
      vi.unstubAllGlobals(); vi.unstubAllEnvs();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  });
});
