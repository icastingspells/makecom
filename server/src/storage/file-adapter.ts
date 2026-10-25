import type { GenerationOperation } from '../services/operations.js';
import type { IStorage, SiteVersion, CompanyModuleResult } from './types.js';
import type { CompanyCore } from '../core/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Legacy/local JSON storage. All reads are strict and all writes publish complete files. */
export class FileAdapter implements IStorage {
  constructor(private readonly dataDir: string = './data') {}

  private filename(collection: string, id: string): string {
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid record ID');
    return path.join(this.dataDir, collection, id + '.json');
  }

  private async write(collection: string, item: { id: string }, immutable = false): Promise<void> {
    const target = this.filename(collection, item.id);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const temporary = target + '.' + randomUUID() + '.tmp';
    try {
      await fs.writeFile(temporary, JSON.stringify(item, null, 2), 'utf8');
      if (immutable) await fs.link(temporary, target);
      else await fs.rename(temporary, target);
    } finally { await fs.unlink(temporary).catch(() => {}); }
  }

  private async read<T>(collection: string, id: string): Promise<T | null> {
    try { return JSON.parse(await fs.readFile(this.filename(collection, id), 'utf8')) as T; }
    catch (error: any) { if (error.code === 'ENOENT') return null; throw error; }
  }

  private async list<T>(collection: string): Promise<T[]> {
    let names: string[];
    try { names = await fs.readdir(path.join(this.dataDir, collection)); }
    catch (error: any) { if (error.code === 'ENOENT') return []; throw error; }
    const result = await Promise.all(names.filter(name => name.endsWith('.json')).map(name => this.read<T>(collection, name.slice(0, -5))));
    return result.filter(item => item !== null) as T[];
  }

  async saveCore(core: CompanyCore): Promise<CompanyCore> { await this.write('companies', core); return core; }
  async getCore(id: string): Promise<CompanyCore | null> { return this.read('companies', id); }
  async listCores(): Promise<CompanyCore[]> {
    return (await this.list<CompanyCore>('companies')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveSiteVersion(version: SiteVersion): Promise<SiteVersion> { await this.write('site-versions', version, true); return version; }
  async getSiteVersions(coreId: string): Promise<SiteVersion[]> {
    return (await this.list<SiteVersion>('site-versions')).filter(item => item.coreId === coreId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async saveModuleResult(result: CompanyModuleResult): Promise<CompanyModuleResult> { await this.write('modules', result, true); return result; }
  async getModuleResults(coreId: string): Promise<CompanyModuleResult[]> {
    return (await this.list<CompanyModuleResult>('modules')).filter(item => item.coreId === coreId);
  }

  async saveOperation(operation: GenerationOperation): Promise<void> { await this.write('operations', operation); }
  async getOperation(id: string): Promise<GenerationOperation | null> { return this.read('operations', id); }
  async listOperations(): Promise<GenerationOperation[]> {
    return (await this.list<GenerationOperation>('operations')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
