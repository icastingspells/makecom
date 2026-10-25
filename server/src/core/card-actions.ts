import { z } from 'zod';
import type { CompanyCore } from './types.js';
import { CardEditError, editCore, buildCoreFacts } from './edit-core.js';
import { CompanyCoreSchema } from '../validators/core-schema.js';

export function isCoreApproved(core: CompanyCore): boolean {
  return core.meta.approval?.version === core.meta.version;
}

const approvalSchema = z.object({ expectedVersion: z.number().int().positive(), consistencyReviewed: z.literal(true) }).strict();

export function approveCore(previous: CompanyCore, input: unknown): CompanyCore {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) throw new CardEditError(400, 'Подтвердите проверку фактов и укажите версию карточки.');
  // Apply the same structural, empty-field and phone checks as a normal edit.
  const validated = editCore(previous, { identity: previous.identity, contacts: previous.contacts, people: previous.people, business: previous.business, product: previous.product, faq: previous.faq, ...parsed.data });
  return { ...validated, meta: { ...previous.meta, approval: { version: previous.meta.version, approvedAt: new Date().toISOString() } } };
}

export function exportCore(core: CompanyCore): CompanyCore {
  // Only the defined company contract; extension/module payloads are not exported.
  const clean = CompanyCoreSchema.parse({ ...core, facts: {}, extensions: {} });
  clean.facts = buildCoreFacts(clean as CompanyCore);
  return clean as CompanyCore;
}
