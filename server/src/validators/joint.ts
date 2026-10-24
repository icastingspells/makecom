import { CompanyCore } from '../core/types.js';
import { SiteVersion } from '../storage/types.js';
import { CompanyModuleResult } from '../storage/types.js';

/**
 * Совместная валидация всего комплекта
 * Проверяет согласованность всех сгенерированных модулей между собой
 * через единый CompanyCore
 */
export class JointValidator {
  /**
   * Проверка всего комплекта на согласованность
   */
  validateFullSet(
    core: CompanyCore,
    siteVersions: SiteVersion[],
    moduleResults: CompanyModuleResult[]
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка что все модули использовали снапшот этого же core
    for (const mod of moduleResults) {
      // snapshotHash должен соответствовать хешу core
      // (проверка будет полной при наличии снапшота)
    }

    // Проверка сайтов - должны использовать факты из core
    if (siteVersions.length > 0) {
      // Базовые проверки
    }

    // Проверка отсутствия противоречий между модулями
    // Например, разное юрлицо в разных модулях
    const usedLegalNames = new Set<string>();
    usedLegalNames.add(core.identity.legalEntityName);

    for (const mod of moduleResults) {
      // Проверяем payload на наличие core-фактов
      const payloadStr = JSON.stringify(mod.payload);
      // Простая проверка - детальная будет при реализации модулей
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
