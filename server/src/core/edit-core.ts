import { CompanyCore, CoreFacts } from './types.js';
import { CompanyCoreSchema } from '../validators/core-schema.js';
import { z } from 'zod';

const editable = CompanyCoreSchema.pick({ identity: true, contacts: true, people: true, business: true, product: true, faq: true });
const editSchema = editable.extend({ expectedVersion: z.number().int().positive(), consistencyReviewed: z.literal(true) }).strict();

export class CardEditError extends Error {
  constructor(public status: number, message: string, public errors: string[] = []) { super(message); }
}

/** Rebuild derived facts; never keep stale core facts after manual editing. */
export function buildCoreFacts(core: CompanyCore): CoreFacts {
  const facts: CoreFacts = {};
  const visit = (value: unknown, key: string) => {
    if (typeof value === 'string') facts[key] = { key, value, source: 'core' };
    else if (value && typeof value === 'object') {
      for (const [child, item] of Object.entries(value)) visit(item, key ? `${key}.${child}` : child);
    }
  };
  for (const key of ['identity', 'contacts', 'people', 'business', 'product', 'faq'] as const) visit(core[key], key);
  const aliases: Record<string, string> = {
    brandName: core.identity.brandName, legalEntityName: core.identity.legalEntityName,
    registeredAddress: core.contacts.address, contactPhone: core.contacts.phone,
    contactEmail: core.contacts.email
  };
  for (const [key, value] of Object.entries(aliases)) facts[key] = { key, value, source: 'core' };
  return facts;
}

export function editCore(previous: CompanyCore, input: unknown): CompanyCore {
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) throw new CardEditError(400, 'Проверьте поля карточки', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
  const { expectedVersion, consistencyReviewed, ...changes } = parsed.data;
  if (expectedVersion !== previous.meta.version) throw new CardEditError(409, 'Карточка уже изменена. Откройте её заново перед сохранением.');
  const empty: string[] = [];
  const checkText = (value: unknown, key: string) => {
    if (typeof value === 'string' && (!value.trim() || /\{\{[^}]+\}\}|\$\{[^}]+\}/.test(value))) empty.push(key);
    else if (value && typeof value === 'object') for (const [child, item] of Object.entries(value)) checkText(item, `${key}.${child}`);
  };
  checkText(changes, '');
  if (empty.length) throw new CardEditError(400, 'Заполните поля и замените переменные шаблона', empty);
  const phone = changes.contacts.phone.replace(/[\s().-]/g, '');
  if (previous.inputs.country === 'DE' && !/^\+49[1-9]\d{5,12}$/.test(phone)) {
    throw new CardEditError(400, 'Для Германии нужен телефон в международном формате +49…');
  }
  const core: CompanyCore = {
    ...previous, ...changes, updatedAt: new Date().toISOString(),
    meta: { ...previous.meta, version: previous.meta.version + 1 }
  };
  delete core.meta.approval;
  core.facts = buildCoreFacts(core);
  return core;
}
