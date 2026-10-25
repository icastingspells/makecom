import { Router, type Request } from 'express';
import { operationJournal } from '../services/operations.js';
import { getEnv } from '../config/env.js';
import { openRouterFetch } from '../http-proxy.js';
import { requireOpenRouterSession, MissingSessionError } from './session.js';

export async function beginOperation(req: Request, kind: 'company' | 'site', model: string) {
  const serverLimit = Number(getEnv().OPENROUTER_SPEND_LIMIT_PER_OP_USD);
  const requested = req.get('X-Operation-Budget');
  const limit = requested === undefined ? serverLimit : Number(requested);
  if (!Number.isFinite(limit) || limit < 0 || !Number.isFinite(serverLimit) || serverLimit <= 0) throw new Error('Некорректный лимит расходов');
  return operationJournal.start(kind, model, req.get('X-Operation-Id'), Math.min(limit, serverLimit), req.get('X-Free-Only') === 'true');
}

const router = Router();
router.get('/limits', (_req, res) => res.json({ maxCostUsd: Number(getEnv().OPENROUTER_SPEND_LIMIT_PER_OP_USD) }));
router.get('/quota', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const key = requireOpenRouterSession(req);
    if (!key) return res.json({ mock: true });
    const response = await openRouterFetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) { await response.body?.cancel(); return res.status(502).json({ error: `OpenRouter: HTTP ${response.status}` }); }
    const { data } = await response.json();
    const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
    res.json({
      limitUsd: numeric(data?.limit),
      limitState: data?.limit === null ? 'unlimited' : numeric(data?.limit) !== null ? 'limited' : 'unknown',
      remainingUsd: numeric(data?.limit_remaining),
      usageUsd: numeric(data?.usage),
      usageDailyUsd: numeric(data?.usage_daily),
      usageWeeklyUsd: numeric(data?.usage_weekly),
      usageMonthlyUsd: numeric(data?.usage_monthly),
      limitReset: data?.limit_reset === null ? 'none' : ['daily', 'weekly', 'monthly'].includes(data?.limit_reset) ? data.limit_reset : 'unknown',
      freeDaily: data?.free_model_daily_requests ? { used: numeric(data.free_model_daily_requests.used), limit: numeric(data.free_model_daily_requests.limit), remaining: numeric(data.free_model_daily_requests.remaining) } : null
    });
  } catch (error) { res.status(error instanceof MissingSessionError ? 401 : 502).json({ error: error instanceof MissingSessionError ? error.message : 'Не удалось проверить квоту OpenRouter' }); }
});
router.get('/', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ operations: await operationJournal.list() }); }
  catch { res.status(500).json({ error: 'Не удалось загрузить историю операций' }); }
});
router.get('/:id', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid operation ID' });
  try {
    const operation = await operationJournal.get(req.params.id);
    res.status(operation ? 200 : 404).json(operation ? { operation } : { error: 'Operation not found' });
  } catch { res.status(500).json({ error: 'Не удалось загрузить операцию' }); }
});
export default router;
