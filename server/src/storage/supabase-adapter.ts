import { IStorage, SiteVersion, CompanyModuleResult } from './types.js';
import { CompanyCore } from '../core/types.js';

/**
 * Supabase адаптер (заглушка)
 * Для облачного запуска будет использовать Supabase Postgres + Storage
 * Ключи только на сервере
 */
export class SupabaseAdapter implements IStorage {
  constructor() {
    // TODO: инициализация Supabase клиента с server-side ключами
  }

  async saveCore(_core: CompanyCore): Promise<CompanyCore> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getCore(_id: string): Promise<CompanyCore | null> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async listCores(): Promise<CompanyCore[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async saveSiteVersion(_version: SiteVersion): Promise<SiteVersion> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getSiteVersions(_coreId: string): Promise<SiteVersion[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async saveModuleResult(_result: CompanyModuleResult): Promise<CompanyModuleResult> {
    throw new Error('SupabaseAdapter not implemented yet');
  }

  async getModuleResults(_coreId: string): Promise<CompanyModuleResult[]> {
    throw new Error('SupabaseAdapter not implemented yet');
  }
}
