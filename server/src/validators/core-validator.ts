import { CompanyCore } from '../core/types.js';
import { CompanyCoreSchema } from './core-schema.js';

/**
 * Базовая валидация CompanyCore
 * Проверяет структуру и обязательные поля
 */
export class CoreValidator {
  /**
   * Валидация целого объекта CompanyCore
   */
  validate(core: unknown): { valid: boolean; errors: string[] } {
    const result = CompanyCoreSchema.safeParse(core);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    // Zod v4: use `issues` (v3 `errors` is deprecated)
    const errors = result.error.issues.map(err => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    });

    return { valid: false, errors };
  }

  /**
   * Быстрая проверка наличия обязательных core-полей
   */
  hasRequiredCoreFields(core: CompanyCore): boolean {
    if (!core.identity?.brandName || !core.identity?.legalEntityName) return false;
    if (!core.contacts?.address || !core.contacts?.phone || !core.contacts?.email) return false;
    if (!core.people?.ceo || !core.people?.heads || core.people.heads.length !== 2) return false;
    if (!core.business?.history || !core.business?.specialization) return false;
    if (!core.product?.inputs || !core.product?.process) return false;
    if (!core.faq || core.faq.length !== 5) return false;
    return true;
  }
}
