# Requirements Analysis

## 1. Goal and scope (confirmed)
- Build a web panel to auto-generate a company profile and create a ready-to-go 3-page website from it.
- Profile must include team, history, clear product, contact info; consistent across sections/pages.
- Re-runs must produce substantively different companies.
- First focus: B2B services using AI for investment research/data analysis.
- Generated data is project data; not a substitute for checking legal entity in official registries.

## 2. User scenario
- Phase A (company): set params, generate, get saved card; view/edit/approve.
- Phase B (site): select saved company, set design params, create site; preview/download. Creating site for existing company must not regenerate its facts. Changing company card must not silently change existing site - must create new site version.

## 3. Functional requirements

### FR-001: Company generation inputs
- **Source:** scope-of-work §3.1
- **Normalized:** Panel must accept inputs (brand name, country, business direction, type of B2B service, company scale, OpenRouter model). User can specify values or pick random from catalog.
- **Priority:** P0
- **Acceptance:** For phase 1, only Germany and two scales (small/medium) must be supported functionally. Catalogs: **10 country options** (UI), **5 scale options** (UI). Random selection available. Business direction/type of B2B service deferred to later if needed.
- **Dependencies:** FR-002, NFR-001
- **Verification:** Manual test - try explicit and random for Germany/small/medium from catalogs.

### FR-002: Company card fields
- **Source:** scope-of-work §3.2
- **Normalized:** Generate/save brand name, legal entity name, city/address/phone/email, CEO + 2 department heads, names/positions/short professional bios, foundation history/specialization, target audience/client problem, product description (inputs/process/result/limits), 5 Q&A pairs.
- **Priority:** P0
- **Acceptance:** Card supports view/edit/save. All stored as structured JSON (schema proposed by implementer).
- **Dependencies:** FR-001
- **Verification:** Inspect saved card JSON has all fields; edit persists.

### FR-003: Site generation inputs
- **Source:** scope-of-work §3.3
- **Normalized:** Inputs: saved company, site language (RU/DE), visual style or color scheme. Phase 1 needs one adaptive template with styling options.
- **Priority:** P0
- **Acceptance:** Can select saved company, choose RU/DE, choose style/color scheme; generates site from approved card facts.
- **Dependencies:** FR-002
- **Verification:** Generate site for a saved company with RU and DE.

### FR-004: Site structure
- **Source:** scope-of-work §3.3
- **Normalized:** 3 pages: Home (offer/audience/benefits/link to product), Product (service/process/limits/FAQ), Company & Contacts (history/team/address/contacts). Must include nav, headings, metadata, favicon.
- **Priority:** P0
- **Acceptance:** All 3 pages exist, nav works, metadata present, favicon present.
- **Dependencies:** FR-003
- **Verification:** Browse generated site structure.

### FR-005: Fact consistency in site generation
- **Source:** scope-of-work §3.3, §5
- **Normalized:** Texts formed from approved card. Adaptation of presentation allowed, but names/addresses/product characteristics/facts must not change. Must not fabricate features (no fake forms/account/login/uploads/server processing).
- **Priority:** P0
- **Acceptance:** Facts match card exactly as stated; no unimplemented features presented as working.
- **Dependencies:** FR-002, FR-004
- **Verification:** Compare key facts across pages vs card.

### FR-006: Library/results management
- **Source:** scope-of-work §3.4
- **Normalized:** Panel must show list of companies, view/edit each, create site for selected company, list of site versions per company/context, preview site, download company as JSON, download site as ZIP. Changing card must not silently change existing site - new version created on re-generation.
- **Priority:** P0
- **Acceptance:** All listed actions available; old site versions preserved when card edited and new site generated.
- **Dependencies:** FR-002, FR-003
- **Verification:** Edit card, generate new site version - old version still accessible.

### FR-007: OpenRouter integration
- **Source:** scope-of-work §4
- **Normalized:** Configure API key on server, model selection, show current generation step, handle errors/invalid model responses, limited retries, cost tracking using available OpenRouter data, spend limit per operation. Keys must not leak to site code/export/browser/logs. Re-opening saved result must not trigger paid requests.
- **Priority:** P0
- **Acceptance:** Key only on server; UI shows progress/errors/retries; cost/limit enforced; no key leakage; cached/saved results load without API calls.
- **Dependencies:** FR-001, FR-003
- **Verification:** Check network/logs/exports for key presence; load saved result offline-from-API.

### FR-008: Consistency checks (enforced)
- **Source:** scope-of-work §5
- **Normalized:** Must verify: info matches across pages, phone matches country/city, no product description contradictions, meaning preserved when changing language, no empty required fields/unreplaced variables. Companies with same inputs must differ (history/specialization/team experience/texts, target audience/problem, product description, FAQ) - name/number/city/phone changes insufficient.
- **Priority:** P0
- **Acceptance:** Validation rules implemented/checks pass for generated outputs. Diversity checks enforce substantive differences.
- **Dependencies:** FR-002, FR-004, FR-005
- **Verification:** Generate two companies with same params, compare key blocks - substantively different.

### FR-009: Future extensibility (architecture prep)
- **Source:** scope-of-work §6
- **Normalized:** First stage must allow extension to 8 directions (operator/history/team, legal docs, country requisites, contacts, product/scenarios/FAQ, personal data/policies, security, clients/reviews/cases/publications). **CompanyCore** is single source of truth. All modules must read from core, use Fact Registry, follow Module Contract (no core fact regeneration), use Core Snapshot, pass Cross-module validation and Joint validation. Not all 8 need to be implemented now - only architecture/rules.
- **Priority:** P1 (architectural)
- **Acceptance:** Architecture supports adding modules sharing common fact store/schema without global refactor.
- **Dependencies:** FR-002
- **Verification:** Design review - CompanyCore, Fact Registry, contracts, validators present.

### FR-010: Deliverables
- **Source:** scope-of-work §7
- **Normalized:** Deliver working panel with two phases, source code, launch instructions, example config without keys, company data schema, two ready examples (companies+sites).
- **Priority:** P0
- **Acceptance:** All items present.
- **Dependencies:** All above
- **Verification:** Checklist against deliverables.

## 4. Non-functional requirements

### NFR-001: Web architecture
- **Source:** scope-of-work (implied)
- **Normalized:** Web panel requiring server for OpenRouter key/config; static site export for download. Cloud-ready (Render/Railway). Storage: Supabase Postgres + Storage for cloud, file adapter for local dev.
- **Priority:** P0
- **Acceptance:** Stack supports server-side key handling, static export, persistent storage in cloud.
- **Verification:** Architecture doc.

### NFR-002: Security
- **Source:** §4
- **Normalized:** API keys server-side only, never in exports/site/browser/logs. Spend limits. No secrets in repo.
- **Priority:** P0
- **Acceptance:** Key handling reviewed; no leakage paths.
- **Verification:** Audit config/storage/export paths.

### NFR-003: Reliability/consistency
- **Source:** §5
- **Normalized:** Deterministic fact source (card); validation of consistency; versioning of sites on changes.
- **Priority:** P0
- **Acceptance:** Versioning works; checks implemented.
- **Verification:** Test scenarios.

### NFR-004: Internationalization
- **Source:** §3.3
- **Normalized:** Support Russian and German for generated site.
- **Priority:** P0
- **Acceptance:** Both languages work from same card facts.
- **Verification:** Generate in both languages.

### NFR-005: Extensibility
- **Source:** §6
- **Normalized:** Architecture must accommodate 8-direction expansion with shared facts and joint validation.
- **Priority:** P1
- **Acceptance:** Common schema/fact model designed.
- **Verification:** Architecture review.

## 5. Open questions / assumptions

### Assumptions (can proceed with justification)
- A-001: Web panel implies server + client. Stack to be decided in architecture.
- A-002: JSON schema for company card designed by implementer as requested.
- A-003: "One adaptive template with styling options" means single template engine supporting themes/colors.
- A-004: Download as ZIP means packaging generated static site files.
- A-005: Cost tracking uses OpenRouter pricing data as available.

### Blockers requiring human decision
- B-001: **Stack choice** - not specified. Must pick minimal viable stack with justification.
- B-002: **Storage mechanism** - local filesystem/DB? Needs persistence; simple preferred.
- B-003: **Model selection UX** - how models listed/fetched from OpenRouter?
- B-004: **Spend limit** - exact limit value/logic not specified.

### Gaps to clarify
- G-001: "Catalog" for random values - scope/details unspecified.
- G-002: Definition of "substantively different" - needs concrete checks beyond names/numbers.
- G-003: "Joint validation" for 8 directions - undefined.

## 6. Requirements traceability matrix
| Req | Type | Priority | Covered by (planned) | Status |
|-----|------|----------|---------------------|--------|
| FR-001 | F | P0 | UI inputs, validation, catalogs | Planned |
| FR-002 | F | P0 | Company schema, generator, card UI | Planned |
| FR-003 | F | P0 | Site gen inputs, template engine | Planned |
| FR-004 | F | P0 | Templates/pages, nav/meta/favicon | Planned |
| FR-005 | F | P0 | Fact source enforcement, no fake features | Planned |
| FR-006 | F | P0 | Library UI, versioning, exports | Planned |
| FR-007 | F | P0 | Server config, key mgmt, progress, retries, cost/limits | Planned |
| FR-008 | F | P0 | Validation rules, diversity checks | Planned |
| FR-009 | F | P1 | Extensible schema/fact store | Planned |
| FR-010 | F | P0 | Deliverables checklist | Planned |
| NFR-001-005 | NF | P0/P1 | Arch/design | Planned |

## 7. Notes
- Greenfield, no git repo. Only scope-of-work.md exists.
- Must not implement business logic now; only prepare.
- Decisions must be justified with sources where possible.
