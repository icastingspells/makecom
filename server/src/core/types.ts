/**
 * Canonical Company Model (CompanyCore)
 * Единый источник правды для всех модулей генерации
 */

export interface CoreInputs {
  brandName?: string;
  country: string;
  businessDirection?: string;
  b2bServiceType?: string;
  scale: 'small' | 'medium';
  model?: string;
}

export interface CoreIdentity {
  brandName: string;
  legalEntityName: string;
}

export interface CoreContacts {
  city: string;
  address: string;
  phone: string;
  email: string;
}

export interface Person {
  name: string;
  title: string;
  bio: string;
}

export interface CorePeople {
  ceo: Person;
  heads: [Person, Person];
}

export interface CoreBusiness {
  history: string;
  specialization: string;
  targetAudience: string;
  clientProblem: string;
}

export interface CoreProduct {
  inputs: string;
  process: string;
  result: string;
  limits: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Fact {
  key: string;
  value: string;
  source: 'core' | 'module';
}

export interface CoreFacts {
  [factId: string]: Fact;
}

export interface CompanyCore {
  id: string;
  createdAt: string;
  updatedAt: string;
  inputs: CoreInputs;
  identity: CoreIdentity;
  contacts: CoreContacts;
  people: CorePeople;
  business: CoreBusiness;
  product: CoreProduct;
  faq: [FaqItem, FaqItem, FaqItem, FaqItem, FaqItem];
  facts: CoreFacts;
  extensions: Record<string, unknown>;
  meta: {
    version: number;
  };
}

export interface CoreSnapshot {
  core: CompanyCore;
  hash: string;
  createdAt: string;
}
