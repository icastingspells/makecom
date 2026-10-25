# Agent Activity Log

## 035 | 2026-10-26 | Stage 4: local database and code unification
- Checkpoint be417c5 created first as requested; only then refactored/removed files. User accepted prior live checks. No GitHub push, cloud deployment or history rewrite.
- Added built-in node:sqlite adapter (Node 24.15+): parameterized queries, WAL/busy timeout, schema-version guard, immutable site/module IDs, shared connection per path and shutdown close. Existing file driver/env retained; new env template recommends SQLite.
- Added explicit storage:import command: dry-run by default, strict source reads, full transaction into empty destination, rollback/no overwrite, original JSON preserved. Actual user library dry-run reported 9 companies/6 sites/22 operations; no import/driver switch performed.
- Split static company/site/library views, settings controller, card versions, typed editor fields and model selector out of main.ts (about 925 -> 535 lines). Separated app factory from server entry. Unified file reads/writes: corrupted files surface errors, complete atomic writes, immutable versions.
- Removed unused old CSS, CrossModule/Joint stubs and their obsolete tests, no-op proxy test, unused barrels, duplicate root env example, unused cors dependency. Build clears only server/dist; workspace typecheck covers client/server. Kept future module types/registry and cloud adapter/preparation.
- Checks: 61 tests/15 files, full build and workspace typechecks pass. SQLite tests include a separate process read and reopened API with saved core/files/snapshot/history. Mock browser QA on isolated SQLite 3018 passed company/approval/site/preview/settings; server stopped/tab closed. No real keys, paid calls or user-data writes.
- Before GitHub (stage 5), audit historical credential-bearing tracked files; checkpoint removed current files but did not rewrite earlier history. SQLite remains optional and local operation requires no cloud.


## 034 | 2026-10-26 | User acceptance and pre-unification checkpoint
- User confirmed all manual checks work and authorized stage 4, explicitly requiring a commit before refactoring/deletion. This is user acceptance, not a new independent agent live-generation check.
- Prepared the current working tree for a local checkpoint: scanned non-ignored source/docs for credential patterns, no findings; .env/data/proxy binaries remain excluded, local .err and SQLite artifacts ignored. Existing removals of credential-bearing helper/proxy files preserved. No history rewrite or GitHub publication authorized/performed.

## 033 | 2026-10-26 | Review last real result, source fidelity and preview controls
- User requested review of latest saved company/site and two UI changes. Read-only review identified Droptears core 5a5e9b9a-f031-42ed-a993-e70fea3436ab and RU site df56a149-d67e-460a-9041-e682f9a20f47. Snapshot equals approved core v2. Reported costs: company $0.0020996965638, site $0.012531915; one attempt each.
- Found factual adaptation defect: saved FAQ answer 5 is blah blah, website replaces it with a detailed maintenance/seasonality answer. User asked whether TЗ permits this; scope §§3/5 prohibit changing source facts/meaning. Also noted qualified concerns about claimed Sentinel-2 daily/thermal capabilities (ESA MSI specification) and repetitive homepage benefits. Saved results were not edited.
- Strengthened pre-request site instructions: placeholders/uninterpretable values remain verbatim, FAQ stays paired, no repairing/completing from other fields/history/general knowledge; static brochure does not imply working upload/login/dashboard features. Company prompt now requires technically plausible source capabilities. No post-response content validator or repair call added. New test covers outgoing placeholder/source preservation contract.
- Initial UI patch was rejected by user approval tool; did not bypass it. User subsequently explicitly approved both changes. Source details now hidden until successful generation response; saved-version preview toggles open/closed with aria-expanded and removes iframe on close.
- Checks: 58 tests/13 files, full build/server-client types passed. Isolated read-only server 3017 replayed existing saved files (no provider call/data writes); browser verified source hidden/shown, preview open/hide/reopen, navigation and mobile toggle. Test server stopped/tab closed. Source fidelity after updated prompt, DE and second-company diversity remain pending paid acceptance checks.

## 032 | 2026-10-26 | Automatic key-limit display on connection
- User requested key limits on the Connection page. Existing safe quota endpoint now returns allowlisted limit/remaining/usage, daily-weekly-monthly usage, reset interval and available free-request quota; null/unlimited/zero/missing values are distinguished. No account-credit/management-key endpoint used.
- Connection triggers automatic refresh after saving a key and when reopening an existing session; manual refresh retained. Disconnect clears values and cancels stale requests; connection actions are mutually disabled during mutations. No key/label/hash/provider metadata in the response.
- Checks: 57 tests pass (extended quota cases), full build/server-client types pass. Isolated browser QA on 3016 used fabricated responses: connect auto-load, reload auto-load and disconnect clearing verified. QA server stopped/tab closed. Screenshot key-limits.png in visualization workspace. No real credentials/paid model calls/user data touched.

## 031 | 2026-10-26 | Generation requirements moved into request
- Implemented user's updated policy: company request now carries native JSON Schema (exact brand enum, two heads, five FAQ), coherent facts/city-phone/product rules and bounded content of eight recent profiles for diversity. Prior context excludes extensions/credentials/operation metadata.
- Site request specifies source-based benefits, one h1/logical headings, 360px/desktop layout, nav and faithful translation. Removed post-response number comparisons, mandatory-block/nav checks, literal-prose quality rejection and route CrossModuleValidator. Exact brand is constrained in the outgoing schema, not compared after receipt. CSS generated text is not judged for content.
- Technical JSON/schema/token handling, HTML/CSS security, budgets and manual saved-card approval remain. Both model selectors now require compatible text/structured output support. No semantic judge/repair-model call added. Prompt instructions do not guarantee real output quality.
- Checks: 57 tests / 13 files passed; full build and server/client typechecks passed; no paid calls. Real RU/DE output quality, diversity, token quota and billed cost remain stage 3 acceptance checks.

## 030 | 2026-10-26 | Documentation consolidation and new user sequence
- Recorded the new order in docs/work-plan.md: documentation/checklist/request contract, user-token tests, code cleanup + working local DB, final checks/GitHub, Render/Supabase. Previous order superseded; do not start cloud/DB migration before the current stage is accepted.
- Five active docs retained: architecture, work-plan, acceptance-checklist, agent-workflow, activity log. Preserved 23 previous documents including ADR/subproject READMEs in docs/archive/development-notes.md; removed duplicate originals after archival. Older path mentions below are historical and now refer to source sections in this archive.
- Rewrote README with actual local dev/build/start instructions, canonical env template path, simplified architecture and data schema. Rewrote detailed architecture and AGENTS/workflow to point to the new sources of truth. Kept this log and did not rewrite past records.
- Added acceptance checklist covering scope §§1–7 with code/mock vs real-generation evidence and pending items. Clearly identified that local storage is JSON files, not a DB; local SQL adapter/persistence/migration belongs to later stage 4 and Supabase/Render are optional.
- Checks: active Markdown links valid; five-doc inventory and 23-source archive verified; no credential-like values found in documentation scan. scope-of-work.md SHA-256 unchanged: D1641D3E10E88A6432446D5CCC17C052F9FEBFABC0892990C7B00AE54E6BA77A. No user data/config/credentials/cloud resources touched.

Historical references to removed documentation paths in older entries are preserved as an audit trail; current instructions are README, AGENTS and docs/work-plan.md.

## 029 | 2026-10-26 | Persisted card approval and JSON export
- Continued authorized feature work: FR-002/003/005/006, P4-004. Added approve endpoint with saved revision check and edit validation, persisted approval metadata, reset on edits, server generation gate and UI statuses/actions/library badges/approved-only site selection.
- JSON export validates the company contract, rebuilds facts from cleaned fields and omits extension/module/unknown payloads. No stored credentials or paid requests needed. Existing site files/versions unchanged.
- Verification: 55 tests/13 files, full build and server/client types pass. Browser isolated mock QA on 3015: create draft, approve, reload approval, JSON download, edit/save resets approval, site selector disables draft. Test server stopped/tab closed; real user data untouched.

## 028 | 2026-10-25 to 2026-10-26 | Company input/catalog stage
- FR-001/P2-001/P2-003: catalog values for brands/business directions/service types, random per-field/all controls; DE/small/medium only supported despite future catalog entries. Exact user brand enforced, input parameters passed and saved.
- Verified with 53 tests, full build/client types and isolated mock browser QA on 3014. Temporary server later stopped. User deferred live paid site verification to final checks; proceed without billable requests.

## 027 | 2026-10-25 | Priority stage 6: expenses, history and progress
- User prioritized FR-007 / P5-002/P5-003 and clarified free models must be an optional filter, with paid models retained.
- Added operation journal/storage/migration 002, progress/history/quota API and UI, user budget bounded by server maximum, provider tariff caps, conservative retry allowance and Retry-After/429 handling. Provider charges retained before response validation; unknown/estimated charges identified explicitly.
- Official catalog/pricing checked: Nemotron 3 Super free supports required structured output/output length; current free caps 20 RPM / 50 RPD, 1000 RPD after $10 credit purchase. Failures consume daily quota. Sources and caveats in docs/generation-operations.md.
- Recovered own faulty scripted main.ts replacement from session history, preserved prior features and verified editor save/preview. No known recovery issue.
- Checks: 51 tests across 12 files, full build and server/client types pass. Tests rerun outside Windows sandbox due socket/temp-rename restrictions. Isolated mock browser QA on 3013 passed; server stopped and tab closed. No real keys/billable calls/cloud provisioning.


## 026 | 2026-10-25 | Full scope audit; lower connection indicator
- User requested full compliance review without fixing findings, plus green dot for lower OpenRouter status. state-of-work.md is absent; audited complete scope-of-work.md sections 1–7 against code and later user amendments.
- Added docs/scope-audit-2026-10-25.md with done/partial/missing/unverified findings. No identified functional gap fixed. Examples directory exists but is empty; separate schema doc/JSON export/catalogs/approval state/semantic and diversity validation remain incomplete.
- Only functional changes: tokenStatus is-connected class and CSS green circle. Verified initial connected state and removal on a separate simulated UI server, no user key/cookie touched; dot computed 7px rgb(34,104,68). It indicates cookie credential presence, not a live provider authentication check.
- Frontend build and TypeScript passed. No paid generation, cloud access or user-card modifications. Temporary UI tab/server closed after verification.

## 025 | 2026-10-25 | Fix false cross-site rejection in local development
- Reproduced POST /api/session returning 403 via Vite. Vite 8 string proxy shorthand enables changeOrigin=true, rewriting Host while leaving Origin unchanged.
- Changed client/vite.config.ts to explicit proxy objects with changeOrigin=false. Retained API Origin and Sec-Fetch-Site protection in testable sameOriginApiGuard middleware.
- Regression tests run actual Vite proxy: session/company POST allowed for same origin; external Origin/cross-site metadata rejected; configured production origin supported behind reverse proxy.
- Verified live 5174: 127.0.0.1 and localhost session POST with empty body reach validation (400, not 403); company POST without cookie reaches session check (401, not 403); evil origin remains 403. No credentials or paid generation used.
- Checks: 41 source tests, client/server types, complete build and changed-file whitespace checks passed.

## 024 | 2026-10-25 | AI website generation and user deployment amendments
- Implemented AI-generated layout/CSS and translated card text, strict structured-output schema, fixed fact tokens, numeric checks, HTML sanitizer and CSS AST cleanup; version metadata records model/cost/mock/review status. Corrected per-token pricing and actual usage.cost handling, conservative retry allowance and permanent-error behavior.
- Real smoke attempts rejected output for CSS and translation-schema validation; no invalid version saved. Strict schema and CSS parser improvements locally tested; paid retries stopped. No successful live final-version run claimed.
- User additionally requested preview, session-only user key, Supabase/Render preparation; confirmed personal/shared library. Implemented sandboxed preview/navigation/mobile view, encrypted HttpOnly session cookie flow (no OpenRouter env fallback; old local entry removed without displaying it), same-origin hosting/dev proxy, production access password and encryption-secret checks.
- Replaced Supabase stub with Postgres/private Storage adapter; SQL migration and render.yaml prepared. Added credential-free networking diagnostic. Native Node and curl public models direct checks returned HTTP 200; no evidence to attribute historical failures specifically to region or Node. Proxy is now explicit and provider-only; no sing-box/global dispatcher dependency.
- Updated undici 8.5.0 to 8.12.3 after npm audit reported existing high-severity issues; post-install audit reports 0 vulnerabilities. No force-update.
- Checks: 38 source tests including production Secure-cookie/encryption secret, full build and client types. Removed duplicate dist test discovery. Browser checks used an isolated mock server/temp data/fake session key; preview navigation/mobile and key save/reload/delete passed; actual user cards unchanged. Main Vite restarted on 5174 for new proxy configuration. Later native fetch timeout did not persist: repeat native/undici/curl all returned 200.
- No Supabase/Render resources or GitHub publication. Code unification deferred until end; GitHub preparation follows only afterwards. Live final AI/Supabase/Render verification remains pending; see docs/render-supabase-setup.md.

## 023 | 2026-10-25 | UX/UI refinement
- User requested restrained colors, concise presentation and clearer workflows.
- Client-only redesign: graphite sidebar, light neutral workspace, consistent form controls/buttons/focus states, mobile navigation and one-column forms, local system fonts.
- FR-002/FR-006: Russian editor labels, seven sections with in-page navigation, structured FAQ, clear review/save area, unsaved-change confirmation. Existing save/validation/version rules retained.
- Library: name/city/specialization search, compact cards/count, primary new-company action, useful empty/no-match states. Generation: human-readable results and direct open-card action. Site: hide internal IDs/default style, collapse source code behind disclosure.
- New files: client/src/workspace.css, client/src/editor-view.ts. Updated client/index.html and client/src/main.ts. Previous user-added style.css retained, no longer loaded.
- Checks: frontend build, client TypeScript, changed-source diff whitespace passed. Browser verified desktop generation/library/editor and 390px viewport (375px content width, no horizontal overflow), search/no-match, selected company transfer to site, unsaved-edit cancel and form restoration; no browser console errors. No company data saved or paid generation performed during checks.

## 022 | 2026-10-25 | Card editing and model search
- FR-002/FR-006: dedicated #cards/:id editor from library; GET/PUT API; persistent editing of text and five FAQ pairs.
- FR-005/FR-008/NFR-003: immutable IDs/creation metadata, revision conflicts and per-card save guard, schema/blank/template/DE phone validation, rebuilt canonical facts, atomic file replacement. Semantic consistency and city/phone agreement require human review; full semantic automation remains pending.
- FR-006: new site versions persist HTML and CoreSnapshot; editor lists versions and downloads ZIP without regeneration. Historical metadata-only versions cannot recover missing HTML.
- FR-007: search full model list by name/ID, counts/no-match state; removed first-80 truncation.
- Verified: client build, client/server types, 33 tests including HTTP GET/PUT/conflict and persistence/snapshot isolation. Windows sandbox blocks atomic rename; tests pass outside it. Browser checked dedicated editor/FAQ, model search and no results. No real company files changed for testing.

> Factual engineering actions only. No secrets/private data.

## 001 | INIT | Read scope-of-work
- **Stage:** A
- **Action:** Read scope-of-work.md
- **Result:** Greenfield confirmed

## 002 | A | Requirements
- **Stage:** A
- **Action:** Created docs/requirements.md
- **Result:** FR/NFR formalized

## 003 | B | Architecture
- **Stage:** B
- **Action:** Created architecture.md, ADRs
- **Result:** Design complete

## 004 | C-F | Preparation
- **Stage:** C-F
- **Action:** Plan, setup, agent docs
- **Result:** Prep done

## 005 | UPDATE | Cloud + CompanyCore
- **Stage:** B/A
- **Action:** Updated for Supabase + CompanyCore
- **Result:** Aligned

## 006 | SCAFFOLD | Structure
- **Stage:** Scaffold
- **Action:** Created folders/files/stubs
- **Result:** Ready

## 007 | GIT | Init
- **Stage:** Git
- **Action:** git init, main/dev, first commit
- **Result:** Repo ready

## 008 | DOCS | Rules
- **Stage:** Docs
- **Action:** CODE_STYLE_AND_RULES.md, DEVELOPMENT_STAGES.md
- **Result:** Rules defined

## 009 | STAGE1 | CompanyCore
- **Stage:** Stage 1
- **Action:** core/types.ts, fact-registry.ts, company-core.ts, core/index.ts
- **Result:** Foundation done

## 010 | STAGE2 | Storage
- **Stage:** Stage 2
- **Action:** storage/types.ts, file-adapter.ts, supabase-adapter.ts, storage/index.ts
- **Result:** Abstraction done

## 011 | STAGE3 | Validators
- **Stage:** Stage 3
- **Action:** core-schema.ts, core-validator.ts, cross-module.ts, joint.ts
- **Result:** Validation done, tests pass

## 012 | DOCS | Flow explained
- **Stage:** Documentation
- **Action:** PROJECT_FLOW_EXPLAINED.md
- **Result:** Documented

## 013 | STAGE4 | Infra
- **Stage:** Stage 4
- **Action:** modules/contracts, config/env, services/openrouter
- **Result:** Infra ready

## 014 | STAGE5 | Routes+UI
- **Stage:** Stage 5
- **Action:** Routes, UI for company generation
- **Result:** Testable

## 015 | OPENROUTER_ISSUE | Key blocked
- **Stage:** Debug
- **Action:** Tested provided key with various headers/models - all return 403 Access denied by security policy
- **Result:** Key unusable, switched back to MOCK_LLM=true
- **Next step:** Site generator from snapshot

## 016 | SITE_GEN | Start site generator
- **Stage:** Implementation
- **Action:** Starting site generator from CoreSnapshot, templates for 3 pages, RU/DE, versioning, ZIP export
- **Goal:** Phase B working from saved CompanyCore
- **Next step:** Create templates and generator

## 017 | UI_UX | Modern interface
- **Stage:** Implementation
- **Action:** Tabs (Phase A / Phase B / Library), card grid, form redesign, ZIP export, file preview, full card editor
- **Result:** UI/UX reworked, client rebuilt
- **Note:** Card click opens editor (not site generation); added "go to site" button in editor

## 018 | PROXY | Unblock OpenRouter via proxy
- **Stage:** Debug
- **Action:** Added undici ProxyAgent (server/src/http-proxy.ts), installed undici 8.5.0, local sing-box HTTP inbound on 127.0.0.1:8080
- **Result:** OpenRouter reachable through proxy - 467 models listed
- **Bug found:** http-proxy.js was imported BEFORE dotenv.config(), so proxy env vars were not yet loaded
- **Fix:** moved import after dotenv.config()

## 019 | LLM | Retries, timeout, token budget
- **Stage:** Implementation
- **Action:** AbortSignal.timeout, exponential backoff retries (LLM_MAX_RETRIES/LLM_RETRY_DELAY_MS/LLM_REQUEST_TIMEOUT_MS in env schema), max_tokens 2000 -> 4000, real usage-based cost
- **Result:** FR-007 progress/errors/retries implemented
- **Note:** max_tokens 2000 truncated JSON for the longer prompt, causing parse failures

## 020 | PROMPT | Quality and realism
- **Stage:** Implementation
- **Action:** Forbidden placeholder phone patterns, ASCII-safe typography rule, distinct brand names, HTML escaping + dash normalization in site generator
- **Result:** Plausible German phone numbers (+49 30 24791356), valid UTF-8 output

## 021 | SECURITY | Secret leak remediation
- **Stage:** Security audit (NFR-002)
- **Action:** Found real OpenRouter key committed in server/.env.bak and server/start-test.cmd; removed from index and disk, added .gitignore rules for .env.bak, singbox/, *.exe, start-test.cmd
- **Result:** No tracked file contains the key (verified with git grep)
- **Note:** singbox/config.json contained VLESS credentials and was also untracked


## 2026-10-26 | SECURITY | Preserve history and redact historical OpenRouter credentials
- User explicitly authorized token removal while preserving all prior commits.
- Rewrote credential-bearing history; preserved all 10 commits, all 4 refs, commit messages, authors, dates and commit order. Commit IDs changed.
- Checkpoint be417c5 is now f72989e. Current HEAD tree and all current working files were verified unchanged.
- Expired old reflogs and pruned obsolete Git objects. Full remaining object scan: 186 blobs, zero matches for real OpenRouter key format.
- No GitHub push or deployment. Existing local runtime settings and user library were preserved. Previously exposed keys still require revocation by their owner.


## 2026-10-26 | RELEASE | Local GitHub preparation
- Removed verified empty root data/examples/templates directories. Preserved local proxy tools and archive under ignored .local/legacy-proxy; user library and server/.env untouched.
- Added GitHub Actions (Node 24.15, npm ci, typecheck, tests, build), .node-version and .editorconfig.
- README now explains full-history main/dev publication, unified IStorage, SQLite persistence, two Supabase migrations, Render Blueprint settings and remaining cloud checks.
- Verification: 61 tests in 15 files passed; both workspace typechecks and production build passed; diff whitespace check passed; original scope SHA-256 unchanged.
- No remote configured, push, cloud resources or paid generation. Cloud access and local-to-Supabase transfer remain unverified/unimplemented respectively.


## 2026-10-26 | GIT | Prepare dev publication
- User supplied https://github.com/icastingspells/makecom.git and requested keeping changes in dev, without publishing main.
- Configured origin; verified old dev was an ancestor of main, advanced dev to the existing checkpoint and switched to dev with all working changes preserved.
- Main remains at f72989e. Full sanitized history retained; documentation now targets dev publication.
