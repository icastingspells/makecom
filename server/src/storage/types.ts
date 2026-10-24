import { CompanyCore, CoreSnapshot } from '../core/types.js';

export interface SiteVersion {
  id: string;
  coreId: string;
  lang: 'ru' | 'de';
  style: string;
  storagePath: string;
  createdAt: string;
}

export interface CompanyModuleResult {
  id: string;
  coreId: string;
  moduleKey: string;
  payload: Record<string, unknown>;
  snapshotHash: string;
  createdAt: string;
}

/**
 * Единый интерфейс хранилища
 * Позволяет переключаться между file и supabase без изменения бизнес-логики
 */
export interface IStorage {
  // CompanyCore
  saveCore(core: CompanyCore): Promise<CompanyCore>;
  getCore(id: string): Promise<CompanyCore | null>;
  listCores(): Promise<CompanyCore[]>;

  // Site versions
  saveSiteVersion(version: SiteVersion): Promise<SiteVersion>;
  getSiteVersions(coreId: string): Promise<SiteVersion[]>;

  // Modules (for future 8 directions)
  saveModuleResult(result: CompanyModuleResult): Promise<CompanyModuleResult>;
  getModuleResults(coreId: string): Promise<CompanyModuleResult[]>;
}
