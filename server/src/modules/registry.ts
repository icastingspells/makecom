import { IModule } from './types.js';

/**
 * Реестр модулей
 * Позволяет регистрировать модули под будущие 8 направлений
 * пока без реализации самих модулей - только инфраструктура
 */
export class ModuleRegistry {
  private modules = new Map<string, IModule>();

  register(module: IModule): void {
    this.modules.set(module.key, module);
  }

  get(key: string): IModule | undefined {
    return this.modules.get(key);
  }

  list(): IModule[] {
    return Array.from(this.modules.values());
  }

  has(key: string): boolean {
    return this.modules.has(key);
  }
}

export const moduleRegistry = new ModuleRegistry();
