import { Fact, CoreFacts } from './types.js';

/**
 * Fact Registry
 * Хранит атомарные факты для кросс-модульной валидации
 * Модули должны проверять совпадение фактов, а не придумывать свои
 */
export class FactRegistry {
  private facts: CoreFacts = {};

  constructor(initialFacts: CoreFacts = {}) {
    this.facts = { ...initialFacts };
  }

  /**
   * Добавить факт в реестр
   */
  addFact(factId: string, fact: Fact): void {
    this.facts[factId] = fact;
  }

  /**
   * Получить факт по id
   */
  getFact(factId: string): Fact | undefined {
    return this.facts[factId];
  }

  /**
   * Получить все факты
   */
  getAllFacts(): CoreFacts {
    return { ...this.facts };
  }

  /**
   * Проверить наличие факта
   */
  hasFact(factId: string): boolean {
    return factId in this.facts;
  }

  /**
   * Сбросить реестр
   */
  reset(): void {
    this.facts = {};
  }
}
