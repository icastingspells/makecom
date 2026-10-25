import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenRouterService } from '../openrouter.js';
import type { GenerationContext, GenerationOperation } from '../operations.js';

vi.mock('../../config/env.js', () => ({ getEnv: () => ({ MOCK_LLM: 'false', APP_BASE_URL: 'http://localhost:3000', OPENROUTER_SPEND_LIMIT_PER_OP_USD: '0.10', LLM_MAX_RETRIES: '3', LLM_RETRY_DELAY_MS: '0', LLM_REQUEST_TIMEOUT_MS: '1000' }) }));
afterEach(() => vi.unstubAllGlobals());
const model = (free = false) => ({ data: [{ id: 'test/model', pricing: { prompt: free ? '0' : '0.000001', completion: free ? '0' : '0.000002', request: '0' } }] });
const request = { model: 'test/model', messages: [{ role: 'user', content: 'private company text' }], max_tokens: 4000 };
function context(limitUsd = 0.1, freeOnly = false) {
  const updates: Partial<GenerationOperation>[] = [];
  const ctx: GenerationContext = { limitUsd, freeOnly, update: async patch => { updates.push(structuredClone(patch)); } };
  return { ctx, updates, attempts: () => updates.filter(p => p.attempts).at(-1)!.attempts! };
}
const completion = (finish = 'stop', cost: number | undefined = 0.003) => new Response(JSON.stringify({ choices: [{ message: { content: '{}' }, finish_reason: finish }], usage: { prompt_tokens: 100, completion_tokens: 20, cost } }));

describe('operation accounting and retry budget (FR-007)', () => {
  it('records a billed truncated response before failing without retrying', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(model()))).mockResolvedValueOnce(completion('length'));
    vi.stubGlobal('fetch', fetcher); const state = context();
    await expect(new OpenRouterService().generate(request, 'secret-key', state.ctx)).rejects.toThrow('обрезан');
    expect(state.attempts()).toEqual([{ number: 1, status: 'reported', costUsd: 0.003, promptTokens: 100, completionTokens: 20 }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(state.updates)).not.toMatch(/secret-key|private company text/);
  });
  it('retains unknown timeout charges and does not claim a complete total after a successful retry', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(model()))).mockRejectedValueOnce(new DOMException('private secret-key', 'TimeoutError')).mockResolvedValueOnce(completion());
    vi.stubGlobal('fetch', fetcher); const state = context();
    const result = await new OpenRouterService().generate(request, 'secret-key', state.ctx);
    expect(result.costUsd).toBeUndefined();
    expect(state.attempts().map(a => a.status)).toEqual(['unknown', 'reported']);
    expect(state.updates.some(p => p.stage === 'retry')).toBe(true);
    expect(JSON.stringify(state.updates)).not.toContain('secret-key');
  });
  it('reserves unknown charges and stops retries when the operation allowance is exhausted', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(model()))).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetcher); const state = context(0.01);
    await expect(new OpenRouterService().generate(request, 'key', state.ctx)).rejects.toThrow('ещё одну');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.attempts()[0].status).toBe('unknown');
  });
  it('never sends a paid request through a free filter, and caps free provider tariffs at zero', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(model())));
    vi.stubGlobal('fetch', fetcher);
    await expect(new OpenRouterService().generate(request, 'key', context(0.1, true).ctx)).rejects.toThrow('платная');
    expect(fetcher).toHaveBeenCalledOnce();
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify(model(true)))).mockResolvedValueOnce(completion('stop', 0));
    expect((await new OpenRouterService().generate(request, 'key', context(0, true).ctx)).costUsd).toBe(0);
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).provider.max_price).toEqual({ prompt: 0, completion: 0, request: 0 });
  });
  it('distinguishes token estimates from provider-reported charges', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(model()))).mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }], usage: { prompt_tokens: 100, completion_tokens: 20 } })));
    vi.stubGlobal('fetch', fetcher); const state = context();
    expect((await new OpenRouterService().generate(request, 'key', state.ctx)).costUsd).toBeUndefined();
    expect(state.attempts()[0]).toMatchObject({ status: 'estimated', costUsd: 0.00014 });
  });
  it('honors long Retry-After without sleeping or exhausting the daily quota', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(model()))).mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '3600' } }));
    vi.stubGlobal('fetch', fetcher); const state = context();
    await expect(new OpenRouterService().generate(request, 'key', state.ctx)).rejects.toThrow('остановлены');
    expect(fetcher).toHaveBeenCalledTimes(2); expect(state.attempts()[0].status).toBe('rejected');
    expect(state.updates.at(-1)?.retryAt).toBeDefined();
  });
  it('stops automatic retries on a 429 without a retry interval', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(model()))).mockResolvedValueOnce(new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(new OpenRouterService().generate(request, 'key', context().ctx)).rejects.toThrow('429');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
