import { CoreInputs } from '../core/types.js';

/**
 * Строгий промпт для генерации CompanyCore
 * Модель должна вернуть ТОЛЬКО валидный JSON по схеме, без объяснений
 */
export function buildCompanyPrompt(inputs: CoreInputs): string {
  return `You are a generator of UNIQUE B2B company profiles for AI-powered investment research and data analysis services.

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

CRITICAL REQUIREMENTS FOR UNIQUENESS:
- Create a DIFFERENT company every time. Do NOT use generic phrases like "provides solutions", "cutting-edge", "innovative company".
- History: write 4-6 sentences with a specific origin story. Mention founding year, initial focus, pivot/evolution. Make it concrete and believable.
- Specialization: be very specific about WHAT exactly they do (niche + data sources + angle). Avoid broad descriptions.
- CEO bio: 3-4 sentences with specific background (domain experience, previous roles, expertise). Must be different from heads.
- Each head must have a DIFFERENT role, different background, different expertise. Write detailed bios (2-4 sentences each).
- Target audience: be specific (e.g. specific type of investors/funds/analysts), not "businesses".
- Client problem: describe a real concrete pain point in detail.
- Product inputs/process/result/limits: write detailed, specific descriptions (3-5 sentences each minimum). Explain concrete workflow.
- FAQ: write detailed answers (2-4 sentences each), specific to THIS company and product.

RULES:
- Country: ${inputs.country} (for phase 1 use Germany context)
- Company scale: ${inputs.scale}
- Brand name and legal entity name must be plausible for Germany (different each time)
- Phone must match Germany format (start with +49)
- Email must be consistent with brand name
- City/address plausible for Germany
- CEO + exactly 2 department heads with different roles and distinct professional bios
- History, specialization, target audience, client problem must be coherent
- Product: inputs/process/result/limits must be consistent with each other, no contradictions
- FAQ must have exactly 5 items, relevant to the product
- VARY: founding year, niche, data focus, team composition, geography angle, value proposition
- Use specific details: mention actual data types, research workflows, analysis methods
- Return ONLY JSON. No markdown, no explanations, no text before/after.

${inputs.brandName ? `Brand hint: ${inputs.brandName}` : ''}
${inputs.businessDirection ? `Business direction: ${inputs.businessDirection}` : ''}
${inputs.b2bServiceType ? `B2B service type: ${inputs.b2bServiceType}` : ''}
`;
}
