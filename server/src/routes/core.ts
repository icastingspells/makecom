import { Router } from 'express';
import { CompanyCoreService } from '../core/company-core.js';
import { CoreValidator } from '../validators/core-validator.js';
import { createStorage } from '../storage/index.js';
import { randomUUID } from 'crypto';
import { buildCompanyPrompt } from '../generators/company-prompt.js';
import { openRouterService } from '../services/openrouter.js';
import { CompanyCore } from '../core/types.js';

const router = Router();
const coreService = new CompanyCoreService();
const validator = new CoreValidator();
const storage = createStorage();

router.post('/create', async (req, res) => {
  try {
    const inputs = req.body || { country: 'DE', scale: 'small' };

    // Реальная генерация через OpenRouter (или мок в зависимости от настроек)
    const prompt = buildCompanyPrompt(inputs);
    const model = inputs.model || 'google/gemini-2.5-flash-preview';

    const result = await openRouterService.generate({
      model,
      messages: [
        { role: 'system', content: 'You return only valid JSON with no extra text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 2000
    });

    let parsed: any;
    try {
      // Удаляем возможные markdown code blocks
      let content = result.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
      }
      parsed = JSON.parse(content);
    } catch (e: any) {
      return res.status(502).json({ error: 'Failed to parse LLM response as JSON', details: result.content.slice(0, 200) });
    }

    // Если мок-режим вернул _mock - создаём валидный тестовый core для отладки
    if (parsed._mock) {
      const person = { name: 'Mock Person', title: 'CEO', bio: 'Mock bio for testing' };
      parsed = {
        identity: { brandName: 'MockBrand', legalEntityName: 'MockBrand GmbH' },
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

    const check = validator.validate(core);
    if (!check.valid) {
      return res.status(400).json({ error: 'Core validation failed', errors: check.errors, raw: parsed });
    }

    coreService.createCore(core);
    const snapshot = coreService.createSnapshot();
    await storage.saveCore(core);

    res.json({ core, snapshotHash: snapshot?.hash, costUsd: result.costUsd });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

export default router;
