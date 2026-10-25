import type { GenerationContext, GenerationOperation } from './operations.js';
import { getEnv } from '../config/env.js';
import { openRouterFetch } from '../http-proxy.js';

/** OpenRouter requests use transient session credentials; model prices are cached for budget checks. */

export interface ModelInfo {
  id: string;
  name: string;
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
  };
  context_length?: number;
  supported_parameters?: string[];
  output_modalities?: string[];
  max_completion_tokens?: number;
}

export interface GenerateRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_schema'; json_schema: { name: string; strict: boolean; schema: Record<string, unknown> } };
  provider?: { require_parameters?: boolean; max_price?: { prompt: number; completion: number; request: number } };
}

export interface GenerateResult {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  costUsd?: number;
}

export class OpenRouterService {
  private modelsCache: ModelInfo[] = [];
  private cacheTime = 0;
  private cacheTtlMs = 30 * 60 * 1000; // 30 минут

  /**
   * Получить список моделей с кэшем
   */
  async getModels(): Promise<ModelInfo[]> {
    const now = Date.now();
    if (this.modelsCache.length > 0 && now - this.cacheTime < this.cacheTtlMs) {
      return this.modelsCache;
    }

    try {
      const res = await openRouterFetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
      const data = await res.json();
      this.modelsCache = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        pricing: m.pricing,
        context_length: m.context_length,
        supported_parameters: m.supported_parameters,
        output_modalities: m.architecture?.output_modalities,
        max_completion_tokens: m.top_provider?.max_completion_tokens
      }));
      this.cacheTime = now;
      return this.modelsCache;
    } catch (err) {
      console.error('[openrouter] getModels failed:', err);
      // Фоллбек - минимальный список
      if (this.modelsCache.length > 0) return this.modelsCache;
      return [
        { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash (preview)' },
        { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat V3' }
      ];
    }
  }

  /**
   * Оценка стоимости по ценам модели
   * Model API prices are USD per token, not per million tokens.
   */
  estimateCost(modelId: string, promptTokens: number, completionTokens: number): number | null {
    const model = this.modelsCache.find(m => m.id === modelId);
    if (!model?.pricing) return null;

    const promptPrice = Number(model.pricing.prompt);
    const completionPrice = Number(model.pricing.completion);
    const requestPrice = Number(model.pricing.request ?? '0');
    if (![promptPrice, completionPrice, requestPrice].every(p => Number.isFinite(p) && p >= 0)) return null;
    return promptTokens * promptPrice + completionTokens * completionPrice + requestPrice;
  }

  /**
   * Генерация с поддержкой мок-режима, таймаутом и ретраями
   */
  async generate(req: GenerateRequest, apiKey?: string, context?: GenerationContext): Promise<GenerateResult> {
    const env = getEnv();
    const update = context?.update ?? (async () => {});
    if (env.MOCK_LLM === 'true') {
      await update({ mock: true });
      return { content: JSON.stringify({ _mock: true, model: req.model, message: 'Explicit mock mode' }), usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }, costUsd: 0 };
    }
    if (!apiKey) throw new Error('Добавьте ключ OpenRouter в разделе «Подключение».');
    await this.getModels();
    const model = this.modelsCache.find(m => m.id === req.model);
    const maxTokens = req.max_tokens ?? 4000;
    if (model?.max_completion_tokens && maxTokens > model.max_completion_tokens) throw new Error('Модель не поддерживает необходимую длину ответа. Выберите другую модель.');
    const estimatedCost = this.estimateCost(req.model, Buffer.byteLength(JSON.stringify(req), 'utf8') + 128, maxTokens);
    const serverLimit = Number(env.OPENROUTER_SPEND_LIMIT_PER_OP_USD);
    const limit = Math.min(serverLimit, context?.limitUsd ?? serverLimit);
    if (!Number.isFinite(limit) || limit < 0) throw new Error('Invalid per-operation spend limit');
    if (estimatedCost === null) throw new Error('Нет достоверной цены модели. Выберите другую модель или обновите список.');
    await update({ estimatedAttemptUsd: estimatedCost });
    if (context?.freeOnly && estimatedCost !== 0) throw new Error('Фильтр бесплатных моделей включён, но выбрана платная модель.');
    if (estimatedCost > limit) throw new Error('Estimated cost ' + estimatedCost.toFixed(6) + ' USD exceeds limit ' + limit + ' USD per operation');
    const provider = { ...req.provider, max_price: { prompt: Number(model!.pricing!.prompt) * 1e6, completion: Number(model!.pricing!.completion) * 1e6, request: Number(model!.pricing!.request ?? 0) } };
    const headers = { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', Accept: 'application/json', 'HTTP-Referer': env.APP_BASE_URL, 'X-Title': 'makecom' };
    const maxAttempts = Math.max(1, Math.min(5, parseInt(env.LLM_MAX_RETRIES || '3', 10) || 1));
    const retryDelayMs = Math.max(0, parseInt(env.LLM_RETRY_DELAY_MS || '1500', 10) || 0);
    const timeoutMs = parseInt(env.LLM_REQUEST_TIMEOUT_MS || '120000', 10);
    const attempts: GenerationOperation['attempts'] = [];
    let lastError: Error = new Error('Generation failed');
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const reserved = attempts.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.costUsd ?? estimatedCost), 0);
      if (reserved + estimatedCost > limit + 1e-12) throw new Error('Лимит операции не позволяет ещё одну попытку.');
      const entry: GenerationOperation['attempts'][number] = { number: attempt, status: 'requesting' };
      attempts.push(entry);
      await update({ stage: 'request', retryAt: undefined, attempts });
      let delay = retryDelayMs * Math.pow(2, attempt - 1);
      try {
        const res = await openRouterFetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST', headers, body: JSON.stringify({ ...req, provider }), signal: AbortSignal.timeout(timeoutMs)
        });
        if (!res.ok) {
          entry.status = res.status >= 400 && res.status < 500 ? 'rejected' : 'unknown';
          const retryAfter = res.headers.get('retry-after');
          if (retryAfter) {
            const seconds = Number(retryAfter);
            const wait = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
            if (Number.isFinite(wait)) delay = Math.max(delay, wait);
          }
          await res.body?.cancel();
          if (res.status === 429 && !retryAfter) throw new NonRetryableGenerationError('OpenRouter: достигнут лимит запросов (429). Повторите позже; проверьте дневную квоту в подключении.');
          if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new NonRetryableGenerationError('OpenRouter error: ' + res.status);
          throw new Error('OpenRouter error: ' + res.status);
        }
        const data = await res.json();
        const usage = data.usage;
        const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
        const reported = valid(usage?.cost) ? usage.cost : undefined;
        const estimated = valid(usage?.prompt_tokens) && valid(usage?.completion_tokens) ? this.estimateCost(req.model, usage.prompt_tokens, usage.completion_tokens) ?? undefined : undefined;
        entry.status = reported !== undefined ? 'reported' : estimated !== undefined ? 'estimated' : 'unknown';
        entry.costUsd = reported ?? estimated;
        if (valid(usage?.prompt_tokens)) entry.promptTokens = usage.prompt_tokens;
        if (valid(usage?.completion_tokens)) entry.completionTokens = usage.completion_tokens;
        // Persist billing even if the subsequent response validation fails.
        await update({ attempts });
        if (data.choices?.[0]?.finish_reason === 'length') throw new NonRetryableGenerationError('Ответ модели обрезан по лимиту токенов. Попробуйте другую модель или более простое оформление.');
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) throw new NonRetryableGenerationError('Модель вернула пустой ответ.');
        const known = attempts.every(item => item.status === 'reported' || item.status === 'rejected');
        return { content, usage, costUsd: known ? attempts.reduce((sum, item) => sum + (item.costUsd ?? 0), 0) : undefined };
      } catch (error: any) {
        if (entry.status === 'requesting') entry.status = 'unknown';
        await update({ attempts });
        if (error instanceof NonRetryableGenerationError) throw error;
        lastError = new Error(error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'OpenRouter: превышено время ожидания. Стоимость попытки неизвестна.' : /^OpenRouter error: [0-9]{3}$/.test(error?.message) ? error.message : 'Не удалось получить ответ OpenRouter. Стоимость попытки неизвестна.');
        if (attempt < maxAttempts) {
          await update({ stage: 'retry', retryAt: new Date(Date.now() + delay).toISOString(), attempts });
          if (delay > 15000) throw new NonRetryableGenerationError('OpenRouter просит подождать до ' + new Date(Date.now() + delay).toISOString() + '. Автоматические повторы остановлены.');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

}

class NonRetryableGenerationError extends Error {}

export const openRouterService = new OpenRouterService();
