import { logEvent } from '../logging.js';
import { beginOperation } from './operations.js';
import { Router } from 'express';
import { CompanyCoreService } from '../core/company-core.js';
import { CoreValidator } from '../validators/core-validator.js';
import { createStorage } from '../storage/index.js';
import { randomUUID } from 'crypto';
import { buildCompanyPrompt } from '../generators/company-prompt.js';
import { companyCatalog } from '../generators/company-catalog.js';
import { companyResponseFormat } from '../generators/company-contract.js';
import { CompanyCoreSchema } from '../validators/core-schema.js';
import { approveCore, exportCore } from '../core/card-actions.js';
import { openRouterService } from '../services/openrouter.js';
import { CompanyCore } from '../core/types.js';
import { buildCoreFacts, CardEditError, editCore } from '../core/edit-core.js';
import { requireOpenRouterSession, MissingSessionError } from './session.js';
import { z } from 'zod';

const router = Router();
const coreService = new CompanyCoreService();
const validator = new CoreValidator();
const storage = createStorage();
const pendingEdits = new Set<string>();
const profileSchema = CompanyCoreSchema.pick({ identity: true, contacts: true, people: true, business: true, product: true, faq: true });
const inputsSchema = z.object({
  country: z.literal('DE').default('DE'), scale: z.enum(['small', 'medium']).default('small'),
  brandName: z.string().trim().min(1).max(200).optional(),
  businessDirection: z.string().trim().max(1000).optional(), b2bServiceType: z.string().trim().max(1000).optional(),
  model: z.string().trim().min(1).max(200).default('google/gemini-2.5-flash')
}).strict();

router.post('/create', async (req, res) => {
  let tracking: Awaited<ReturnType<typeof beginOperation>> | undefined;
  let resultId: string | undefined;
  try {
    const apiKey = requireOpenRouterSession(req);
    const parsedInputs = inputsSchema.safeParse(req.body || {});
    if (!parsedInputs.success) return res.status(400).json({ error: 'Проверьте параметры компании. Неизвестные поля не сохраняются.' });
    const inputs = parsedInputs.data;
    tracking = await beginOperation(req, 'company', inputs.model);

    // Реальная генерация через OpenRouter (или мок в зависимости от настроек)
    const prompt = buildCompanyPrompt(inputs, await storage.listCores());
    const model = inputs.model || 'google/gemini-2.5-flash-preview';

    const result = await openRouterService.generate({
      model,
      messages: [
        { role: 'system', content: 'You return only valid JSON with no extra text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      provider: { require_parameters: true },
      response_format: companyResponseFormat(inputs),
      max_tokens: 4000
    }, apiKey, tracking.context);
    await tracking.context.update({ stage: 'validation' });

    let parsed: any;
    try {
      // Удаляем возможные markdown code blocks
      let content = result.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
      }
      parsed = JSON.parse(content);
    } catch (e: any) {
      await tracking.finish(false); tracking = undefined;
      return res.status(502).json({ error: 'Failed to parse LLM response as JSON' });
    }

    // Если мок-режим вернул _mock - создаём валидный тестовый core для отладки
    if (parsed._mock) {
      const person = { name: 'Mock Person', title: 'CEO', bio: 'Mock bio for testing' };
      parsed = {
        identity: { brandName: inputs.brandName || 'MockBrand', legalEntityName: (inputs.brandName || 'MockBrand') + ' GmbH' },
        contacts: { city: 'Berlin', address: 'Musterstr. 1, 10117 Berlin', phone: '+49 30 9999999', email: 'info@mockbrand.de' },
        people: { ceo: person, heads: [person, person] },
        business: { history: 'Founded in 2021', specialization: 'AI investment research', targetAudience: 'Asset managers', clientProblem: 'Research bottlenecks' },
        product: { inputs: 'Market data', process: 'AI pipeline', result: 'Actionable reports', limits: 'Not investment advice' },
        faq: [
          { q: 'Who is it for?', a: 'Investment teams' },
          { q: 'What data?', a: 'Public and licensed' },
          { q: 'Is it advice?', a: 'No, research tool' },
          { q: 'Languages?', a: 'EN/DE planned' },
          { q: 'Integration?', a: 'API available later' }
        ]
      };
    }

    const profile = profileSchema.safeParse(parsed);
    if (!profile.success) {
      await tracking.finish(false); tracking = undefined;
      return res.status(502).json({ error: 'Ответ модели не соответствует формату карточки компании.' });
    }
    parsed = profile.data;

    const core: CompanyCore = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputs,
      identity: parsed.identity,
      contacts: parsed.contacts,
      people: parsed.people,
      business: parsed.business,
      product: parsed.product,
      faq: parsed.faq,
      facts: {
        legalEntityName: { key: 'legalEntityName', value: parsed.identity.legalEntityName, source: 'core' },
        contactPhone: { key: 'contactPhone', value: parsed.contacts.phone, source: 'core' },
        contactEmail: { key: 'contactEmail', value: parsed.contacts.email, source: 'core' },
        brandName: { key: 'brandName', value: parsed.identity.brandName, source: 'core' }
      },
      extensions: {},
      meta: { version: 1 }
    };

    core.facts = buildCoreFacts(core);
    const check = validator.validate(core);
    if (!check.valid) {
      await tracking.finish(false); tracking = undefined;
      return res.status(400).json({ error: 'Core validation failed', errors: check.errors, raw: parsed });
    }

    coreService.createCore(core);
    const snapshot = coreService.createSnapshot();
    await tracking.context.update({ stage: 'saving' });
    await storage.saveCore(core);
    resultId = core.id;
    await tracking.finish(true, resultId);
    tracking = undefined;

    res.json({ core, snapshotHash: snapshot?.hash, costUsd: result.costUsd });
  } catch (err: any) {
    if (tracking) { await tracking.finish(false, resultId).catch(() => logEvent('generation.journal_failed', {}, 'error')); tracking = undefined; }
    if (err instanceof MissingSessionError) return res.status(401).json({ error: err.message });
    res.status(500).json({ error: err.message });
  } finally {
    if (tracking) await tracking.finish(false, resultId).catch(() => logEvent('generation.journal_failed', {}, 'error'));
  }
});

router.get('/list', async (_req, res) => {
  try {
    const cores = await storage.listCores();
    res.json({ cores });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalogs', (_req, res) => res.json({ catalog: companyCatalog }));

router.get('/:id/export', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid card ID' });
  try {
    const core = await storage.getCore(req.params.id);
    if (!core) return res.status(404).json({ error: 'Card not found' });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="company-${core.id}.json"`);
    res.type('application/json').send(JSON.stringify(exportCore(core), null, 2));
  } catch { res.status(500).json({ error: 'Не удалось экспортировать карточку' }); }
});

router.post('/:id/approve', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid card ID' });
  if (pendingEdits.has(req.params.id)) return res.status(409).json({ error: 'Карточка сохраняется. Повторите попытку.' });
  pendingEdits.add(req.params.id);
  try {
    const previous = await storage.getCore(req.params.id);
    if (!previous) return res.status(404).json({ error: 'Card not found' });
    const core = approveCore(previous, req.body);
    await storage.saveCore(core);
    res.json({ core });
  } catch (error) {
    if (error instanceof CardEditError) return res.status(error.status).json({ error: error.message, errors: error.errors });
    res.status(500).json({ error: 'Не удалось утвердить карточку' });
  } finally { pendingEdits.delete(req.params.id); }
});

router.get('/:id', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid card ID' });
  try {
    const core = await storage.getCore(req.params.id);
    if (!core) return res.status(404).json({ error: 'Card not found' });
    res.json({ core });
  } catch {
    res.status(500).json({ error: 'Failed to load card' });
  }
});

router.put('/:id', async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ error: 'Invalid card ID' });
  if (pendingEdits.has(req.params.id)) return res.status(409).json({ error: 'Карточка сохраняется. Повторите попытку.' });
  pendingEdits.add(req.params.id);
  try {
    const previous = await storage.getCore(req.params.id);
    if (!previous) return res.status(404).json({ error: 'Card not found' });
    const core = editCore(previous, req.body);
    await storage.saveCore(core);
    res.json({ core });
  } catch (err) {
    if (err instanceof CardEditError) return res.status(err.status).json({ error: err.message, errors: err.errors });
    res.status(500).json({ error: 'Failed to save card' });
  } finally {
    pendingEdits.delete(req.params.id);
  }
});

export default router;
