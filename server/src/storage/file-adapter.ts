import { IStorage, SiteVersion, CompanyModuleResult } from './types.js';
import { CompanyCore } from '../core/types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Файловый адаптер для локальной разработки
 * Хранит данные в JSON файлах
 */
export class FileAdapter implements IStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // ignore
    }
  }

  async saveCore(core: CompanyCore): Promise<CompanyCore> {
    const dir = path.join(this.dataDir, 'companies');
    await this.ensureDir(dir);
    const filePath = path.join(dir, `${core.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(core, null, 2), 'utf-8');
    return core;
  }

  async getCore(id: string): Promise<CompanyCore | null> {
    try {
      const filePath = path.join(this.dataDir, 'companies', `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as CompanyCore;
    } catch {
      return null;
    }
  }

  async listCores(): Promise<CompanyCore[]> {
    try {
      const dir = path.join(this.dataDir, 'companies');
      await this.ensureDir(dir);
      const files = await fs.readdir(dir);
      const cores: CompanyCore[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          cores.push(JSON.parse(content));
        }
      }
      return cores;
    } catch {
      return [];
    }
  }

  async saveSiteVersion(version: SiteVersion): Promise<SiteVersion> {
    const dir = path.join(this.dataDir, 'site-versions');
    await this.ensureDir(dir);
    const filePath = path.join(dir, `${version.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(version, null, 2), 'utf-8');
    return version;
  }

  async getSiteVersions(coreId: string): Promise<SiteVersion[]> {
    try {
      const dir = path.join(this.dataDir, 'site-versions');
      await this.ensureDir(dir);
      const files = await fs.readdir(dir);
      const versions: SiteVersion[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          const v = JSON.parse(content) as SiteVersion;
          if (v.coreId === coreId) versions.push(v);
        }
      }
      return versions;
    } catch {
      return [];
    }
  }

  async saveModuleResult(result: CompanyModuleResult): Promise<CompanyModuleResult> {
    const dir = path.join(this.dataDir, 'modules');
    await this.ensureDir(dir);
    const filePath = path.join(dir, `${result.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
    return result;
  }

  async getModuleResults(coreId: string): Promise<CompanyModuleResult[]> {
    try {
      const dir = path.join(this.dataDir, 'modules');
      await this.ensureDir(dir);
      const files = await fs.readdir(dir);
      const results: CompanyModuleResult[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          const r = JSON.parse(content) as CompanyModuleResult;
          if (r.coreId === coreId) results.push(r);
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}
