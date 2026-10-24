# Implementation Plan

## Goal
Prepare project for implementation. This plan is for future development - not executing business logic now.

## Phase 0: Project scaffolding (prep) - CURRENT
| Task ID | Goal | Related Req | Deps | Components | Completion Criteria | Tests/Checks | Risks |
|---------|------|-------------|------|------------|-------------------|--------------|-------|
| P0-001 | Create project structure | NFR-001 | None | repo root | `server/`, `client/`, `data/`, `templates/`, `docs/` exist | `ls`/structure check | None |
| P0-002 | Init package.json files | NFR-001 | P0-001 | server/, client/ | Valid package.json with minimal deps | Parse JSON | None |
| P0-003 | Git ignore setup | NFR-002 | P0-001 | .gitignore | Ignore node_modules, data/, .env, keys | Check patterns | None |
| P0-004 | Env example | NFR-002 | P0-002 | .env.example | Example without real keys | Review content | None |

## Phase 1: Core infrastructure
| Task ID | Goal | Related Req | Deps | Components | Completion Criteria | Tests/Checks | Risks |
|---------|------|-------------|------|------------|-------------------|--------------|-------|
| P1-001 | Config management (server) | FR-007, NFR-002 | P0-002 | server/config | Load env, validate required vars, no key leakage | Unit test config loading | Key exposure |
| P1-002 | File storage layer | FR-002, FR-006 | P0-001 | server/storage | CRUD for companies/sites/versions, JSON schema validation | Unit tests | Versioning bugs |
| P1-003 | Company schema & validation | FR-002, FR-008 | P1-002 | server/validators/schema | Zod/schema for all fields, required checks | Schema validation tests | Missing fields |
| P1-004 | OpenRouter client (server) | FR-007 | P1-001 | server/services/openrouter | Key server-only, model list, generation call, retries, cost tracking, spend limit | Mock tests, no key in logs | Key leak/cost overrun |
| P1-005 | Basic API routes | FR-001,FR-002,FR-006,FR-007 | P1-001-004 | server/routes | REST endpoints for company/site/lib/config | API tests | Auth/secrets |

## Phase 2: Company generation (A)
| Task ID | Goal | Related Req | Deps | Components | Completion Criteria | Tests/Checks | Risks |
|---------|------|-------------|------|------------|-------------------|--------------|-------|
| P2-001 | Catalogs for random values | FR-001, G-001 | P1-003 | server/data/catalogs | Catalogs for DE/small/medium, directions/types | Load/catalog tests | Insufficient diversity |
| P2-002 | Company generator | FR-001,FR-002,FR-008 | P1-004,P2-001 | server/generators/company | Generate card with all fields, diverse for same inputs, uses OpenRouter | Generation tests, diversity check | Non-diverse output |
| P2-003 | Company UI (phase A) | FR-001,FR-002,FR-006 | P1-005 | client/src/pages/company | Inputs (explicit/random), model select, generate, view/edit/save card | E2E/manual | UX issues |
| P2-004 | Diversity validation | FR-008, G-002 | P2-002 | server/validators/diversity | Checks beyond names/numbers (history/specialization/team/texts) | Automated checks | Weak definition |

## Phase 3: Site generation (B)
| Task ID | Goal | Related Req | Deps | Components | Completion Criteria | Tests/Checks | Risks |
|---------|------|-------------|------|------------|-------------------|--------------|-------|
| P3-001 | Templates for 3 pages (RU/DE) | FR-003,FR-004,NFR-004 | P1-003 | templates/ | Home/Product/Company-Contacts, nav, meta, favicon, adaptive | Template render tests | Fact drift |
| P3-002 | Site generator | FR-003,FR-004,FR-005 | P2-002,P3-001 | server/generators/site | Uses card facts only, no fake features, i18n | Fact consistency tests | Hallucinated facts |
| P3-003 | Site UI (phase B) | FR-003,FR-006 | P1-005 | client/src/pages/site | Select company, lang/style, generate, preview | Manual/E2E | Wrong company used |
| P3-004 | Consistency validators | FR-005,FR-008 | P3-002 | server/validators/consistency | Cross-page match, phone/country, contradictions, no empty/unreplaced vars | Automated validation | Missed issues |

## Phase 4: Library, versioning, export
| Task ID | Goal | Related Req | Deps | Components | Completion Criteria | Tests/Checks | Risks |
|---------|------|-------------|------|------------|-------------------|--------------|-------|
| P4-001 | Library UI | FR-006 | P2-003,P3-003 | client/src/pages/library | List companies, view/edit, create site, versions, preview, downloads | Manual | Missing features |
| P4-002 | Versioning logic | FR-006, NFR-003 | P1-002 | server/services/versioning | New version on site regen; old preserved | Version tests | Silent overwrite |
| P4-003 | ZIP export | FR-006, FR-010 | P3-002 | server/services/export | Package static site as ZIP, no secrets | Export tests, leak check | Key leakage |
| P4-004 | JSON export (company) | FR-006, FR-010 | P1-002 | server/routes/export | Download company JSON | Export test | Leaked data |

## Phase 5: Security, limits, polish
| Task ID | Goal | Related Req | Deps | Components | Completion Criteria | Tests/Checks | Risks |
|---------|------|-------------|------|------------|-------------------|--------------|-------|
| P5-001 | Key/security audit | FR-007, NFR-002 | P1-004,P4-003 | all | No key in client/export/logs/site; server-only | Grep for key patterns, manual review | Leakage |
| P5-002 | Spend limits & cost tracking | FR-007, B-004 | P1-004 | server/services/openrouter | Enforce per-operation limit, track cost | Limit tests | Uncontrolled spend |
| P5-003 | Error handling & retries | FR-007 | P1-004 | server/services/openrouter | Limited retries, clear errors, progress UI | Error scenario tests | Poor UX |
| P5-004 | Two examples | FR-010 | P4-001 | examples/ | 2 companies + 2 sites as examples | Deliverable check | Incomplete |

## Phase 6: Docs & finalization
| Task ID | Goal | Related Req | Deps | Components | Completion Criteria | Tests/Checks | Risks |
|---------|------|-------------|------|------------|-------------------|--------------|-------|
| P6-001 | Launch instructions | FR-010 | all | docs/ or README | Install/run/test instructions | Follow instructions | Missing steps |
| P6-002 | Example config (no keys) | FR-010 | P0-004 | .env.example | Complete example without secrets | Review | Secrets leaked |
| P6-003 | Schema doc | FR-010 | P1-003 | docs/schema.md | Company JSON schema documented | Review | Mismatch |
| P6-004 | Extensibility design check | FR-009 | P1-003 | docs/architecture.md (update) | 8-direction extension plan confirmed | Design review | Hard to extend |

## Notes
- No business logic implementation in this bootstrap phase
- Open questions (B-001-B-004, G-001-G-003) need human input or safe defaults with justification
- All P0 tasks for security must be enforced
