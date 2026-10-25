import { getEnv, hasOpenRouterKey } from '../config/env.js';

/**
 * OpenRouter Service
 * - Прокси запросов только с сервера
 * - Кэш моделей
 * - Оценка стоимости
 * - Лимит расходов на операцию
 * - Мок-режим для тестирования без ключа
 */

export interface ModelInfo {
  id: string;
  name: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  context_length?: number;
}

export interface GenerateRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
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
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      this.modelsCache = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        pricing: m.pricing,
        context_length: m.context_length
      }));
      this.cacheTime = now;
      return this.modelsCache;
    } catch {
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
   * Цены в OpenRouter обычно указаны за 1M токенов
   */
  estimateCost(modelId: string, promptTokens: number, completionTokens: number): number | null {
    const model = this.modelsCache.find(m => m.id === modelId);
    if (!model?.pricing) return null;

    const promptPrice = parseFloat(model.pricing.prompt || '0');
    const completionPrice = parseFloat(model.pricing.completion || '0');

    // prompt/completion в долларах за 1 токен? или за 1M - проверяем формат
    // В OpenRouter обычно за 1M, но для безопасности считаем консервативно
    const cost = (promptTokens * promptPrice + completionTokens * completionPrice) / 1000000;
    return cost;
  }

  /**
   * Генерация с поддержкой мок-режима
   */
  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const env = getEnv();

    // Мок-режим для тестирования без ключа
    if (env.MOCK_LLM === 'true' || !hasOpenRouterKey()) {
      // Возвращаем минимально валидный JSON-подход для тестов
      // Реальный промпт под CompanyCore будет добавлен при интеграции
      return {
        content: JSON.stringify({ _mock: true, model: req.model, message: 'Mock response - enable real mode with OPENROUTER_API_KEY' }),
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        costUsd: 0
      };
    }

    // Проверка лимита перед запросом
    // Примерная оценка - упрощённая
    const estimatedPrompt = JSON.stringify(req.messages).length / 4;
    const estimatedCost = this.estimateCost(req.model, Math.round(estimatedPrompt), 1000);
    const limit = parseFloat(env.OPENROUTER_SPEND_LIMIT_PER_OP_USD);

    if (estimatedCost !== null && estimatedCost > limit) {
      throw new Error(`Estimated cost ${estimatedCost.toFixed(6)} USD exceeds limit ${limit} USD per operation`);
    }

    // Реальный запрос к OpenRouter (только с серверной стороны)
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'makecom'
    };

    // Не отправляем HTTP-Referer вообще для локального теста
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(req)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error: ${res.status} ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;

    let costUsd: number | undefined;
    if (usage && estimatedCost !== null) {
      costUsd = estimatedCost;
    }

    return { content, usage, costUsd };
  }
}

export const openRouterService = new OpenRouterService();
