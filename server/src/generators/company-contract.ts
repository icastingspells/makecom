import type { CoreInputs } from '../core/types.js';

const text = { type: 'string', minLength: 1 };
const object = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });

/** The provider receives the complete output shape before generation, not a repair request afterwards. */
export function companyResponseFormat(inputs: CoreInputs) {
  const person = object({ name: text, title: text, bio: text });
  return { type: 'json_schema' as const, json_schema: { name: 'company_profile', strict: true, schema: object({
    identity: object({ brandName: inputs.brandName ? { ...text, enum: [inputs.brandName] } : text, legalEntityName: text }),
    contacts: object({ city: text, address: text, phone: text, email: text }),
    people: object({ ceo: person, heads: { type: 'array', minItems: 2, maxItems: 2, items: person } }),
    business: object({ history: text, specialization: text, targetAudience: text, clientProblem: text }),
    product: object({ inputs: text, process: text, result: text, limits: text }),
    faq: { type: 'array', minItems: 5, maxItems: 5, items: object({ q: text, a: text }) }
  }) } };
}
