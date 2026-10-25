import { z } from 'zod';

/**
 * Валидация переменных окружения
 * Ключи OpenRouter только на сервере
 */
const EnvSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().optional(),
  APP_ACCESS_PASSWORD: z.string().optional(),
  OPENROUTER_SPEND_LIMIT_PER_OP_USD: z.string().default('0.10'),
  STORAGE_DRIVER: z.enum(['file', 'sqlite', 'supabase']).default('file'),
  DATABASE_PATH: z.string().optional(),
  DATA_DIR: z.string().default('./data'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default('sites'),
  APP_BASE_URL: z.string().default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'),
  MOCK_LLM: z.string().default('true'),
  LLM_REQUEST_TIMEOUT_MS: z.string().default('120000'),
  LLM_MAX_RETRIES: z.string().default('3'),
  LLM_RETRY_DELAY_MS: z.string().default('1500')
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) ctx.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'At least 32 characters required in production' });
  if (env.NODE_ENV === 'production' && (!env.APP_ACCESS_PASSWORD || env.APP_ACCESS_PASSWORD.length < 16)) ctx.addIssue({ code: 'custom', path: ['APP_ACCESS_PASSWORD'], message: 'Personal app access password required in production (16+ characters)' });
  if (env.STORAGE_DRIVER === 'supabase' && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) ctx.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'Supabase URL and service-role key are required' });
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
