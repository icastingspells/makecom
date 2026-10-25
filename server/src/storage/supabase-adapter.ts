import type { GenerationOperation } from '../services/operations.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorage, SiteVersion, CompanyModuleResult } from './types.js';
import { CompanyCore } from '../core/types.js';
import { CompanyCoreSchema } from '../validators/core-schema.js';

export class SupabaseAdapter implements IStorage {
  private client: SupabaseClient;
  private bucket: string;

  constructor(client?: SupabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!client && (!url || !key)) throw new Error('Supabase URL and service-role key are required');
    this.client = client ?? createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
    this.bucket = process.env.SUPABASE_BUCKET || 'sites';
  }

  async saveOperation(operation: GenerationOperation): Promise<void> {
    const { error } = await this.client.from('generation_operations').upsert({ id: operation.id, operation, created_at: operation.createdAt });
    if (error) throw new Error('Supabase: failed to save operation');
  }
  async getOperation(id: string): Promise<GenerationOperation | null> {
    const { data, error } = await this.client.from('generation_operations').select('operation').eq('id', id).maybeSingle();
    if (error) throw new Error('Supabase: failed to load operation');
    return data?.operation ?? null;
  }
  async listOperations(): Promise<GenerationOperation[]> {
    const { data, error } = await this.client.from('generation_operations').select('operation').order('created_at', { ascending: false });
    if (error) throw new Error('Supabase: failed to list operations');
    return (data || []).map(row => row.operation as GenerationOperation);
  }

  async saveCore(core: CompanyCore): Promise<CompanyCore> {
    const validated = CompanyCoreSchema.parse(core);
    const { error } = await this.client.from('companies_core').upsert({ id: core.id, core: validated, updated_at: core.updatedAt }, { onConflict: 'id' });
    if (error) throw new Error('Supabase: failed to save company');
    return core;
  }

  async getCore(id: string): Promise<CompanyCore | null> {
    const { data, error } = await this.client.from('companies_core').select('core').eq('id', id).maybeSingle();
    if (error) throw new Error('Supabase: failed to load company');
    return data ? CompanyCoreSchema.parse(data.core) as CompanyCore : null;
  }

  async listCores(): Promise<CompanyCore[]> {
    const { data, error } = await this.client.from('companies_core').select('core').order('updated_at', { ascending: false });
    if (error) throw new Error('Supabase: failed to list companies');
    return (data || []).map(row => CompanyCoreSchema.parse(row.core) as CompanyCore);
  }

  async saveSiteVersion(version: SiteVersion): Promise<SiteVersion> {
    const { files, ...metadata } = version;
    const objectPath = version.id + '/files.json';
    if (files) {
      const { error } = await this.client.storage.from(this.bucket).upload(objectPath, JSON.stringify(files), { contentType: 'application/json', upsert: false });
      if (error) throw new Error('Supabase: failed to upload site files');
      metadata.storagePath = objectPath;
    }
    const { error } = await this.client.from('site_versions').insert({ id: version.id, core_id: version.coreId, version: metadata, created_at: version.createdAt });
    if (error) {
      if (files) await this.client.storage.from(this.bucket).remove([objectPath]);
      throw new Error('Supabase: failed to save site version');
    }
    return { ...metadata, files };
  }

  async getSiteVersions(coreId: string): Promise<SiteVersion[]> {
    const { data, error } = await this.client.from('site_versions').select('version').eq('core_id', coreId).order('created_at', { ascending: false });
    if (error) throw new Error('Supabase: failed to list site versions');
    return Promise.all((data || []).map(async row => {
      const version = row.version as SiteVersion;
      if (version.files || !version.storagePath.endsWith('/files.json')) return version;
      const { data: blob, error: downloadError } = await this.client.storage.from(this.bucket).download(version.storagePath);
      if (downloadError || !blob) throw new Error('Supabase: failed to download site files');
      return { ...version, files: JSON.parse(await blob.text()) as Record<string, string> };
    }));
  }

  async saveModuleResult(result: CompanyModuleResult): Promise<CompanyModuleResult> {
    const { error } = await this.client.from('company_modules').insert({ id: result.id, core_id: result.coreId, result });
    if (error) throw new Error('Supabase: failed to save module');
    return result;
  }

  async getModuleResults(coreId: string): Promise<CompanyModuleResult[]> {
    const { data, error } = await this.client.from('company_modules').select('result').eq('core_id', coreId);
    if (error) throw new Error('Supabase: failed to load modules');
    return (data || []).map(row => row.result as CompanyModuleResult);
  }
}
