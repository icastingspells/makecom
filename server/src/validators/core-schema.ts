import { z } from 'zod';

/**
 * Zod-схема для валидации CompanyCore
 * Проверяет структуру канонической модели
 */

const PersonSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  bio: z.string().min(1)
});

const FaqItemSchema = z.object({
  q: z.string().min(1),
  a: z.string().min(1)
});

const FactSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  source: z.enum(['core', 'module'])
});

export const CompanyCoreSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  inputs: z.object({
    brandName: z.string().optional(),
    country: z.string().min(1),
    businessDirection: z.string().optional(),
    b2bServiceType: z.string().optional(),
    scale: z.enum(['small', 'medium']),
    model: z.string().optional()
  }),
  identity: z.object({
    brandName: z.string().min(1),
    legalEntityName: z.string().min(1)
  }),
  contacts: z.object({
    city: z.string().min(1),
    address: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email()
  }),
  people: z.object({
    ceo: PersonSchema,
    heads: z.tuple([PersonSchema, PersonSchema])
  }),
  business: z.object({
    history: z.string().min(1),
    specialization: z.string().min(1),
    targetAudience: z.string().min(1),
    clientProblem: z.string().min(1)
  }),
  product: z.object({
    inputs: z.string().min(1),
    process: z.string().min(1),
    result: z.string().min(1),
    limits: z.string().min(1)
  }),
  faq: z.tuple([FaqItemSchema, FaqItemSchema, FaqItemSchema, FaqItemSchema, FaqItemSchema]),
  facts: z.record(z.string(), FactSchema),
  extensions: z.record(z.string(), z.unknown()),
  meta: z.object({
    version: z.number().int().min(1),
    approval: z.object({ version: z.number().int().positive(), approvedAt: z.string().datetime() }).optional()
  })
});

export type CompanyCoreSchemaType = z.infer<typeof CompanyCoreSchema>;
