import { z } from 'zod';

/**
 * Валидация переменных окружения
 * Ключи OpenRouter только на сервере
 */
const EnvSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_SPEND_LIMIT_PER_OP_USD: z.string().default('0.10'),
  STORAGE_DRIVER: z.enum(['file', 'supabase']).default('file'),
  DATA_DIR: z.string().default('./data'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default('sites'),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  MOCK_LLM: z.string().default('true')
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

/**
 * Получить валидированный конфиг
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ');
    throw new Error('Invalid environment config: ' + errors);
  }
  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Проверка что ключ настроен (для реального режима)
 */
export function hasOpenRouterKey(): boolean {
  const env = getEnv();
  return !!env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.length > 0;
}
