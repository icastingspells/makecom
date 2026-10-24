import { describe, it, expect } from 'vitest';
import { CoreValidator } from '../core-validator.js';
import { CrossModuleValidator } from '../cross-module.js';
import { CompanyCore, CoreSnapshot } from '../../core/types.js';

function buildTestCore(): CompanyCore {
  const person = { name: 'Anna Weber', title: 'CEO', bio: '20 years in fintech' };
  return {
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    inputs: { country: 'DE', scale: 'small' },
    identity: { brandName: 'Alpha Research', legalEntityName: 'Alpha Research GmbH' },
    contacts: {
      city: 'Berlin',
      address: 'Unter den Linden 1, 10117 Berlin',
      phone: '+49 30 1234567',
      email: 'info@alpha-research.de'
    },
    people: { ceo: person, heads: [person, person] },
    business: {
      history: 'Founded in 2019',
      specialization: 'AI investment research',
      targetAudience: 'Asset managers',
      clientProblem: 'Slow research workflows'
    },
    product: { inputs: 'Market data', process: 'AI analysis', result: 'Reports', limits: 'Not advice' },
    faq: [
      { q: 'Q1', a: 'A1' }, { q: 'Q2', a: 'A2' }, { q: 'Q3', a: 'A3' },
      { q: 'Q4', a: 'A4' }, { q: 'Q5', a: 'A5' }
    ],
    facts: { legalEntityName: { key: 'legalEntityName', value: 'Alpha Research GmbH', source: 'core' } },
    extensions: {},
    meta: { version: 1 }
  };
}

describe('CoreValidator', () => {
  it('accepts a valid core', () => {
    const result = new CoreValidator().validate(buildTestCore());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects core with invalid email', () => {
    const core = buildTestCore();
    core.contacts.email = 'not-an-email';
    const result = new CoreValidator().validate(core);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('email');
  });

  it('rejects core with wrong number of FAQ items', () => {
    const core = buildTestCore();
    // @ts-expect-error intentionally invalid for the test
    core.faq = core.faq.slice(0, 3);
    const result = new CoreValidator().validate(core);
    expect(result.valid).toBe(false);
  });

  it('detects missing required fields', () => {
    const core = buildTestCore();
    core.identity.legalEntityName = '';
    expect(new CoreValidator().hasRequiredCoreFields(core)).toBe(false);
  });
});

describe('CrossModuleValidator', () => {
  const validator = new CrossModuleValidator();

  it('rejects module payload that regenerates core identity/contacts', () => {
    const core = buildTestCore();
    const snapshot: CoreSnapshot = { core, hash: 'abc', createdAt: '2026-01-01T00:00:00.000Z' };

    const result = validator.validateNoCoreRegeneration(snapshot, {
      identity: { legalEntityName: 'Other GmbH' }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('identity');
  });

  it('allows module payload without core blocks', () => {
    const core = buildTestCore();
    const snapshot: CoreSnapshot = { core, hash: 'abc', createdAt: '2026-01-01T00:00:00.000Z' };

    const result = validator.validateNoCoreRegeneration(snapshot, { policyText: 'Some legal text' });
    expect(result.valid).toBe(true);
  });

  it('detects fact mismatch with CompanyCore', () => {
    const core = buildTestCore();
    const result = validator.validateFactsMatch(core, { legalEntityName: 'Wrong GmbH' });
    expect(result.valid).toBe(false);
  });

  it('accepts matching facts', () => {
    const core = buildTestCore();
    const result = validator.validateFactsMatch(core, { legalEntityName: 'Alpha Research GmbH' });
    expect(result.valid).toBe(true);
  });
});
