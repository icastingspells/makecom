import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { OperationJournal } from '../operations.js';
import { FileAdapter } from '../../storage/file-adapter.js';

describe('persistent metadata-only operation history', () => {
  it('persists failure charges, prevents duplicate IDs and identifies interrupted work after restart', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-operations-'));
    try {
      const journal = new OperationJournal(new FileAdapter(directory));
      const tracking = await journal.start('site', 'test/model', undefined, 0.1, false);
      await tracking.context.update({ stage: 'validation', attempts: [{ number: 1, status: 'reported', costUsd: 0.004 }] });
      expect((await journal.get(tracking.operation.id))?.status).toBe('running');
      await expect(journal.start('site', 'test/model', tracking.operation.id, 0.1, false)).rejects.toThrow('already used');
      expect((await journal.get(tracking.operation.id))?.status).toBe('running');
      await tracking.finish(false);
      const reloaded = new OperationJournal(new FileAdapter(directory));
      expect(await reloaded.get(tracking.operation.id)).toMatchObject({ status: 'failed', stage: 'validation', attempts: [{ costUsd: 0.004 }] });
      await expect(reloaded.start('site', 'test/model', tracking.operation.id, 0.1, false)).rejects.toThrow('already used');
      const pending = await journal.start('company', 'test/model', undefined, 0.1, false);
      await pending.context.update({ stage: 'request', attempts: [{ number: 1, status: 'requesting' }] });
      expect((await reloaded.get(pending.operation.id))?.status).toBe('interrupted');
      expect((await reloaded.list())).toHaveLength(2);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
