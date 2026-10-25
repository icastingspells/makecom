import type { GenerationOperation } from '../services/operations.js';
import { IStorage, SiteVersion, CompanyModuleResult } from './types.js';
import { CompanyCore } from '../core/types.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

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

  async saveOperation(operation: GenerationOperation): Promise<void> {
    const dir = path.join(this.dataDir, 'operations');
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, operation.id + '.json');
    const temporary = target + '.' + randomUUID() + '.tmp';
    try {
      await fs.writeFile(temporary, JSON.stringify(operation), 'utf8');
      await fs.rename(temporary, target);
    } finally { await fs.unlink(temporary).catch(() => {}); }
  }
  async getOperation(id: string): Promise<GenerationOperation | null> {
    try { return JSON.parse(await fs.readFile(path.join(this.dataDir, 'operations', id + '.json'), 'utf8')); }
    catch (error: any) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async listOperations(): Promise<GenerationOperation[]> {
    const dir = path.join(this.dataDir, 'operations');
    await fs.mkdir(dir, { recursive: true });
    const names = (await fs.readdir(dir)).filter(name => name.endsWith('.json'));
    const records = await Promise.all(names.map(name => this.getOperation(name.slice(0, -5))));
    return records.filter((record): record is GenerationOperation => !!record).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveCore(core: CompanyCore): Promise<CompanyCore> {
    const dir = path.join(this.dataDir, 'companies');
    await this.ensureDir(dir);
    const filePath = path.join(dir, `${core.id}.json`);
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, JSON.stringify(core, null, 2), 'utf-8');
      await fs.rename(temporaryPath, filePath);
    } finally {
      await fs.unlink(temporaryPath).catch(() => {});
    }
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
