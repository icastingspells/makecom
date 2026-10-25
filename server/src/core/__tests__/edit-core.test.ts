import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { editCore, CardEditError } from '../edit-core.js';
import { approveCore, isCoreApproved, exportCore } from '../card-actions.js';
import { CompanyCore } from '../types.js';
import { CompanyCoreService } from '../company-core.js';
import { FileAdapter } from '../../storage/file-adapter.js';
import { siteGenerator } from '../../generators/site-generator.js';
import express from 'express';
import { AddressInfo } from 'net';

function fixture(): CompanyCore {
  const person = { name: 'Anna Weber', title: 'CEO', bio: 'Research experience' };
  return {
    id: '11111111-1111-4111-8111-111111111111', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    inputs: { country: 'DE', scale: 'small' }, identity: { brandName: 'Alpha', legalEntityName: 'Alpha GmbH' },
    contacts: { city: 'Berlin', address: 'Berlin 1', phone: '+49 30 24791356', email: 'info@alpha.de' },
    people: { ceo: person, heads: [person, person] },
    business: { history: 'Founded in 2020', specialization: 'Research', targetAudience: 'Analysts', clientProblem: 'Slow research' },
    product: { inputs: 'Data', process: 'Analysis', result: 'Reports', limits: 'Not advice' },
    faq: [{ q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }, { q: 'Q3', a: 'A3' }, { q: 'Q4', a: 'A4' }, { q: 'Q5', a: 'A5' }],
    facts: { stale: { key: 'stale', value: 'Old name', source: 'core' } }, extensions: {}, meta: { version: 1 }
  };
}
function request(core: CompanyCore) {
  const { identity, contacts, people, business, product, faq } = structuredClone(core);
  return { identity, contacts, people, business, product, faq, expectedVersion: core.meta.version, consistencyReviewed: true };
}

describe('manual card editing (FR-002, FR-005, FR-006, FR-008)', () => {
  it('approves only the reviewed saved revision and clears approval on edits', () => {
    const core = fixture();
    expect(isCoreApproved(core)).toBe(false);
    expect(() => approveCore(core, { expectedVersion: 1 })).toThrow('Подтвердите');
    expect(() => approveCore(core, { expectedVersion: 2, consistencyReviewed: true })).toThrow('уже изменена');
    const approved = approveCore(core, { expectedVersion: 1, consistencyReviewed: true });
    expect(isCoreApproved(approved)).toBe(true);
    expect(approved.meta.version).toBe(1);
    expect(approved.meta.approval?.approvedAt).toBeDefined();
    const changed = editCore(approved, request(approved));
    expect(changed.meta.version).toBe(2); expect(changed.meta.approval).toBeUndefined();
    expect(isCoreApproved(changed)).toBe(false);
    const invalid = fixture(); invalid.business.history = '   ';
    expect(() => approveCore(invalid, { expectedVersion: 1, consistencyReviewed: true })).toThrow('Заполните');
  });

  it('exports only the defined company fields with fresh canonical facts and no extension payloads', () => {
    const core = fixture() as CompanyCore & { apiKey?: string };
    core.apiKey = 'private-root-key'; core.extensions = { apiKey: 'private-extension-key' };
    (core.identity as any).apiKey = 'private-nested-key';
    const result = exportCore(core);
    expect(JSON.stringify(result)).not.toMatch(/private-|Old name/);
    expect(result.facts.brandName.value).toBe('Alpha');
    expect(result.identity).toEqual({ brandName: 'Alpha', legalEntityName: 'Alpha GmbH' });
    expect(result.extensions).toEqual({});
    expect(core.apiKey).toBe('private-root-key');
  });
  it('serves the editor API, persists PUT, rejects stale writes and invalid IDs', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-api-'));
    const oldDataDir = process.env.DATA_DIR;
    const oldDriver = process.env.STORAGE_DRIVER;
    process.env.DATA_DIR = directory;
    process.env.STORAGE_DRIVER = 'file';
    const storage = new FileAdapter(directory), core = fixture();
    await storage.saveCore(core);
    const { default: router } = await import('../../routes/core.js');
    const app = express(); app.use(express.json()); app.use('/api/core', router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/core`;
    try {
      const loaded = await fetch(`${url}/${core.id}`);
      expect(loaded.status).toBe(200);
      expect((await loaded.json()).core.identity.brandName).toBe('Alpha');
      const input = request(core); input.identity.brandName = 'Beta';
      const update = () => fetch(`${url}/${core.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      expect((await update()).status).toBe(200);
      expect((await storage.getCore(core.id))!.identity.brandName).toBe('Beta');
      expect((await update()).status).toBe(409);
      const approve = (version: number) => fetch(`${url}/${core.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: version, consistencyReviewed: true }) });
      expect((await approve(1)).status).toBe(409);
      expect((await approve(2)).status).toBe(200);
      const persisted = await storage.getCore(core.id);
      expect(isCoreApproved(persisted!)).toBe(true);
      const exported = await fetch(`${url}/${core.id}/export`);
      expect(exported.status).toBe(200);
      expect(exported.headers.get('content-disposition')).toContain(`company-${core.id}.json`);
      expect(exported.headers.get('cache-control')).toBe('no-store');
      expect((await exported.json()).meta.approval.version).toBe(2);
      const next = request(persisted!); next.business.history = 'Changed history';
      expect((await fetch(`${url}/${core.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })).status).toBe(200);
      expect(isCoreApproved((await storage.getCore(core.id))!)).toBe(false);
      expect((await approve(2)).status).toBe(409);
      expect((await fetch(`${url}/invalid/export`)).status).toBe(400);
      expect((await fetch(`${url}/invalid`)).status).toBe(400);
      const list = await fetch(`${url}/list`);
      expect((await list.json()).cores).toHaveLength(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
      if (oldDataDir === undefined) delete process.env.DATA_DIR; else process.env.DATA_DIR = oldDataDir;
      if (oldDriver === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = oldDriver;
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('updates all derived facts and preserves server-owned metadata without mutating the old card', () => {
    const old = fixture();
    const input = request(old);
    input.identity.brandName = 'Beta'; input.people.ceo.bio = 'Updated bio'; input.faq[0].a = 'Updated answer';
    const next = editCore(old, input);
    expect(next.id).toBe(old.id); expect(next.createdAt).toBe(old.createdAt);
    expect(next.meta.version).toBe(2); expect(old.identity.brandName).toBe('Alpha');
    expect(next.facts.brandName.value).toBe('Beta');
    expect(next.facts['people.ceo.bio'].value).toBe('Updated bio');
    expect(next.facts['faq.0.a'].value).toBe('Updated answer');
    expect(next.facts.stale).toBeUndefined();
  });
  it('rejects stale versions and attempts to overwrite server-owned fields', () => {
    const core = fixture();
    expect(() => editCore(core, { ...request(core), expectedVersion: 2 })).toThrow(CardEditError);
    expect(() => editCore(core, { ...request(core), facts: {} })).toThrow(CardEditError);
  });
  it('rejects blank text, invalid email, placeholder variables and missing FAQ entries', () => {
    for (const invalid of [' ', '{{company}}']) {
      const core = fixture(), input = request(core); input.business.history = invalid;
      expect(() => editCore(core, input)).toThrow(CardEditError);
    }
    const core = fixture(), input = request(core); input.contacts.email = 'invalid';
    expect(() => editCore(core, input)).toThrow(CardEditError);
    expect(() => editCore(core, { ...request(core), faq: [] })).toThrow(CardEditError);
  });
  it('requires review of semantic consistency and a German international phone number', () => {
    const core = fixture(), input = request(core); input.contacts.phone = '+1 202 555 0100';
    expect(() => editCore(core, input)).toThrow(CardEditError);
    expect(() => editCore(core, { ...request(core), consistencyReviewed: false })).toThrow(CardEditError);
  });
  it('persists edits across reloads and preserves old site HTML/snapshot while new generation uses edited facts', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-edit-'));
    try {
      const storage = new FileAdapter(directory), old = fixture(), service = new CompanyCoreService();
      await storage.saveCore(old); service.createCore(old);
      const generated = siteGenerator.generate(service.createSnapshot()!, { lang: 'de', style: 'default' });
      await storage.saveSiteVersion(generated.version);
      const input = request(old); input.identity.brandName = 'Beta';
      await storage.saveCore(editCore(old, input));
      const loaded = (await new FileAdapter(directory).getCore(old.id))!;
      expect(loaded.identity.brandName).toBe('Beta');
      const [version] = await storage.getSiteVersions(old.id);
      expect(version.files).toEqual(generated.files);
      expect(version.snapshot!.core.identity.brandName).toBe('Alpha');
      service.createCore(loaded);
      const newer = siteGenerator.generate(service.createSnapshot()!, { lang: 'de', style: 'default' });
      expect(newer.files['index.html']).toContain('Beta');
      expect(newer.version.snapshot!.hash).not.toBe(version.snapshot!.hash);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
