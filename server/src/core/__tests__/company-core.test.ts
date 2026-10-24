import { describe, it, expect } from 'vitest';
import { CompanyCoreService } from '../company-core.js';
import { FactRegistry } from '../fact-registry.js';
import { CompanyCore } from '../types.js';

/**
 * Тестовые данные, максимально близкие к реальной карточке
 */
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
    people: {
      ceo: person,
      heads: [person, person]
    },
    business: {
      history: 'Founded in 2019',
      specialization: 'AI investment research',
      targetAudience: 'Asset managers',
      clientProblem: 'Slow research workflows'
    },
    product: {
      inputs: 'Market data',
      process: 'AI analysis',
      result: 'Reports',
      limits: 'Not investment advice'
    },
    faq: [
      { q: 'Q1', a: 'A1' },
      { q: 'Q2', a: 'A2' },
      { q: 'Q3', a: 'A3' },
      { q: 'Q4', a: 'A4' },
      { q: 'Q5', a: 'A5' }
    ],
    facts: {
      legalEntityName: { key: 'legalEntityName', value: 'Alpha Research GmbH', source: 'core' }
    },
    extensions: {},
    meta: { version: 1 }
  };
}

describe('CompanyCoreService', () => {
  it('returns a defensive copy, so external mutation does not change core', () => {
    const service = new CompanyCoreService();
    service.createCore(buildTestCore());

    const copy = service.getCore();
    expect(copy).not.toBeNull();
    copy!.identity.brandName = 'Hacked';

    expect(service.getCore()!.identity.brandName).toBe('Alpha Research');
  });

  it('creates a snapshot with stable hash and validates it', () => {
    const service = new CompanyCoreService();
    service.createCore(buildTestCore());

    const snapshot = service.createSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.hash).toHaveLength(64);
    expect(service.isSnapshotValid(snapshot!)).toBe(true);
  });

  it('exposes facts through registry', () => {
    const service = new CompanyCoreService();
    service.createCore(buildTestCore());
    expect(service.getFact('legalEntityName')?.value).toBe('Alpha Research GmbH');
    expect(service.getFact('unknown')).toBeUndefined();
  });
});

describe('FactRegistry', () => {
  it('adds, reads and resets facts', () => {
    const registry = new FactRegistry();
    registry.addFact('contactPhone', { key: 'contactPhone', value: '+49', source: 'core' });
    expect(registry.hasFact('contactPhone')).toBe(true);
    expect(registry.getFact('contactPhone')?.value).toBe('+49');

    registry.reset();
    expect(registry.hasFact('contactPhone')).toBe(false);
  });

  it('does not leak internal state via getAllFacts', () => {
    const registry = new FactRegistry();
    registry.addFact('a', { key: 'a', value: '1', source: 'core' });
    const all = registry.getAllFacts();
    delete all.a;
    expect(registry.hasFact('a')).toBe(true);
  });
});
