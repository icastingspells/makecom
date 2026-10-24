import { CoreSnapshot } from '../core/types.js';

/**
 * Модульный контракт
 * Любой будущий модуль (из 8 направлений) ДОЛЖЕН следовать этим правилам:
 * - Только читает данные из CompanyCore через снапшот
 * - НЕ регенерирует identity/contacts/people
 * - Может добавлять только свои блоки в результат
 * - Должен вернуть snapshotHash для валидации
 */
export interface ModuleContext {
  snapshot: CoreSnapshot;
  lang?: 'ru' | 'de';
}

export interface ModuleResult {
  moduleKey: string;
  payload: Record<string, unknown>;
  snapshotHash: string;
  warnings?: string[];
}

/**
 * Базовый интерфейс модуля
 */
export interface IModule {
  key: string;
  name: string;
  description: string;
  /**
   * Генерация модуля ТОЛЬКО на основе снапшота CompanyCore
   */
  generate(ctx: ModuleContext): Promise<ModuleResult>;
}
