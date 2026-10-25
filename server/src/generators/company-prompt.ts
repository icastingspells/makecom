import { CoreInputs } from '../core/types.js';

/**
 * Строгий промпт для генерации CompanyCore
 * Модель должна вернуть ТОЛЬКО валидный JSON по схеме, без объяснений
 */
export function buildCompanyPrompt(inputs: CoreInputs): string {
  return `You are a generator of B2B company profiles for AI-powered investment research/data analysis services.

Generate a COMPLETE and CONSISTENT company profile as STRICT JSON matching this schema:

{
  "identity": {"brandName": string, "legalEntityName": string},
  "contacts": {"city": string, "address": string, "phone": string, "email": string},
  "people": {
    "ceo": {"name": string, "title": string, "bio": string},
    "heads": [
      {"name": string, "title": string, "bio": string},
      {"name": string, "title": string, "bio": string}
    ]
  },
  "business": {"history": string, "specialization": string, "targetAudience": string, "clientProblem": string},
  "product": {"inputs": string, "process": string, "result": string, "limits": string},
  "faq": [{"q": string, "a": string}, {"q": string, "a": string}, {"q": string, "a": string}, {"q": string, "a": string}, {"q": string, "a": string}]
}

RULES:
- Country: ${inputs.country} (for phase 1 use Germany context)
- Company scale: ${inputs.scale}
- Brand name and legal entity name must be plausible for Germany
- Phone must match Germany format (start with +49)
- Email must be consistent with brand name
- City/address plausible for Germany
- CEO + exactly 2 department heads with different roles and distinct professional bios
- History, specialization, target audience, client problem must be coherent
- Product: inputs/process/result/limits must be consistent with each other, no contradictions
- FAQ must have exactly 5 items, relevant to the product
- Make it SUBSTANTIVELY DIFFERENT from generic templates - vary history, focus, team experience
- Return ONLY JSON. No markdown, no explanations, no text before/after.

${inputs.brandName ? `Brand hint: ${inputs.brandName}` : ''}
${inputs.businessDirection ? `Business direction: ${inputs.businessDirection}` : ''}
${inputs.b2bServiceType ? `B2B service type: ${inputs.b2bServiceType}` : ''}
`;
}
