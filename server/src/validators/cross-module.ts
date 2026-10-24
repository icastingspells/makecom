import { CompanyCore, CoreSnapshot } from '../core/types.js';

/**
 * Кросс-модульный валидатор
 * Ключевая задача - не допустить регенерации core-фактов модулями
 * Модули могут только читать из снапшота, нельзя менять identity/contacts/people
 */
export class CrossModuleValidator {
  /**
   * Проверить, что модуль не изменил core-факты
   * Сравниваем снапшот с тем, что модуль якобы использовал
   */
  validateNoCoreRegeneration(
    snapshot: CoreSnapshot,
    moduleOutput: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const core = snapshot.core;

    // Модуль не должен содержать полей, которые означают регенерацию core
    const forbiddenCoreFields = ['identity', 'contacts', 'people'];
    
    for (const field of forbiddenCoreFields) {
      if (field in moduleOutput) {
        // Проверяем, не пытается ли модуль заменить core-блоки
        const moduleVal = moduleOutput[field];
        if (typeof moduleVal === 'object' && moduleVal !== null) {
          errors.push(`Module output contains forbidden core field: ${field}. Modules must read from CompanyCore, not regenerate it.`);
        }
      }
    }

    // Дополнительная проверка - в payload модуля не должно быть brandName/legalEntityName
    // взятых из другого источника, отличного от снапшота
    const payloadStr = JSON.stringify(moduleOutput);
    
    // Если в модуле есть упоминания, они должны совпадать со снапшотом
    // (базовая проверка - будет доработана при реализации модулей)
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Проверить соответствие фактов модуля фактам из CompanyCore
   */
  validateFactsMatch(core: CompanyCore, moduleFacts: Record<string, string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [factId, moduleValue] of Object.entries(moduleFacts)) {
      const coreFact = core.facts[factId];
      if (coreFact) {
        if (coreFact.value !== moduleValue) {
          errors.push(`Fact mismatch for ${factId}: module uses different value than CompanyCore`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
