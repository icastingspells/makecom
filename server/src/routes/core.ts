import { Router } from 'express';
import { CompanyCoreService } from '../core/company-core.js';
import { CoreValidator } from '../validators/core-validator.js';
import { createStorage } from '../storage/index.js';
import { randomUUID } from 'crypto';

const router = Router();
const coreService = new CompanyCoreService();
const validator = new CoreValidator();
const storage = createStorage();

router.post('/create', async (req, res) => {
  try {
    // В мок-режиме пока создаём минимальный валидный core для теста
    const person = { name: 'Test Person', title: 'CEO', bio: 'Test bio' };
    const core: any = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputs: req.body || { country: 'DE', scale: 'small' },
      identity: { brandName: 'TestBrand', legalEntityName: 'TestBrand GmbH' },
      contacts: {
        city: 'Berlin',
        address: 'Teststr. 1, 10117 Berlin',
        phone: '+49 30 1111111',
        email: 'info@testbrand.de'
      },
      people: { ceo: person, heads: [person, person] },
      business: {
        history: 'Founded in 2020',
        specialization: 'AI services',
        targetAudience: 'SMB',
        clientProblem: 'Automation needs'
      },
      product: {
        inputs: 'Data',
        process: 'AI',
        result: 'Insights',
        limits: 'Not legal advice'
      },
      faq: [
        { q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }, { q: 'Q3', a: 'A3' },
        { q: 'Q4', a: 'A4' }, { q: 'Q5', a: 'A5' }
      ],
      facts: {
        legalEntityName: { key: 'legalEntityName', value: 'TestBrand GmbH', source: 'core' },
        contactPhone: { key: 'contactPhone', value: '+49 30 1111111', source: 'core' }
      },
      extensions: {},
      meta: { version: 1 }
    };

    const check = validator.validate(core);
    if (!check.valid) {
      return res.status(400).json({ error: 'Core validation failed', errors: check.errors });
    }

    coreService.createCore(core);
    const snapshot = coreService.createSnapshot();
    await storage.saveCore(core);

    res.json({ core, snapshotHash: snapshot?.hash });
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
