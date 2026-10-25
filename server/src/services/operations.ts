import { randomUUID } from 'crypto';
import { createStorage } from '../storage/index.js';
import type { IStorage } from '../storage/types.js';

export interface GenerationOperation {
  id: string;
  kind: 'company' | 'site';
  model: string;
  status: 'running' | 'succeeded' | 'failed' | 'interrupted';
  stage: 'preflight' | 'request' | 'retry' | 'validation' | 'saving' | 'done';
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  resultId?: string;
  estimatedAttemptUsd?: number;
  limitUsd: number;
  freeOnly: boolean;
  mock: boolean;
  retryAt?: string;
  attempts: Array<{ number: number; status: 'requesting' | 'reported' | 'estimated' | 'unknown' | 'rejected'; costUsd?: number; promptTokens?: number; completionTokens?: number }>;
}

export type GenerationContext = {
  limitUsd: number;
  freeOnly: boolean;
  update(patch: Partial<Pick<GenerationOperation, 'stage' | 'estimatedAttemptUsd' | 'retryAt' | 'attempts' | 'mock'>>): Promise<void>;
};

// Shared personal library; only metadata, never credentials, prompts or provider bodies.
export class OperationJournal {
  private active = new Set<string>();
  constructor(private storage: IStorage = createStorage()) {}

  async start(kind: GenerationOperation['kind'], model: string, requestedId: string | undefined, limitUsd: number, freeOnly: boolean) {
    const id = requestedId || randomUUID();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid operation ID');
    if (this.active.has(id)) throw new Error('Operation ID already used');
    this.active.add(id);
    try {
      if (await this.storage.getOperation(id)) throw new Error('Operation ID already used');
      const now = new Date().toISOString();
      const operation: GenerationOperation = { id, kind, model, status: 'running', stage: 'preflight', createdAt: now, updatedAt: now, limitUsd, freeOnly, mock: false, attempts: [] };
      await this.storage.saveOperation(operation);
      const update = async (patch: Parameters<GenerationContext['update']>[0]) => {
        Object.assign(operation, patch, { updatedAt: new Date().toISOString() });
        await this.storage.saveOperation(operation);
      };
      return {
        operation,
        context: { limitUsd, freeOnly, update } satisfies GenerationContext,
        finish: async (succeeded: boolean, resultId?: string) => {
          operation.status = succeeded ? 'succeeded' : 'failed';
          if (succeeded) operation.stage = 'done';
          operation.finishedAt = new Date().toISOString();
          operation.updatedAt = operation.finishedAt;
          delete operation.retryAt;
          if (resultId) operation.resultId = resultId;
          try { await this.storage.saveOperation(operation); } finally { this.active.delete(id); }
        }
      };
    } catch (error) { this.active.delete(id); throw error; }
  }

  async list() {
    const records = await this.storage.listOperations();
    return records.map(record => this.readStatus(record));
  }
  async get(id: string) {
    const record = await this.storage.getOperation(id);
    return record ? this.readStatus(record) : null;
  }
  private readStatus(record: GenerationOperation): GenerationOperation {
    // A previous process cannot still be generating. Its charge may remain unknown.
    return record.status === 'running' && !this.active.has(record.id) ? { ...record, status: 'interrupted' } : record;
  }
}
export const operationJournal = new OperationJournal();
