import { describe, it, expect } from 'vitest';
import { buildCompanyPrompt } from '../company-prompt.js';
import { companyCatalog } from '../company-catalog.js';
import { companyResponseFormat } from '../company-contract.js';
import type { CompanyCore } from '../../core/types.js';

describe('company input contract (FR-001)', () => {
  it('puts structural limits and the exact brand in the outgoing provider contract', () => {
    const format = companyResponseFormat({ country: 'DE', scale: 'small', brandName: 'Exact' });
    const schema = format.json_schema.schema as any;
    expect(schema.properties.identity.properties.brandName.enum).toEqual(['Exact']);
    expect(schema.properties.faq).toMatchObject({ minItems: 5, maxItems: 5 });
    expect(schema.properties.people.properties.heads).toMatchObject({ minItems: 2, maxItems: 2 });
    expect(schema.additionalProperties).toBe(false);
  });

  it('provides bounded recent company content before generation, without operation or secret metadata', () => {
    const previous = Array.from({ length: 11 }, (_, i) => ({
      createdAt: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      inputs: { country: 'DE', scale: 'small' }, identity: { brandName: `Prior-${i}` },
      business: { history: 'origin ' + i, specialization: 'niche ' + i, targetAudience: 'audience', clientProblem: 'problem' },
      people: { ceo: { bio: 'experience' }, heads: [{ bio: 'head one' }, { bio: 'head two' }] },
      product: { inputs: 'data', process: 'research', result: 'report', limits: 'limits' }, faq: [{ q: 'question', a: 'answer' }],
      extensions: { secret: 'never-send-this' }
    } as unknown as CompanyCore));
    const prompt = buildCompanyPrompt({ country: 'DE', scale: 'small' }, previous);
    const context = JSON.parse(prompt.split('Previous profiles to differentiate from (bounded context): ')[1]);
    expect(context).toHaveLength(8);
    expect(context[0].brand).toBe('Prior-10');
    expect(context.at(-1).brand).toBe('Prior-3');
    expect(prompt).not.toContain('never-send-this');
    expect(prompt).toContain('correct city dialing prefix');
    expect(prompt).toContain('BEFORE emitting');
    expect(prompt).toContain('Keep named data sources technically plausible');
    expect(previous[0].identity.brandName).toBe('Prior-0');
  });
  it('quotes exact user parameters and explicitly preserves the requested brand', () => {
    const brandName = 'Brand "Exact"\nSecond line';
    const prompt = buildCompanyPrompt({ country: 'DE', scale: 'small', brandName, businessDirection: 'AI reports', b2bServiceType: 'Research support' });
    expect(prompt).toContain('identity.brandName must match exactly');
    expect(prompt).toContain(JSON.stringify(brandName));
    expect(prompt).toContain('Business direction: "AI reports"');
    expect(prompt).toContain('B2B service type: "Research support"');
    expect(prompt).not.toContain('Brand hint:');
  });
  it('exposes future catalogs while limiting random generation to phase-one supported values', () => {
    expect(companyCatalog.scales.filter(item => item.supported).map(item => item.value)).toEqual(['small', 'medium']);
    expect(companyCatalog.countries.filter(item => item.supported).map(item => item.value)).toEqual(['DE']);
    for (const list of [companyCatalog.brands, companyCatalog.directions, companyCatalog.serviceTypes]) {
      expect(list.length).toBeGreaterThan(1);
      expect(new Set(list).size).toBe(list.length);
      expect(list.every(item => item.trim().length > 0)).toBe(true);
    }
  });
});
