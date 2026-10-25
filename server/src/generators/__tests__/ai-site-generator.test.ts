import { describe, it, expect, vi, afterEach } from 'vitest';
import { compileAiSite, siteTextFields, AiSiteGenerator, SiteOptionsSchema } from '../ai-site-generator.js';
import { CompanyCoreService } from '../../core/company-core.js';
import { CompanyCore } from '../../core/types.js';
import { openRouterService } from '../../services/openrouter.js';
import express from 'express';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import { FileAdapter } from '../../storage/file-adapter.js';
import { sealSessionToken } from '../../routes/session.js';
import { approveCore } from '../../core/card-actions.js';
import { editCore } from '../../core/edit-core.js';

vi.mock('../../config/env.js', () => ({ getEnv: () => ({ MOCK_LLM: 'false', OPENROUTER_SPEND_LIMIT_PER_OP_USD: '0.10' }) }));

function snapshot() {
  const person = { name: 'Anna & Weber', title: 'CEO', bio: 'Founded in 2020' };
  const core: CompanyCore = {
    id: '11111111-1111-4111-8111-111111111111', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    inputs: { country: 'DE', scale: 'small' }, identity: { brandName: 'Alpha <Research>', legalEntityName: 'Alpha GmbH' },
    contacts: { city: 'Berlin', address: 'Berlin 1', phone: '+49 30 24791356', email: 'info@alpha.de' },
    people: { ceo: person, heads: [person, person] },
    business: { history: 'Founded in 2020', specialization: 'Research', targetAudience: 'Analysts', clientProblem: 'Slow research' },
    product: { inputs: 'Data', process: 'Analysis', result: 'Reports', limits: 'Not advice' },
    faq: [{ q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }],
    facts: {}, extensions: {}, meta: { version: 1 }
  };
  const service = new CompanyCoreService(); service.createCore(core); return service.createSnapshot()!;
}
const options = { coreId: '11111111-1111-4111-8111-111111111111', lang: 'de' as const, model: 'test/model', style: 'Restrained' };
function response() {
  const translations = siteTextFields(snapshot());
  const tokens = ['identity.brandName', 'identity.legalEntityName', 'contacts.city', 'contacts.address', 'contacts.phone', 'contacts.email', 'people.ceo.name', 'people.heads.0.name', 'people.heads.1.name', ...Object.keys(translations)];
  const body = '<nav><a href="index.html">{{label.home}}</a><a href="product.html">{{label.product}}</a><a href="company.html">{{label.company}}</a></nav><main>' + tokens.map(t => `<p>{{${t}}}</p>`).join('') + '</main>';
  return { translations, pages: { 'index.html': body, 'product.html': body, 'company.html': body }, css: 'body { color:#222; margin:0; } @media(max-width:600px){main{padding:16px}}' };
}
afterEach(() => vi.restoreAllMocks());

describe('AI site generation (FR-003/005/006/007, NFR-004)', () => {
  it('uses the cookie credential at the API boundary, saves valid versions and never saves invalid output', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'makecom-site-api-'));
    const oldDir = process.env.DATA_DIR, oldDriver = process.env.STORAGE_DRIVER;
    process.env.DATA_DIR = directory; process.env.STORAGE_DRIVER = 'file';
    const store = new FileAdapter(directory), source = snapshot();
    await store.saveCore(source.core);
    const { default: router } = await import('../../routes/site.js');
    const app = express(); app.use(express.json()); app.use('/api/site', router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/site/generate`;
    const token = 'test-api-session-key';
    const cookie = `makecom_openrouter=${sealSessionToken(token)}`;
    const post = (session = true) => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: cookie } : {}) }, body: JSON.stringify(options) });
    const call = vi.spyOn(openRouterService, 'generate').mockResolvedValue({ content: JSON.stringify(response()), costUsd: 0.001 });
    try {
      expect((await post(false)).status).toBe(401); expect(call).not.toHaveBeenCalled();
      expect((await post()).status).toBe(409); expect(call).not.toHaveBeenCalled();
      await store.saveCore(approveCore(source.core, { expectedVersion: source.core.meta.version, consistencyReviewed: true }));
      const result = await post(); expect(result.status).toBe(200);
      expect((await result.json()).version.generation.kind).toBe('ai');
      expect(call.mock.calls[0][1]).toBe(token);
      expect(await store.getSiteVersions(source.core.id)).toHaveLength(1);
      expect((await store.getCore(source.core.id))!.identity).toEqual(source.core.identity);
      call.mockResolvedValueOnce({ content: 'invalid JSON', costUsd: 0.001 });
      expect((await post()).status).toBe(502);
      expect(await store.getSiteVersions(source.core.id)).toHaveLength(1);
      const approved = (await store.getCore(source.core.id))!;
      await store.saveCore(editCore(approved, { identity: approved.identity, contacts: approved.contacts, people: approved.people, business: approved.business, product: approved.product, faq: approved.faq, expectedVersion: approved.meta.version, consistencyReviewed: true }));
      expect((await post()).status).toBe(409);
      expect(call).toHaveBeenCalledTimes(2);
      expect(await store.getSiteVersions(source.core.id)).toHaveLength(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
      if (oldDir === undefined) delete process.env.DATA_DIR; else process.env.DATA_DIR = oldDir;
      if (oldDriver === undefined) delete process.env.STORAGE_DRIVER; else process.env.STORAGE_DRIVER = oldDriver;
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('calls the selected model and preserves source snapshot, translated text and exact pinned facts', async () => {
    const payload = response(); payload.translations['product.result'] = 'Berichte';
    const call = vi.spyOn(openRouterService, 'generate').mockResolvedValue({ content: JSON.stringify(payload), costUsd: 0.004 });
    const source = snapshot(), frozen = structuredClone(source);
    const result = await new AiSiteGenerator().generate(source, options, 'test-session-key');
    expect(call).toHaveBeenCalledOnce(); expect(call.mock.calls[0][0].model).toBe(options.model);
    const instruction = call.mock.calls[0][0].messages.map(message => message.content).join('\n');
    expect(instruction).toContain('benefits section');
    expect(instruction).toContain('exactly one h1');
    expect(instruction).toContain('360px');
    expect(instruction).toContain('preserving meaning, limitations, numbers and names');
    expect(instruction).toContain('SOURCE FIDELITY OVERRIDES COMPLETENESS');
    expect(instruction).toContain('copy that exact value verbatim');
    expect(instruction).toContain('Keep each FAQ question paired with its own supplied answer');
    expect(result.version.generation?.kind).toBe('ai'); expect(result.version.generation?.costUsd).toBe(0.004);
    expect(result.version.snapshot).toEqual(frozen); expect(source).toEqual(frozen);
    expect(result.files['product.html']).toContain('Berichte');
    expect(result.files['company.html']).toContain('Alpha GmbH');
    expect(result.files['company.html']).toContain('Anna &amp; Weber');
    expect(result.files['index.html']).toContain('Alpha &lt;Research&gt;');
    expect(result.files['favicon.svg']).toContain('<svg');
  });
  it('does not silently substitute a fixed template when AI fails', async () => {
    vi.spyOn(openRouterService, 'generate').mockRejectedValue(new Error('Provider unavailable'));
    await expect(new AiSiteGenerator().generate(snapshot(), options, 'test-session-key')).rejects.toThrow('Provider unavailable');
  });
  it('sends placeholder FAQ text unchanged with a no-completion instruction in one generation request', async () => {
    const source = snapshot(); source.core.faq[4].a = 'blah blah';
    const before = structuredClone(source);
    const payload = response(); payload.translations['faq.4.a'] = 'blah blah';
    const call = vi.spyOn(openRouterService, 'generate').mockResolvedValue({ content: JSON.stringify(payload), costUsd: 0.001 });
    const result = await new AiSiteGenerator().generate(source, options, 'test-session-key');
    expect(call).toHaveBeenCalledOnce();
    expect(call.mock.calls[0][0].messages[1].content).toContain('"faq.4.a":"blah blah"');
    expect(call.mock.calls[0][0].messages[1].content).toContain('Never repair, improve, complete or reconstruct');
    expect(result.files['product.html']).toContain('blah blah');
    expect(source).toEqual(before);
  });
  it('rejects malformed response contracts without assessing translated numeric facts', () => {
    expect(() => compileAiSite(snapshot(), options, '{')).toThrow();
    const missing = response(); delete missing.translations['business.history'];
    expect(() => compileAiSite(snapshot(), options, JSON.stringify(missing))).toThrow();
    const number = response(); number.translations['business.history'] = 'Founded in 2024';
    expect(compileAiSite(snapshot(), options, JSON.stringify(number))['company.html']).toContain('Founded in 2024');
    const extra = response(); extra.translations['identity.brandName'] = 'Other';
    expect(() => compileAiSite(snapshot(), options, JSON.stringify(extra))).toThrow();
  });
  it('resolves valid template contracts without a content judge, and rejects unknown template references', () => {
    for (const replace of ['<p>Generated prose</p>', '']) {
      const payload = response(); payload.pages['company.html'] = payload.pages['company.html'].replace('<p>{{contacts.phone}}</p>', replace);
      expect(() => compileAiSite(snapshot(), options, JSON.stringify(payload))).not.toThrow();
    }
    const payload = response(); payload.pages['company.html'] += '<p>{{unknown.fact}}</p>';
    expect(() => compileAiSite(snapshot(), options, JSON.stringify(payload))).toThrow('неизвестные переменные');
  });
  it('removes executable HTML, external links and CSS network requests', () => {
    const payload = response(); payload.pages['index.html'] += '<script>alert(1)</script><img src="https://bad.example/x" onerror="alert(1)"><a href="https://bad.example/">{{label.home}}</a>';
    const files = compileAiSite(snapshot(), options, JSON.stringify(payload));
    expect(files['index.html']).not.toMatch(/<script|onerror|bad\.example/);
    payload.css += 'body{background:url(https://bad.example/x)}';
    expect(compileAiSite(snapshot(), options, JSON.stringify(payload))['style.css']).not.toContain('url(');
  });
  it('keeps CSS decorations/content and removes executable imports', () => {
    const payload = response(); payload.css += 'nav > a {color:#222} main::before {content:"";}';
    expect(compileAiSite(snapshot(), options, JSON.stringify(payload))['style.css']).toContain('nav > a');
    payload.css += 'main::after {content:"100 satisfied customers";}';
    payload.css += '/* no @import allowed */ @import "https://bad.example/x";';
    const css = compileAiSite(snapshot(), options, JSON.stringify(payload))['style.css'];
    expect(css).toContain('satisfied customers'); expect(css).not.toContain('@import');
  });
  it('requires explicit valid generation settings', () => {
    expect(SiteOptionsSchema.safeParse(options).success).toBe(true);
    expect(SiteOptionsSchema.safeParse({ ...options, lang: 'en' }).success).toBe(false);
    expect(SiteOptionsSchema.safeParse({ ...options, model: '' }).success).toBe(false);
  });
});
