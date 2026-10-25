import fs from 'node:fs/promises';
import path from 'node:path';
import type { CompanyCore } from '../core/types.js';
import { CompanyCoreSchema } from '../validators/core-schema.js';
import type { SiteVersion, CompanyModuleResult } from './types.js';
import type { GenerationOperation } from '../services/operations.js';

async function readCollection<T>(directory: string, valid: (value: any) => boolean): Promise<T[]> {
  let names: string[];
  try { names = await fs.readdir(directory); }
  catch (error: any) { if (error.code === 'ENOENT') return []; throw error; }
  const result: T[] = [];
  const ids = new Set<string>();
  for (const name of names.filter(name => name.endsWith('.json')).sort()) {
    let item: any;
    try { item = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8')); }
    catch { throw new Error(`Cannot read JSON: ${path.basename(directory)}/${name}. No data imported.`); }
    if (!item || typeof item !== 'object' || !valid(item) || ids.has(item.id)) throw new Error(`Invalid or duplicate record: ${path.basename(directory)}/${name}. No data imported.`);
    ids.add(item.id); result.push(item);
  }
  return result;
}

/** Strict reads, no writes to source. Validate all files before starting the destination transaction. */
export async function loadFileSnapshot(source: string) {
  const basic = (item: any) => typeof item.id === 'string' && item.id.length > 0 && typeof item.createdAt === 'string';
  // Do not strip unknown legacy fields: this is a lossless storage migration.
  const cores = await readCollection<CompanyCore>(path.join(source, 'companies'), item => CompanyCoreSchema.safeParse(item).success);
  const versions = await readCollection<SiteVersion>(path.join(source, 'site-versions'), item => basic(item) && typeof item.coreId === 'string' && ['ru', 'de'].includes(item.lang));
  const modules = await readCollection<CompanyModuleResult>(path.join(source, 'modules'), item => basic(item) && typeof item.coreId === 'string' && typeof item.moduleKey === 'string');
  const operations = await readCollection<GenerationOperation>(path.join(source, 'operations'), item => basic(item) && typeof item.model === 'string' && Array.isArray(item.attempts));
  if (cores.length + versions.length + modules.length + operations.length === 0) throw new Error('Source contains no records. Check the source directory.');
  return { cores, versions, modules, operations };
}
