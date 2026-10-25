import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenRouterService } from '../openrouter.js';

vi.mock('../../config/env.js', () => ({
  getEnv: () => ({ MOCK_LLM: 'false', APP_BASE_URL: 'http://localhost:3000', OPENROUTER_SPEND_LIMIT_PER_OP_USD: '0.10', LLM_MAX_RETRIES: '3', LLM_RETRY_DELAY_MS: '0', LLM_REQUEST_TIMEOUT_MS: '1000' })
}));
afterEach(() => vi.unstubAllGlobals());
const models = { data: [{ id: 'test/model', name: 'Test', pricing: { prompt: '0.000001', completion: '0.000002', request: '0.001' } }] };
describe('OpenRouter budget for larger site generation', () => {
  it('uses per-token prices and actual usage cost from provider', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(models)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 50, completion_tokens: 20, cost: 0.002 } })));
    vi.stubGlobal('fetch', fetcher);
    const service = new OpenRouterService();
    const result = await service.generate({ model: 'test/model', messages: [], max_tokens: 12000 }, 'test-session-key');
    expect(service.estimateCost('test/model', 1000, 1000)).toBeCloseTo(0.004);
    expect(result.costUsd).toBe(0.002);
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer test-session-key');
  });
  it('blocks unknown prices and a completion allowance exceeding the budget before sending', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(models))); vi.stubGlobal('fetch', fetcher);
    const service = new OpenRouterService();
    await expect(service.generate({ model: 'unknown', messages: [] }, 'test-session-key')).rejects.toThrow('цены');
    await expect(service.generate({ model: 'test/model', messages: [], max_tokens: 100000 }, 'test-session-key')).rejects.toThrow('exceeds limit');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('does not retry permanent HTTP errors', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(models))).mockResolvedValueOnce(new Response('invalid model', { status: 400 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(new OpenRouterService().generate({ model: 'test/model', messages: [] }, 'test-session-key')).rejects.toThrow('400');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
