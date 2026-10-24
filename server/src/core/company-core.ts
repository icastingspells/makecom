import { CompanyCore, CoreSnapshot } from './types.js';
import { FactRegistry } from './fact-registry.js';
import crypto from 'crypto';

/**
 * CompanyCoreService
 * Управление каноническим ядром компании
 * Единый источник правды - модули только читают из него
 */
export class CompanyCoreService {
  private core: CompanyCore | null = null;
  private factRegistry: FactRegistry = new FactRegistry();

  /**
   * Создать новое CompanyCore
   */
  createCore(core: CompanyCore): void {
    this.core = core;
    this.factRegistry = new FactRegistry(core.facts);
  }

  /**
   * Получить текущее CompanyCore (только для чтения через копию)
   */
  getCore(): CompanyCore | null {
    if (!this.core) return null;
    // Возвращаем копию чтобы избежать случайных мутаций извне
    return JSON.parse(JSON.stringify(this.core));
  }

  /**
   * Получить факт-реестр
   */
  getFactRegistry(): FactRegistry {
    return this.factRegistry;
  }

  /**
   * Создать снапшот CompanyCore для модуля
   * Модуль будет работать только с этим снапшотом
   */
  createSnapshot(): CoreSnapshot | null {
    if (!this.core) return null;

    const coreCopy = JSON.parse(JSON.stringify(this.core));
    const hash = crypto.createHash('sha256').update(JSON.stringify(coreCopy)).digest('hex');

    return {
      core: coreCopy,
      hash,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Проверить соответствует ли снапшот текущему core
   */
  isSnapshotValid(snapshot: CoreSnapshot): boolean {
    if (!this.core) return false;
    const currentHash = crypto.createHash('sha256').update(JSON.stringify(this.core)).digest('hex');
    return snapshot.hash === currentHash;
  }

  /**
   * Получить атомарный факт из реестра
   * Используется валидаторами для кросс-модульной проверки
   */
  getFact(factId: string) {
    return this.factRegistry.getFact(factId);
  }
}
