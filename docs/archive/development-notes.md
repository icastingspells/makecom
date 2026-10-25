# Архив разработки до 26.10.2026

Исторические документы. Не действующие инструкции; текущий порядок — ../work-plan.md.


---

## Источник: docs/agent-token-policy.md

# Agent Token Policy

## Reading
- Read only necessary documents and sections
- Use grep/search to locate specific content
- Prefer targeted reads over full document reads
- Reference requirements by ID (FR-001) not full text

## Writing
- Don't duplicate document content in instructions/reports
- Link to source documents
- Summarize, don't copy
- Keep logs factual and concise

## Research
- Save research results in docs; don't repeat without reason
- Limit alternatives to those affecting architecture/cost/security/complexity
- Use official docs when checking critical decisions

## Efficiency
- Batch related operations
- Update status after major phases
- Don't re-run same checks unnecessarily
- After 2 failed attempts on same issue, document blocker and move on

## Constraints
- Don't shorten critical requirements/checks for token savings
- Don't guess token usage without metrics
- Be precise, not verbose


---

## Источник: docs/agent-workflow.md

# Agent Workflow

## Cycle
1. **Select task** - Pick from implementation plan, respect dependencies, avoid blocked items
2. **Study context** - Read only relevant docs/sections (use IDs/references)
3. **Plan** - Break into steps, identify risks/checks
4. **Implement/Prepare** - Make minimal necessary changes
5. **Verify** - Run checks, validate against requirements
6. **Review** - Check security, consistency, no scope creep
7. **Record** - Update activity log, status
8. **Handoff** - Prepare for next session if stopping

## Stopping conditions
Stop and escalate if:
- Requirements contradict architecture
- Completion criteria impossible
- Substantial human decision needed
- Security risk identified
- Would implement business logic (in prep phase)

## Task execution rules
- Read scope-of-work and relevant docs first
- Don't duplicate requirements in code/comments
- Use IDs for traceability
- Validate assumptions are marked
- Check for secret leakage
- Version sites on card changes
- Enforce fact consistency

## Context management
- Grep before reading large files
- Reference sections by heading/ID
- Don't copy full docs into messages
- Summarize findings
- Follow token policy

## Error handling
- After 2 failed attempts on same issue, stop and document blocker
- Continue independent work
- Ask human only for blocking questions after exhausting independent tasks


---

## Источник: docs/architecture.md

# Architecture

## User amendments 2026-10-25 (supersede earlier proposals)
- Personal shared workspace. User OpenRouter key lives only in an encrypted HttpOnly session cookie, decrypted transiently by backend; no persisted server/env token. Separate SESSION_SECRET is required in production; APP_ACCESS_PASSWORD protects the personal app.
- Neural model generates HTML/CSS and descriptive translations under structured schema; server inserts exact core names/contact facts. Output is sanitized/validated and versioned; visual iframe preview is isolated. Translation semantics remain human-reviewed.
- Same-origin frontend/API on Render; dev Vite proxy. Direct outbound HTTPS by default, optional explicit OpenRouter-only proxy. Supabase implementation and migration are prepared; live cloud verification pending.
- Unification is deferred until feature completion; GitHub preparation follows it. Deployment details and limitations: docs/render-supabase-setup.md.

## 1. Goals
- Meet all FR/NFR from requirements
- Server-side only OpenRouter key management
- Deterministic fact source (company card JSON) for site generation
- Site versioning when card changes
- Static site export (ZIP)
- Extensible to 8 directions with shared facts
- Minimal complexity

## 2. Technology choices (proposed)

| Component | Choice | Rationale | Alternatives considered | Notes |
|-----------|--------|-----------|------------------------|-------|
| Runtime/Backend | Node.js + TypeScript + Express | Available (v24), simple, good for REST API, easy to integrate with OpenRouter HTTP API | Python/FastAPI, Go (not installed) | Minimal deps; easy to secure key server-side |
| Frontend | Vite + TypeScript | Fast dev, simple, can build static assets; easy to keep minimal | React/Vue/Svelte - more deps/complexity; vanilla fine for panel UI | Prefer simplest that meets needs |
| Storage (cloud) | **Supabase Postgres (JSONB) + Supabase Storage** | Reliable for Render/Railway, free tier available, JSONB fits canonical model, Storage for ZIPs | Render Disk (limited), files only (ephemeral) | Primary for deployment |
| Storage (local dev) | **File-based adapter** (JSON) | Easy local dev without external deps | SQLite | Swappable via storage interface |
| Templating (site gen) | Handlebars/EJS or simple string templates | For 3 pages, RU/DE, styling options - simple templating sufficient | Static site generators (11ty) - possible but adds complexity | Keep minimal; generate static HTML/CSS/JS files |
| ZIP export | `archiver` or `adm-zip` | Standard for packaging static site | Native zip if available | Upload to Storage or return to user |
| Validation | Zod | Type-safe schema validation for CompanyCore and modules | Ajv/jsonschema | Good with TS |

**Sources checked:** Node.js docs (general), Express docs patterns. No specific version constraints given in scope - use current compatible versions.

## 3. High-level architecture
```mermaid
graph TB
    UI[Web Panel UI] --> API[Express API Server]
    API --> OR[OpenRouter API]
    API --> Core[CompanyCore Service]
    Core --> Store[Storage Adapter]
    Store --> DB[(Supabase Postgres JSONB)]
    Store --> St[(Supabase Storage)]
    Store --> FS[(Local FS adapter)]
    API --> Gen[Generators]
    Gen --> Tmpl[Template Engine]
    Gen --> Val[Validators/Checks]
    API --> Export[ZIP Exporter]
```

### Components
- **API Server (server/):** Routes for company generation, site generation, library, config. Holds OpenRouter key in env/server config only.
- **Generators (server/generators/):** Company generator (calls OpenRouter with prompts), site generator (uses card facts + templates).
- **Validators (server/validators/):** FR-008 checks - cross-page consistency, phone/country, contradictions, i18n meaning, required fields, diversity.
- **Templates (server/templates/ or templates/):** HTML templates for 3 pages, RU/DE variants or i18n, styling/themes.
- **Storage (server/storage/):** CRUD for companies/sites/versions, JSON schema enforcement.
- **Frontend (client/):** Two-phase UI (A: company, B: site), library, preview, downloads.

## 4. Canonical Company Model (CompanyCore)

`CompanyCore` is the **single source of truth** for all generation. All modules read from it, none regenerate core facts.

```json
{
  "id": "uuid",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "inputs": { "brandName": "...", "country": "DE", "businessDirection": "...", "b2bServiceType": "...", "scale": "small|medium", "model": "..." },
  "identity": { "brandName": "...", "legalEntityName": "..." },
  "contacts": { "city": "...", "address": "...", "phone": "...", "email": "..." },
  "people": { "ceo": {"name": "...", "title": "...", "bio": "..."}, "heads": [{"name": "...", "title": "...", "bio": "..."}, {"name": "...", "title": "...", "bio": "..."}] },
  "business": { "history": "...", "specialization": "...", "targetAudience": "...", "clientProblem": "..." },
  "product": { "inputs": "...", "process": "...", "result": "...", "limits": "..." },
  "faq": [{"q": "...", "a": "..."}, {"q": "...", "a": "..."}, {"q": "...", "a": "..."}, {"q": "...", "a": "..."}, {"q": "...", "a": "..."}],
  "facts": { "factId": { "key": "...", "value": "...", "source": "core" } },
  "extensions": {},
  "meta": { "version": 1 }
}
```

### Fact Registry
Atoms facts (e.g. `legalEntityName`, `registeredAddress`, `contactPhone`) stored for cross-module validation.

### Module contract
- Modules may only read allowed fields from `CompanyCore`
- Must not regenerate `identity`, `contacts`, `people`
- Can add module-specific computed text/blocks
- Must store `snapshotHash` of `CompanyCore` at generation time

### Storage schema (Supabase)
- `companies_core` (id, core jsonb, facts jsonb, inputs jsonb, status, created_at, updated_at)
- `site_versions` (id, core_id, lang, style, storage_path, created_at)
- `company_modules` (id, core_id, module_key, payload jsonb, snapshot_hash, created_at) - for future 8 directions

## 5. Site structure and versioning
- Site generated from approved company card snapshot (facts frozen at generation time)
- Each generation creates new site version linked to companyId; old versions preserved
- Output: static files (HTML/CSS/JS/assets) packaged as ZIP
- No forms/server processing - static only
- nav, headings, metadata, favicon required

## 6. OpenRouter integration (security)
- API key read from server env/config only (e.g., `OPENROUTER_API_KEY`)
- Never sent to client, never written to generated site files, never logged
- **Model list:** Server proxies `GET https://openrouter.ai/api/v1/models`, caches 10-30 min, returns only `id/name/pricing/context_length` to client
- **Selection:** UI search/filter; whitelist fallback if API unavailable
- **Spend limit:** `OPENROUTER_SPEND_LIMIT_PER_OP_USD` in server config. Estimate cost before request using cached pricing; block if over limit. Track actual usage from response if available
- **Resiliency:** Error handling, limited retries (configurable)
- Saved results load without API calls
- All requests go through server proxy only

## 7. Consistency & diversity
- Single source of truth = `CompanyCore` (canonical)
- **Core snapshot** used for generation (immutable for that operation)
- **Cross-module validator** + **Joint validation** for multi-module sets
- **Fact Registry** ensures same facts used everywhere
- **Module contract** prevents core fact regeneration
- **Diversity:** vary history/specialization/team bios/target audience/product/FAQ - not just names/numbers
- Phone format should match country (DE patterns) - validate
- i18n: generate in RU/DE preserving meaning, facts unchanged

## 8. Extensibility (8 directions)
- Common fact store (company card) shared
- Modular generators/validators per direction
- Joint validation of final set
- Schema supports extension without breaking existing

## 9. Risks & mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Stack unclear | Med | Chose minimal proven stack with justification |
| Key leakage | High | Server-only, env config, no client exposure, audit exports |
| Fact drift | High | Snapshot card at site gen, versioning, validators |
| Non-diverse companies | Med | Diversity checks, varied prompts, validation |
| Cost overrun | Med | Spend limit per operation, cost tracking |
| i18n meaning loss | Med | Facts frozen, translation carefully controlled |

## 10. Sources
- OpenRouter API docs (general patterns) - to be verified during impl; key handling best practices
- Express.js docs
- Vite docs
- No specific constraints found in scope requiring different stack


---

## Источник: docs/card-workflow.md

# Карточки: параметры, утверждение и экспорт

Реализовано по FR-001/002/003/005/006. Реальную генерацию AI-сайта пользователь отложил до финальных проверок с аккаунтом с балансом.

## Создание
- В форме доступны направление бизнеса и тип B2B-сервиса: подсказки из каталога или собственный текст.
- «Случайно» заполняет отдельный параметр; «Случайные параметры» — все параметры компании. Модель и денежный лимит не меняются. Генерация автоматически не запускается.
- Функционально поддерживаются Германия и небольшой/средний масштаб. Другие страны и масштабы помечены «позже» и исключены из случайного выбора.
- Введённый/выбранный бренд передаётся точно. Если модель его изменит, результат не сохраняется; стоимость ответа остаётся в журнале. Каталог не проверяет названия по реестрам товарных знаков.

## Утверждение сохранённой версии
1. Откройте карточку из библиотеки и проверьте все тексты, контакты, телефон и смысловую согласованность.
2. При правках отметьте проверку фактов и сохраните изменения.
3. Для утверждения текущей сохранённой версии снова отметьте проверку фактов и нажмите «Утвердить карточку».

Утверждение сохраняет `meta.approval.version` и `approvedAt`. Версия содержимого при утверждении не увеличивается. Утвердить устаревшую версию нельзя (409); сохранение правок увеличивает версию и снимает утверждение. Несохранённые изменения в форме не утверждаются. Сохранение без изменений в интерфейсе не снимает утверждение.

Новые и старые карточки без текущего утверждения — черновики. На форме сайта они помечены и недоступны для выбора. Сервер проверяет утверждение до создания операции и запроса к модели. Это ручное подтверждение после структурных проверок, а не автоматическое доказательство смысловой непротиворечивости или соответствия телефона городу.

Предыдущие сайты не изменяются: их снимки и файлы можно просматривать и скачивать, даже если текущая карточка снова стала черновиком. Личное приложение использует общий доступ; отдельные роли утверждающих не введены.

## JSON
«Скачать JSON» экспортирует сохранённую версию, включая статус/дату утверждения, параметры, сведения компании и пересобранный реестр фактов. Можно экспортировать черновик. Перед скачиванием несохранённых правок интерфейс просит их сохранить.

Экспорт проходит через определённую схему компании; неизвестные поля и содержимое модулей/расширений не включаются (`extensions: {}`). Серверные ключи, cookie и параметры запросов не входят в экспорт. Импорт JSON в этой задаче не реализован.

API: `POST /api/core/:id/approve` с `{ expectedVersion, consistencyReviewed: true }`; `GET /api/core/:id/export` возвращает JSON attachment с `Cache-Control: no-store`. Оба действия не обращаются к OpenRouter.

Изменение схемы обратно совместимо: метаданные утверждения необязательны и хранятся внутри существующего JSON/JSONB, дополнительная миграция Supabase не требуется. Локальные мутации используют существующую блокировку карточки и проверку версии; текущая схема развёртывания предусматривает один экземпляр приложения.


---

## Источник: docs/CODE_STYLE_AND_RULES.md

# ПРАВИЛА НАПИСАНИЯ КОДА (ДЛЯ АГЕНТА)

## Общие принципы
- **Простота** - минимально необходимое решение. Без излишней абстракции.
- **Читаемость** - код должен быть понятен без глубокого погружения. Предпочтение явному перед хитрым.
- **Типизация** - строгий TypeScript там, где возможно. Избегать `any`. Использовать `unknown` с последующей проверкой.
- **Единый источник правды** - `CompanyCore` только читается модулями. Никакой регенерации core-фактов.
- **Безопасность** - ключи только на сервере. Никаких секретов в клиенте/экспорте/логах.

## Структура
- `server/src/core/` - Canonical Company Model, Fact Registry, Core Service
- `server/src/modules/` - модули генерации (пока только подготовка контрактов)
- `server/src/validators/` - схемы валидации, cross/joint validation
- `server/src/storage/` - адаптеры (file + supabase), интерфейс
- `server/src/services/` - openrouter, export, versioning
- `server/src/routes/` - роуты API
- `server/src/generators/` - генераторы (будут использовать только Core)
- `server/src/config/` - конфиг, валидация env

## Стиль кода
- **Именование** - понятные имена. Функции/переменные на английском, комментарии при необходимости на русском/английском, главное - понятно.
- **Функции** - маленькие, одна ответственность. Если функция сложная (> ~30 строк или нелогичная) - разбить.
- **Типы** - экспортируемые типы в `types.ts` рядом с модулем или в `core/types.ts`.
- **Константы** - в UPPER_SNAKE_CASE или обычные, в зависимости от контекста.
- **Импорты** - относительные там, где логично, без циклов.

## Комментарии
- **Только там, где сложно** - не комментировать очевидное (`i++` и т.п.)
- **Объяснять "почему", а не "что"** - если решение неочевидное, коротко объяснить причину
- **Для алгоритмов** - краткое пояснение шагов сложной функции
- **TODO** - только с понятным контекстом, без мусора

Пример:
```ts
// Validate core facts against module output to prevent cross-module contradictions
function validateAgainstCore(...) { ... }
```

## Обработка ошибок
- Явная обработка ошибок
- Понятные сообщения для API
- Никаких деталей секретов в ошибках

## Тестируемость
- Модули с минимальными зависимостями
- Легко мокать storage/openrouter

## Запрещено
- `any`
- Хардкод секретов
- Регенирация core-фактов модулями
- Логирование ключей/токенов
- Сложные "умные" однострочники в ущерб читаемости


---

## Источник: docs/development-setup.md

# Development Setup

## Prerequisites (verified)
- Node.js v24.15.0 (available)
- npm v11.12.1 (available)
- Python 3.15.1 (available)
- .NET SDK 10.0.401 (available)
- Git not initialized in repo (no .git) - greenfield

## Proposed project structure
```
makecom/
├── client/          # Vite + TS frontend
├── server/          # Express + TS backend
├── data/            # File storage (gitignored)
├── templates/       # Site templates (RU/DE)
├── docs/            # Documentation
├── examples/        # Two example companies/sites (deliverable)
├── .env.example     # Example config without keys
├── .gitignore
└── package.json     # Root workspace (optional)
```

## Environment variables
Required (server-side only):
- `OPENROUTER_API_KEY` - API key (never commit)
- `PORT` - Server port (default: 3000)
- `DATA_DIR` - Data directory (default: ./data)
- `SPEND_LIMIT_PER_OP` - Max spend per operation (TBD - needs value/logic)

See `.env.example` for template.

## Installation (proposed)
```bash
# Install dependencies
npm install  # in root or client/ and server/

# Setup env
cp .env.example .env
# Edit .env with your OpenRouter API key
```

## Development (proposed)
```bash
# Start dev servers
npm run dev  # or run client and server separately
```

## Testing (proposed)
```bash
npm run test        # unit tests
npm run lint        # linting
npm run typecheck   # TypeScript checks
```

## Build (proposed)
```bash
npm run build
```

## Notes
- Keys must never be committed or exposed to client
- `data/` directory must be gitignored
- No existing dependencies installed yet - this is preparation only
- Actual commands will depend on final package.json setup


---

## Источник: docs/DEVELOPMENT_STAGES.md

# ЭТАПЫ РАЗРАБОТКИ

Разработка будет идти поэтапно. Бизнес-логику генерации добавлю только после заложения механизмов согласованности.

## Этап 0: Скелет (Выполнен)
- [x] Структура папок
- [x] package.json (root/server/client)
- [x] tsconfig
- [x] .gitignore, .env.example
- [x] Базовые заглушки
- [x] Git init, ветки main/dev, первый коммит

## Этап 1: CompanyCore и Fact Registry
**Цель:** Единый источник правды

**Задачи:**
- [ ] `server/src/core/types.ts` - типы CompanyCore, Fact, CoreSnapshot
- [ ] `server/src/core/fact-registry.ts` - реестр атомарных фактов
- [ ] `server/src/core/company-core.ts` - сервис работы с CompanyCore
- [ ] `server/src/core/index.ts` - экспорт

**Критерии готовности:**
- Типы описывают identity/contacts/people/business/product/faq/facts/extensions
- Fact Registry позволяет добавлять/получать факты
- Нельзя модифицировать core-факты через модули (только чтение)

## Этап 2: Storage Layer
**Цель:** Абстракция хранения с поддержкой file и supabase

**Задачи:**
- [ ] `server/src/storage/types.ts` - интерфейс IStorage
- [ ] `server/src/storage/file-adapter.ts` - файловый адаптер для локальной разработки
- [ ] `server/src/storage/supabase-adapter.ts` - адаптер для Supabase (заглушка с TODO, без реальных ключей)
- [ ] `server/src/storage/index.ts` - фабрика выбора адаптера по env

**Критерии готовности:**
- Единый интерфейс для компаний/версий/модулей
- Переключение через `STORAGE_DRIVER`
- Работает с CompanyCore

## Этап 3: Валидаторы (Core + Cross-module)
**Цель:** Механизмы согласованности

**Задачи:**
- [ ] `server/src/validators/core-schema.ts` - Zod схема CompanyCore
- [ ] `server/src/validators/core-validator.ts` - базовая валидация
- [ ] `server/src/validators/cross-module.ts` - проверка соответствия модуля core
- [ ] `server/src/validators/joint.ts` - совместная валидация комплекта
- [ ] `server/src/validators/index.ts`

**Критерии готовности:**
- Валидация обязательных полей
- Проверка отсутствия регенерации core-фактов
- Совместная проверка работает

## Этап 4: Module Contracts и базовая инфраструктура
**Цель:** Фундамент под будущие модули

**Задачи:**
- [ ] `server/src/modules/types.ts` - интерфейс модуля, контракт
- [ ] `server/src/modules/registry.ts` - реестр модулей
- [ ] `server/src/config/env.ts` - валидация env
- [ ] `server/src/services/openrouter.ts` - прокси + кэш моделей + оценка стоимости + лимит (заглушки)

**Критерии готовности:**
- Модуль может только читать из Core
- OpenRouter сервис готов к интеграции с лимитом
- Env валидируется

## Этап 5: Базовые роуты и интеграция
**Цель:** Минимальный API каркас

**Задачи:**
- [ ] `server/src/routes/health.ts`
- [ ] `server/src/routes/core.ts` - работа с CompanyCore
- [ ] `server/src/routes/models.ts` - прокси моделей OpenRouter
- [ ] Подключить роуты в `index.ts`

**Критерии готовности:**
- Health работает
- Базовые эндпоинты отвечают
- Интеграция с Core/Storage

## Текущий фокус
**Сейчас:** Этап 1 - CompanyCore и Fact Registry

## Правила работы по этапам
1. Делаем только текущий этап
2. Пишем читаемый код с комментариями в сложных местах
3. Следуем `docs/CODE_STYLE_AND_RULES.md`
4. Не трогаем бизнес-логику генерации до завершения Этапов 1-4
5. После каждого этапа - краткий коммит в текущей ветке


---

## Источник: docs/generation-operations.md

# Генерации, расходы и лимиты — FR-007, P5-002/P5-003

Реализован приоритетный этап 6 из согласованной очереди работ. Остальные функциональные этапы, общая унификация и подготовка GitHub не начаты в рамках этой задачи.

## Интерфейс
- На формах компании и сайта доступны поиск моделей, переключаемый фильтр «Только бесплатные» (выключен по умолчанию) и денежный лимит операции. Платные модели остаются доступны.
- Серверный максимум задаёт `OPENROUTER_SPEND_LIMIT_PER_OP_USD` (по умолчанию $0.10). Пользователь может снизить лимит, включая $0; превысить серверный максимум нельзя.
- Показаны реальные стадии: предварительная проверка, ожидание модели, повтор, валидация, сохранение, завершение. Это не поток текста и не выдуманный процент выполнения.
- «История и расходы» сохраняет операции компании/сайта, модель, статус, попытки, токены, лимит и стоимость. Успешная карточка открывается из истории. Предыдущие расходы до появления журнала автоматически не восстанавливаются.
- На странице подключения есть ручная проверка квоты через `/api/v1/key`. Денежный остаток относится к лимиту конкретного ключа, а не обязательно ко всему балансу аккаунта. Если OpenRouter не сообщает квоту, интерфейс показывает отсутствие данных.

## Учёт
- `usage.cost` — подтверждённая провайдером стоимость; сумма нескольких полученных ответов сохраняется до последующей проверки JSON/фактов. Поэтому отклонённый приложением ответ тоже учитывается.
- При отсутствии `usage.cost` и наличии токенов сохраняется отдельная оценка по тарифу. Сетевой сбой/таймаут означает неизвестную стоимость, а не нулевую. Неизвестные и оценочные попытки помечают общий итог как неполный.
- До каждого запроса резервируется консервативная оценка входа (байты сериализованного запроса + запас) и максимального выхода. Неизвестная предыдущая попытка резервирует эту оценку целиком. При недостатке бюджета повтор запрещается.
- `provider.max_price` ограничивает тарифы выбранной модели; стоимость токенов переводится из каталога USD/token в USD/million tokens. У бесплатного запроса все тарифные пределы нулевые. Автоматического перехода на платную модель нет.
- Это прикладной контроль оценочного бюджета, а не банковская гарантия списания: окончательный биллинг определяет OpenRouter. Для дополнительного жёсткого ограничения используйте денежный лимит ключа у OpenRouter.
- Максимум попыток берётся из `LLM_MAX_RETRIES` (здесь это общее количество попыток, не число дополнительных повторов), ограничен 1–5. Учитывается `Retry-After`; ожидание свыше 15 секунд останавливает автоматические повторы. При 429 без интервала повторов нет, чтобы не расходовать дневную квоту.

## Хранение и API
- `GET /api/operations`, `GET /api/operations/:id`, `GET /api/operations/limits`, `GET /api/operations/quota`.
- Генерации сохраняют прежние POST endpoints; опциональные заголовки: `X-Operation-Id` (UUID v4), `X-Operation-Budget` (USD), `X-Free-Only` (состояние фильтра).
- Журнал создаётся до обращения к модели; недоступность хранилища не допускает новый оплачиваемый запрос. Повторное использование ID отклоняется.
- Локально: `DATA_DIR/operations/*.json` с атомарной записью. Supabase: приватная таблица `generation_operations`; применить обе SQL-миграции по порядку. Реальная облачная проверка пока не выполнена.
- Журнал не содержит ключей, cookie, промптов, текстов компании, сырых ответов или ошибок провайдера. Учёт общий для подтверждённого пользователем личного приложения. API защищён существующими Basic auth/same-origin правилами.
- После перезапуска незавершённые операции читаются как прерванные. Автоматического возобновления или повторного списания нет. Стоимость ожидавшей попытки может остаться неизвестной; сверка с Activity OpenRouter остаётся ручной.

## Бесплатные модели: проверено 25.10.2026
Для тестирования текущего структурированного генератора подходит `nvidia/nemotron-3-super-120b-a12b:free`: каталог сообщает structured_outputs и достаточный предел выхода. Полная успешная генерация сайта этой моделью в этой задаче не проверялась.

Бесплатный тариф не безлимитен: 20 запросов/минуту и 50/день; после покупки не менее $10 кредитов — до 1000/день. Ошибочные попытки тоже расходуют дневную квоту, доступность конкретного провайдера не гарантирована. Фильтр учитывает нулевые prompt/completion/request тарифы и необходимые возможности модели, включая длину ответа.

Источники:
- https://openrouter.ai/pricing
- https://openrouter.ai/docs/api-reference/limits
- https://openrouter.ai/api/v1/models
- https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free
- https://openrouter.ai/docs/guides/routing/provider-selection
- https://openrouter.ai/docs/cookbook/administration/usage-accounting


---

## Источник: docs/implementation-plan.md

# Implementation Plan

## User sequencing amendment 2026-10-25
- 2026-10-26: user deferred real paid website generation verification to the final checks after connecting an account with balance. Continue independent feature work without billable calls. Catalog/input stage (FR-001/P2-001/P2-003) and card approval/JSON export (FR-002/003/005/006, P4-004) are now implemented locally. Remaining priorities: content completeness/validation, diversity and cross-module checks, handover examples/docs, then final unification/GitHub preparation; no deployment authorized.
- Priority amendment: user requested agreed stage 6 (costs/history/budgets/progress; P5-002/P5-003, FR-007) before the other remaining feature stages. Implemented locally; details and limits in docs/generation-operations.md. Free-only model selection is an optional filter, off by default; paid accounts/models remain supported.
- Current work extends site generation to neural HTML/CSS/translation, preview, session-only user credentials and personal Supabase/Render preparation. Current status: docs/project-status.md.
- Complete functional verification before final code unification. Start GitHub preparation only after unification. Do not provision/deploy external resources as part of preparation.

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


---

## Источник: docs/initialization-report.md

# Initialization Report

## Status: PARTIAL

## Summary
Prepared project structure, formalized requirements, designed architecture, created plan and agent instructions. No business logic implemented. No existing user data modified.

## Artifacts created
### Requirements & Analysis
- docs/requirements.md (FR-001..010, NFR-001..005, assumptions, blockers, gaps, traceability)

### Architecture & Design
- docs/architecture.md
- docs/adr/0001-stack-choice.md
- docs/adr/0002-storage.md

### Planning
- docs/implementation-plan.md

### Environment & Quality
- docs/development-setup.md
- docs/quality-and-operations.md

### Agent Instructions & Context
- AGENTS.md
- docs/agent-workflow.md
- docs/agent-activity-log.md
- docs/agent-token-policy.md
- docs/project-status.md
- docs/session-handoff.md

### This report
- docs/initialization-report.md

## Checks performed
- [x] scope-of-work.md read completely
- [x] Requirements formalized with unique IDs
- [x] Assumptions and blockers documented
- [x] Architecture proposed with justification
- [x] Plan covers all known requirements
- [x] Agent instructions created
- [x] Activity log has factual entries
- [x] Token policy created
- [x] Environment/QA docs prepared
- [x] No business logic implemented
- [x] No secrets added
- [x] No destructive operations
- [x] No existing user files modified

## Unverified / Pending
- [ ] Stack approval (proposed Node/TS + Express + Vite + file JSON) - NOT VERIFIED
- [ ] Storage approval - NOT VERIFIED
- [ ] Spend limit value/logic - NOT VERIFIED
- [ ] Model selection UX details - NOT VERIFIED
- [ ] Catalog contents - NOT VERIFIED
- [ ] Diversity definition (FR-008) - NOT VERIFIED
- [ ] Joint validation for 8 directions - NOT VERIFIED
- [ ] Actual dependency installation - NOT VERIFIED (no deps installed)
- [ ] Lint/test setup - NOT VERIFIED
- [ ] Docker/CI - NOT VERIFIED (not justified yet)

## Risks
- **HIGH:** API key leakage if not enforced server-side strictly
- **HIGH:** Fact drift between card and site if not versioned/validated
- **MED:** Non-diverse companies if diversity checks weak
- **MED:** Cost overrun without spend limits
- **MED:** Extensibility harder if schema not designed well

## Open questions for human
See docs/requirements.md §5 and docs/session-handoff.md

## Recommendation
Review proposed architecture and answer open questions. Then proceed with Phase 0 scaffolding. Do not start business logic until security/consistency mechanisms are in place.


---

## Источник: docs/project-status.md

# Project Status

## Update 2026-10-26: catalogs, approval and company JSON export
- FR-001: catalog endpoint/UI with brand, direction, B2B service, supported country/scale random selection; manual direction/service entries supported. UI includes 10 countries/5 scales but only DE/small/medium can generate. Exact supplied brand enforced; changed brand causes explicit failure before card save, costs retained.
- FR-002/003/005: persisted approval of a specific saved revision, date and manual fact-review confirmation. Any subsequent saved edit clears approval. Legacy/new cards without approval are drafts; site API rejects them before operation/model request. Old site versions remain available.
- FR-006/P4-004: JSON download from card editor and GET /api/core/:id/export. Export uses defined company schema, fresh facts and empty extensions; no request credentials, unknown fields or module payloads included. Draft export allowed, unsaved UI edits must be saved first.
- Verification: 55 tests across 13 source files pass; full build and both typechecks pass. Isolated browser QA verified random parameters/exact brand in preceding catalog step, plus draft/approval/reload/JSON download/edit-reset and disabled draft selection now. No real API calls or user card changes; QA servers/tabs stopped/closed.
- User explicitly deferred final real AI generation verification until an account with balance is connected. Other outstanding gaps: home benefits/content checks, semantic/diversity validation, meaningful cross-module/joint rules, examples/docs, live Supabase/Render checks. Unification/GitHub preparation remain later work.

## Update 2026-10-25: priority stage 6 (FR-007)
- User reordered remaining work: P5-002/P5-003 expenses/history, budgets and progress implemented first. Optional free-model filter is OFF by default; paid models/accounts remain supported.
- Persistent metadata-only file/Supabase journal: stages, attempts, tokens, reported vs estimated vs unknown charges, failed-output billing, interruption status on restart. No keys/prompts/provider bodies in journal.
- User budget capped by server maximum, conservative reserves for unknown attempts, provider tariff caps, bounded retries and Retry-After/429 handling. Connection page supports key/free-request quota check.
- Verification: 51 source tests in 12 files, full build and server/client typechecks pass. Isolated browser QA: free filter, mock company creation/edit/save, mock site generation/preview, history reload and quota UI. No billable calls/live Supabase/Render.
- Own faulty main.ts scripted replacement was recovered from captured session source/patch history before applying scoped changes. Editor serialization preserved; browser editor save and preview verified after recovery.
- Exact behavior/limits: docs/generation-operations.md. Prior audit cost/progress gaps superseded; other feature gaps and successful final live AI site generation remain open. Unification and GitHub prep still deferred.


## Update 2026-10-25: compliance review
- Full section-by-section audit of scope-of-work.md: docs/scope-audit-2026-10-25.md. Requested state-of-work.md does not exist.
- Findings were not fixed per user instruction. Missing/partial items include catalog/random selection, business-direction/service-type UI, persisted approval state, JSON card export, home-page benefits, enforced headings/adaptivity, semantic/diversity/joint validation, complete cost/progress UX and handover examples/docs.
- Lower connection status now displays a green dot while a session key is present, removed on disconnect. This is not a live API validity check. Frontend build/types and isolated browser indicator test passed.

## Update 2026-10-25: local proxy origin fix
- Fixed false Cross-site requests are not allowed errors for session connection and company generation: Vite now preserves frontend Host (changeOrigin=false).
- API same-origin and cross-site checks remain active. Live localhost/127.0.0.1 requests verified; regression tests use an actual Vite proxy. 41 source tests and full build pass.

## Update 2026-10-25: AI websites, preview, session keys and cloud preparation
- FR-003/FR-007 amended by user: model-generated HTML/CSS and translated text, canonical immutable names/contact tokens, structured output and safe HTML/CSS processing. Real failures never fall back silently to the template; explicit mock mode is labelled.
- Visual preview for new and saved site files, three-page navigation and mobile-width toggle, separate source/ZIP access.
- OpenRouter credential entered on Connection page; encrypted HttpOnly/SameSite=Strict session cookie, Secure in production. No stored server/env credential fallback. Legacy entry removed from local server/.env without exposing value. SESSION_SECRET is a separate encryption secret.
- Personal/shared library confirmed by user. Production uses Basic auth; same-origin app/API and local Vite proxy; private Supabase Postgres/Storage adapter plus SQL migration and Render blueprint prepared. No external resources/deployment created.
- Direct native Node and curl public API checks both HTTP 200 without sing-box. Direct is default; optional OPENROUTER_PROXY_URL affects only provider traffic. Historical root cause and Render reachability are not established.
- Deferred explicitly: code unification at the end, GitHub preparation only after unification.
- Current checks: 38 distinct source tests pass, including Secure-cookie production behavior; build/client types pass; browser isolated mock test verifies preview/navigation/mobile and key-cookie save/reload/delete. Older test counts included compiled dist duplicates; Vitest now scans source only.
- Remaining verification: live AI generation after final schema/CSS/session changes; actual Supabase migration/adapter and Render deployment/networking. Translation semantics still require manual review. See docs/render-supabase-setup.md.

## Update 2026-10-25: UX/UI
- Restrained graphite/light workspace with clear navigation and responsive forms.
- Editor organized into Russian-labeled sections with section navigation, FAQ and save/review area; leaving unsaved edits prompts for confirmation.
- Library search/count and compact cards; generation result offers direct editor navigation; site UI hides internal IDs and collapses source details.
- Verified frontend build/client types and browser desktop/mobile flows, no horizontal overflow or console errors. Server-side fact/validation/version logic unchanged in this UI work.

## Update 2026-10-25: manual editing and model search
- FR-002/FR-006: separate card page from library, persistent edits including FAQ, server validation, revision conflicts and canonical fact rebuild.
- New site versions store snapshot and HTML; editor offers version ZIP downloads. Old records without files cannot supply an archive.
- FR-007: search by model name/ID across the full returned list.
- FR-008 remains partial: structural/blank/template/DE phone checks are automated; semantic contradictions and city/phone agreement require explicit human review before saving.
- Verified: 33 tests passed, client build and client/server typechecks, browser editor and search/no-match state.

## Current phase
Local MVP completion and cloud preparation. Main panel/card/version flows work; neural website generation is implemented and locally tested but still needs a successful live smoke run after final changes. Cloud resources are not provisioned. The latest updates above supersede older checklist details below.

## Completed
- [x] A: Requirements formalized (docs/requirements.md) with IDs, traceability, assumptions/blockers
- [x] B: Architecture designed (docs/architecture.md), ADRs created
- [x] C: Implementation plan created (docs/implementation-plan.md)
- [x] D: Development setup and quality/ops docs created
- [x] E: Agent instructions (AGENTS.md, agent-workflow.md) created
- [x] F: Activity log, token policy, status, handoff, initialization report created
- [x] Phase 0: Project scaffolding (P0-001..P0-004) - repo structure, package.json, .gitignore, .env.example
- [x] Phase 1: Core infrastructure (P1-001..P1-005)
  - Config management (server) with env validation
  - File storage layer (CRUD for companies/sites/versions)
  - Company schema & validation (Zod)
  - OpenRouter client (server-only, model list, generation, retries, cost tracking, spend limit, mock mode)
  - Basic API routes (health, models, core, site)
- [x] Phase 2: Company generation (A) - mostly done
  - P2-002 Company generator: real LLM via OpenRouter, strict Zod validation
  - P2-003 Company UI: generation form, full card editor, library grid, card->editor navigation
  - Remaining: P2-001 catalogs, P2-004 automated diversity validation
- [x] Phase 3: Site generation (B) (P3-001, P3-002, P3-003)
  - Templates for 3 pages (RU/DE) with nav, meta, favicon
  - Site generator from CoreSnapshot, fact-only, HTML escaping + Unicode normalization
  - Site UI: company select, lang/style, file preview, ZIP download
- [x] P5-003: Error handling & retries - timeout, exponential backoff, clear errors
- [x] P5-002: Spend limits & cost tracking - per-operation limit enforced, usage-based cost

## In progress
- Phase 4: Library, versioning, export (P4-001..P4-004)
  - P4-001 Library UI: done (card grid, editor) - needs site version list per company
  - P4-002 Versioning logic: backend done (versions preserved, verified 2 versions) - needs UI
  - P4-003 ZIP export: done client-side (JSZip)
  - P4-004 JSON export (company): not implemented

## Blockers/Open questions
- B-001: **RESOLVED** - Stack: Node/TS + Express + Vite (ADR-0001)
- B-002: **RESOLVED** - Storage: file-based JSON in data/ (ADR-0002)
- B-003: **RESOLVED** - Model selection UX: fetched from OpenRouter /api/models, cached 30 min
- B-004: **RESOLVED** - Spend limit: 0.10 USD per operation, configurable via env
- G-001: **PENDING** - Catalog for random values (DE/small/medium) not yet implemented
- G-002: **PENDING** - Automated diversity validation (FR-008) - manual verification done, needs code
- G-003: Joint validation for 8 directions - architecture exists, details TBD
- **RESOLVED** - OpenRouter key was not blocked; it was a Cloudflare TLS-fingerprint block on Node's native fetch. Fixed with undici ProxyAgent + local sing-box HTTP proxy. Real generation verified working.

## Key decisions
- ADR-0001: Node.js + TypeScript + Express + Vite, file storage
- ADR-0002: File-based JSON storage in data/
- CompanyCore as single source of truth with Fact Registry, CoreSnapshot (sha256)
- Module contracts, cross-module validation, joint validation for 8-direction extensibility
- Keys server-side only; MOCK_LLM mode for testing without API key
- Outbound HTTP via undici ProxyAgent when HTTP_PROXY/HTTPS_PROXY set (no-op otherwise)

## Next specific action
1. P4-002/P4-001: Site version list UI per company + download of a specific version
2. P4-004: JSON export of a company card
3. P2-001: Catalogs for random values
4. P2-004: Automated diversity validation
5. P5-001: Full key/security audit re-run + P5-004 two examples
6. P6: Schema doc, extensibility review


---

## Источник: docs/PROJECT_FLOW_EXPLAINED.md

# КАК РАБОТАЕТ ПРОЕКТ (от входных данных до архива)

## Кратко
Проект строится вокруг **Canonical Company Model (CompanyCore)** - единого источника правды. LLM используется только для генерации карточки компании. Сайт генерируется исключительно из согласованного `CompanyCore` через снапшот.

## Поток работы

### Фаза А. Создание карточки компании
1. **UI** - ввод параметров (страна/масштаб и др.), выбор модели
2. **Серверный прокси OpenRouter** - ключ только на сервере, проверка лимита расходов перед запросом
3. **Генерация по схеме** - ответ должен соответствовать `CompanyCoreSchema`
4. **Валидация** - `CoreValidator` проверяет обязательные поля
5. **Сборка CompanyCore + Fact Registry** - формируется каноническое ядро
6. **Сохранение** - через `IStorage` (file/supabase)

### Фаза Б. Создание сайта
1. **Выбор компании** - берём сохранённый `CompanyCore`
2. **CoreSnapshot** - создаётся копия + `sha256` хеш. Работаем только со снапшотом
3. **Генерация по шаблону** - 3 страницы (Главная/Продукт/Компания и контакты), RU/DE
4. **Кросс-валидация** - проверка что не перегенерированы `identity/contacts/people`
5. **Рендер статики** - HTML/CSS/JS/favicon
6. **Упаковка в ZIP** - `archiver`
7. **Сохранение версии** - `site_versions` с привязкой к `core_id`. Старые версии сохраняются

## Ключевые механизмы
- **Single Source of Truth** - только `CompanyCore`
- **Fact Registry** - атомарные факты для валидации
- **CoreSnapshot** - неизменяемый снапшот на момент генерации
- **Module Contract** - модули читают только разрешённые поля, не трогают core
- **Cross-module + Joint validation** - защита от противоречий
- **Server-side key** - OpenRouter ключ никогда не уходит на клиент

## Почему CompanyCore первым
Чтобы заложить согласованность сразу. Для расширения до 8 направлений важнее всего зафиксировать **правила чтения**, а не писать генераторы. Так мы избежим глобальной переделки при добавлении новых модулей.

## OpenRouter: когда и как тестировать
- **Сейчас** - можно полноценно тестировать без OpenRouter через мок-режим и юнит-тесты
- **К подключению** - после завершения Этапа 4 (настройка `services/openrouter.ts`: прокси, кэш моделей, оценка стоимости, лимит)
- **Бесплатные модели** - подойдут для реального теста, но сначала лучше отладить флоу на моке
- **Рекомендация** - мок -> полный прогон до ZIP -> подключение бесплатной модели OpenRouter с лимитом


---

## Источник: docs/quality-and-operations.md

# Quality and Operations

## Testing strategy
| Level | Scope | Tools (proposed) | When |
|-------|-------|------------------|------|
| Unit | Generators, validators, storage, utils | Vitest/Jest | On changes |
| Integration | API routes, OpenRouter client (mocked) | Vitest + supertest | On API changes |
| E2E/Manual | Two-phase flow, versioning, exports | Manual checklist | Before deliverable |
| Validation | FR-008 consistency checks | Automated validators | On generation |

## Definition of Ready (proposed)
- Requirements clear, acceptance criteria defined
- Dependencies identified
- Security considerations reviewed (key handling)
- Tests planned

## Definition of Done (proposed)
- Code implemented per architecture
- Tests pass
- Lint/typecheck pass
- No secrets in code/logs/exports
- Fact consistency validated
- Versioning works correctly
- Documentation updated

## Security checks
- [ ] API key only in server env, never client-side
- [ ] No key in generated site files/exports/logs
- [ ] Spend limits enforced
- [ ] Input validation on all endpoints
- [ ] No secrets in repo (.gitignore covers .env, data/)
- [ ] Error messages don't leak keys

## Observability
- **Logging:** Server logs for generation steps, errors (no sensitive data). Log levels configurable.
- **Metrics:** Generation counts, success/failure, costs (if tracked), retries - keep minimal.
- **Monitoring:** Not specified; basic health check endpoint sufficient for now.

## Operations
- **Backup:** `data/` directory contains all companies/sites/versions - backup this
- **Restore:** Copy data/ back
- **Rollback:** Versioning supports accessing previous site versions
- **Config:** Environment-based, no hardcoded secrets

## Unverified items
- Spend limit exact value/logic (needs decision)
- Exact OpenRouter cost tracking API/method
- Catalog contents details
- Diversity threshold definition


---

## Источник: docs/render-supabase-setup.md

# Personal workspace: Supabase / Render preparation

Preparation only: no cloud resources or deployment created. User requested code unification at the end, then GitHub preparation. Neither has started.

## Architecture
- Server serves built frontend and API from one origin; Vite proxies /api locally. No hardcoded localhost API in the browser.
- Production personal/shared library uses HTTP Basic auth (any username, APP_ACCESS_PASSWORD as password). Render provides HTTPS.
- OpenRouter user key is entered on the Connection page and retained only in an AES-GCM encrypted HttpOnly/SameSite=Strict session cookie (Secure in production, no Max-Age). Server decrypts transiently per provider request; no env-key fallback, DB, files, localStorage or credential logging.
- SESSION_SECRET is a separate server encryption secret, not the OpenRouter credential. In dev, absent secret means sessions expire on restart. Browser session restoration is governed by the browser.
- Supabase: canonical cards and snapshots/metadata in Postgres; immutable JSON file bundles in private Storage. Only the server receives the service-role key. Library/preview/ZIP reads saved output without regeneration.
- Single Render instance; multi-instance scaling needs database-level conditional revision writes.

## Steps after unification and GitHub preparation
1. Create Supabase project; apply both SQL files in supabase/migrations in order (202610250001_personal_workspace.sql, then 202610250002_generation_operations.sql). RLS is enabled, anon/authenticated grants revoked; sites bucket is private, generation_operations stores only operation metadata. Match SUPABASE_BUCKET to the bucket name.
2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only in Render's server environment. Do not put service-role credentials in the browser or chat.
3. Use render.yaml: build npm ci --include=dev && npm run build; start npm run start -w server; health /health; one instance; STORAGE_DRIVER=supabase, MOCK_LLM=false. Application data does not depend on Render's ephemeral disk.
4. Set APP_ACCESS_PASSWORD (16+ characters); Render generates SESSION_SECRET (32+). APP_BASE_URL defaults to RENDER_EXTERNAL_URL when available. Do not set OPENROUTER_API_KEY.
5. Enter user key in the app. Check generation, translation, preview, ZIP, old versions and persistence across restarts. Local file data is not migrated automatically.

## Networking
- Direct HTTPS is the default, with no sing-box dependency. Application code does not consume generic HTTP_PROXY/HTTPS_PROXY.
- Optional OPENROUTER_PROXY_URL applies only to OpenRouter, never Supabase or local traffic.
- Measurement 2026-10-25 on current computer: native Node direct public models request returned HTTP 200 (~507 ms), curl without proxy HTTP 200 (~646 ms). This proves current public endpoint reachability, not the cause of older failures or authenticated/provider reachability from Render.
- Later diagnostic: native fetch timed out once while explicit undici/curl succeeded; immediate repeat returned HTTP 200 for all three (native ~1226ms, undici ~245ms, curl ~1366ms). The native timeout was not persistent; no blanket Node.js prohibition or confirmed regional cause can be inferred.
- Run node server/scripts/check-openrouter.mjs from repository root on each environment. It compares native fetch, undici and curl without credentials. Check one authenticated generation from Render before deciding whether a proxy is needed. Do not infer regional restrictions or Node/TLS filtering from an isolated 403.

## Verification and limits
- Builds/types pass. Tests cover encrypted cookie/tampering/session headers, generation safety, immutable facts/numbers, snapshots, persistence and mocked Supabase upload/download/cleanup. Browser preview navigation/mobile size and cookie save/reload/delete verified on isolated mock server with fake key; actual user cards untouched.
- Real AI smoke requests before cookie migration were rejected for CSS/translation validation. Strict output schema and AST CSS cleanup are now locally tested. Successful real end-to-end generation after these changes remains unverified; paid retries were stopped under repository workflow. Real-mode failure is explicit, no template fallback.
- Translation semantics need human review; structural/numeric checks do not prove meaning.
- Supabase migration/adapter unverified against a live project; Render deployment/networking unverified.
- undici was updated from 8.5.0 to 8.12.3 to address existing advisories. npm audit after installation reports 0 vulnerabilities. No force-update was used; optional proxy operation still needs verification if enabled in deployment.

## References
- https://render.com/docs/deploy-node-express-app
- https://supabase.com/docs/guides/api
- https://supabase.com/docs/guides/storage/uploads/standard-uploads
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/docs/cookbook/administration/usage-accounting


---

## Источник: docs/requirements.md

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
- **Implementation update 2026-10-26:** catalog/random UI and direction/service inputs implemented; future country/scale options explicitly disabled. Supplied brand is exact and checked before saving. Catalog suggestions are project defaults; manual direction/service values remain allowed (G-001 narrowed for phase one).
- **Source:** scope-of-work §3.1
- **Normalized:** Panel must accept inputs (brand name, country, business direction, type of B2B service, company scale, OpenRouter model). User can specify values or pick random from catalog.
- **Priority:** P0
- **Acceptance:** For phase 1, only Germany and two scales (small/medium) must be supported functionally. Catalogs: **10 country options** (UI), **5 scale options** (UI). Random selection available. Business direction/type of B2B service deferred to later if needed.
- **Dependencies:** FR-002, NFR-001
- **Verification:** Manual test - try explicit and random for Germany/small/medium from catalogs.

### FR-002: Company card fields
- **Implementation update 2026-10-26:** approval is persisted for the current saved version in meta.approval; edit clears it. Approval requires manual fact-review confirmation and structural/phone/empty-field checks. Older cards remain drafts until reviewed.
- **Source:** scope-of-work §3.2
- **Normalized:** Generate/save brand name, legal entity name, city/address/phone/email, CEO + 2 department heads, names/positions/short professional bios, foundation history/specialization, target audience/client problem, product description (inputs/process/result/limits), 5 Q&A pairs.
- **Priority:** P0
- **Acceptance:** Card supports view/edit/save. All stored as structured JSON (schema proposed by implementer).
- **Dependencies:** FR-001
- **Verification:** Inspect saved card JSON has all fields; edit persists.

### FR-003: Site generation inputs
- **User amendment 2026-10-25:** neural model generates HTML/CSS and translates descriptive card text into the selected language. Pinned names/legal identity/address/contacts remain exact. Visual preview required alongside files/ZIP. No silent template fallback in real mode.
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
- **Implementation update 2026-10-26:** card JSON export implemented via /api/core/:id/export; defined canonical fields/fresh facts only, extensions empty. Draft export allowed. Site generation requires approved current revision; old versions remain accessible.
- **Source:** scope-of-work §3.4
- **Normalized:** Panel must show list of companies, view/edit each, create site for selected company, list of site versions per company/context, preview site, download company as JSON, download site as ZIP. Changing card must not silently change existing site - new version created on re-generation.
- **Priority:** P0
- **Acceptance:** All listed actions available; old site versions preserved when card edited and new site generated.
- **Dependencies:** FR-002, FR-003
- **Verification:** Edit card, generate new site version - old version still accessible.

### FR-007: OpenRouter integration
- **User amendment 2026-10-25 (supersedes env key):** user enters OpenRouter key in a separate UI field; only an encrypted HttpOnly session cookie retains it. No persisted server/env/DB key. Transient decryption for provider requests is allowed. SESSION_SECRET is a separate server encryption secret.
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


---

## Источник: docs/RUN_INSTRUCTIONS.md

# ИНСТРУКЦИЯ ПО ЗАПУСКУ

## Требования
- Node.js 24 (проверено на v24.15.0)
- npm 9+

## Установка
```bash
npm install
```

## Настройка
При первом запуске скопируй `server/.env.example` в `server/.env`:
```bash
cp server/.env.example server/.env
```

Минимальная конфигурация для локальной разработки:
```env
PORT=3000
STORAGE_DRIVER=file
DATA_DIR=./data
MOCK_LLM=true
APP_BASE_URL=http://localhost:3000
```

Для реальной генерации включи этот режим, затем добавь ключ на странице «Подключение» в приложении:
```env
MOCK_LLM=false
OPENROUTER_SPEND_LIMIT_PER_OP_USD=0.10
```

### Работа через HTTP-прокси

По умолчанию запросы идут напрямую, без sing-box. Только если прямая связь не работает, можно явно задать прокси для OpenRouter:

```env
OPENROUTER_PROXY_URL=http://user:pass@host:port
```

Прокси применяется только к OpenRouter, не к Supabase и локальным адресам. Общие HTTP_PROXY/HTTPS_PROXY кодом приложения не используются.

Проверка прямой связи без ключей: `node server/scripts/check-openrouter.mjs` из корня репозитория. Подготовка Render/Supabase описана в `docs/render-supabase-setup.md`.

## Запуск в режиме разработки
```bash
npm run dev
```
- Сервер: http://localhost:3000
- Клиент: http://127.0.0.1:5173

## Запуск по отдельности
```bash
# Сервер
cd server && npm run dev

# Клиент
cd client && npm run dev
```

## Сборка и запуск
```bash
npm run build
cd server && node dist/index.js
```

## Тестирование
```bash
npm test        # unit тесты
npm run typecheck
```

## Проверка API
```bash
# Health
curl http://localhost:3000/health

# Список моделей (прокси)
curl http://localhost:3000/api/models

# Создать тестовый/сгенерированный CompanyCore
curl -X POST http://localhost:3000/api/core/create -H "Content-Type: application/json" -d "{\"country\":\"DE\",\"scale\":\"small\"}"
```

## Важные замечания
- Ключ OpenRouter вводится в интерфейсе и хранится только в зашифрованной HttpOnly cookie сессии. Сервер использует его временно для запроса. В `.env` OpenRouter-ключ не нужен.
- В мок-режиме (`MOCK_LLM=true`) генерация работает без ключа для тестирования инфраструктуры
- `data/` игнорируется git
- Сгенерированные сайты будут версионироваться (старая версия не перезаписывается)
- Модули будущих направлений должны только читать из `CompanyCore`, не регенерировать core-факты


---

## Источник: docs/scope-audit-2026-10-25.md

# Проверка соответствия техническому заданию — 25.10.2026

Subsequent update: user authorized priority stage 6 (FR-007), now implemented locally: operation costs/history, budget and progress. The original audit below is historical; see docs/generation-operations.md and docs/project-status.md for current behavior and limitations.


Проверен полностью `scope-of-work.md`, разделы 1–7. Файл `state-of-work.md` в репозитории отсутствует. Учтены последующие указания пользователя: AI-генерация HTML/CSS и переводов, ключ OpenRouter в cookie сессии, визуальное превью, подготовка личного приложения к Supabase/Render. Унификация и GitHub отложены пользователем.

Это проверка текущего кода, схем, API, интерфейса и имеющихся тестов. Новых платных генераций, изменения карточек и подключения к облаку при аудите не выполнялось. «Есть в коде» не означает «подтверждено реальной моделью в production».

Статусы: **сделано** — механизм реализован; **частично** — есть существенные ограничения; **нет** — требуемый механизм отсутствует; **не подтверждено** — нужна проверка реальным сценарием.

## 1. Цель проекта

| Пункт | Статус | Фактическое состояние |
|---|---|---|
| Панель создания компании и сайта из 3–4 страниц | Частично | Оба этапа реализованы; создаются три страницы. Успешный полный прогон окончательной AI-версии с реальным провайдером ещё не подтверждён. |
| Команда, история, продукт и контакты | Сделано | Поля есть в CompanyCore, схеме, промпте и редакторе. |
| Согласованность всех сведений | Частично | Общая карточка/реестр/снимки и точные подстановки имён/контактов есть. Смысловые противоречия автоматически не исключаются. |
| Содержательно разные компании при повторе | Частично | Есть указания модели и temperature=0.9; нет сравнения с прошлыми компаниями или проверки уникальности результата. |
| B2B / AI / инвестиционные исследования и анализ | Сделано | Направление задано промптом компании. |
| Проектные сведения, не проверка юридического лица | Соответствует назначению | Данные генерируются; проверка реестров не реализована и не является обязательной функцией первого этапа по этому пункту. |

## 2. Пользовательский сценарий

| Пункт | Статус | Фактическое состояние |
|---|---|---|
| Задать параметры, создать и сохранить карточку | Сделано | Форма → сервер → OpenRouter → схема → хранилище. Отдельные параметры из ТЗ пока недоступны в UI, см. раздел 3. |
| Просмотреть и отредактировать карточку | Сделано | Отдельный адрес #cards/:id, все основные тексты/FAQ, сохранение, защита устаревшей версии и предупреждение о несохранённых правках. |
| Утвердить карточку | Частично | При сохранении есть галочка ручной проверки. Нет сохранённого состояния «утверждена», отдельного действия утверждения или запрета создавать сайт из неутверждённой карточки. |
| Выбрать компанию и оформление, создать сайт | Сделано в коде | Выбор компании/языка/модели и описание оформления; отдельная AI-генерация. |
| Превью и скачивание | Сделано | Изолированный iframe, три страницы, мобильная ширина, ZIP; проверялось на тестовом сайте. |
| Не генерировать факты компании повторно | Частично | Карточка не перезаписывается; имена/контакты подставляет сервер. Описательные тексты переводятся моделью, полная смысловая эквивалентность не доказана. |

## 3. Функциональность панели

### 3.1. Генерация компании — FR-001

| Параметр/действие | Статус | Фактическое состояние |
|---|---|---|
| Название бренда | Частично | Поле есть, но промпт использует его как Brand hint; точное совпадение результата с заданным названием не проверяется. |
| Страна | Сделано для первого этапа | Германия в UI/API. Другие страны исходным первым этапом не требуются. |
| Направление бизнеса | Частично | Поддержано в типах/API/промпте, но поля в форме нет. |
| Тип B2B-сервиса | Частично | Поддержан в типах/API/промпте, но поля в форме нет. |
| Масштаб | Сделано | Небольшая и средняя компания. |
| Выбор модели | Сделано | Список OpenRouter и поиск по имени/ID. |
| Конкретные либо случайные значения из каталога | Нет каталога | Отсутствуют справочники/действие случайного выбора. Пустое название даёт выбор самой модели, это не выбор из каталога. |

### 3.2. Карточка компании — FR-002

Все перечисленные в ТЗ группы полей **реализованы**: бренд/юрлицо; город/адрес/телефон/email; руководитель и два руководителя отделов; имена/должности/биографии; история/специализация; аудитория/проблема клиента; входные данные/процесс/результат/ограничения продукта; ровно пять пар FAQ. Есть структурированное JSON-хранение, схема Zod/типы TypeScript, просмотр, ручное редактирование и сохранение.

Ограничение: наличие заполненных строк не доказывает достоверность, реалистичность и согласованность. При первичной генерации схема проверяет min(1), но не все проверки редактирования: например, строка из пробелов и неверный формат телефона могут пройти структурную схему. Галочка проверки не заменяет автоматический анализ.

### 3.3. Сайт — FR-003/004/005, NFR-004

| Пункт | Статус | Фактическое состояние |
|---|---|---|
| Сохранённая компания / RU или DE / стиль | Сделано | Есть соответствующие поля; стиль описывается текстом, а не фиксированной палитрой, что соответствует варианту «визуальный стиль». |
| AI создаёт сайт, а не только компанию | Сделано в коде, live не подтверждено | Модель возвращает HTML трёх страниц, CSS и переводы. Неуспех в реальном режиме не заменяется незаметно шаблоном. В MOCK_LLM используется явно отмеченный тестовый шаблон. |
| Адаптивное оформление | Частично | Есть запрос адаптивности в промпте, мобильный предпросмотр и базовый тестовый шаблон. Адаптивность каждого AI-результата автоматически не проверяется. |
| Главная: предложение, аудитория, преимущества, переход | Частично | Требуются бренд, специализация, аудитория, проблема и навигация. Отдельного обязательного блока преимуществ и соответствующего поля карточки нет; полнота предложения отдельно не проверяется. |
| Продукт: услуга, процесс, ограничения, FAQ | Сделано структурно | Валидатор требует все поля продукта и FAQ. Смысл проверяется вручную. |
| Компания/контакты: история, команда, адрес, контакты | Сделано структурно | Обязательные подстановки включают эти группы данных. |
| Неизменность фактов | Частично | Имена, юрлицо, адрес/контакты точные; проверяются числовые значения переводов. Смысл характеристик продукта и биографий может измениться при переводе без обнаружения. |
| Навигация | Сделано | Для каждой AI-страницы проверены ссылки на все три страницы; превью обрабатывает внутренние переходы. |
| Заголовки | Частично | Теги заголовков разрешены и запрошены у модели, но обязательное наличие/иерархия h1/h2 не валидируется. |
| Метаданные и favicon | Сделано для AI-результата | Сервер добавляет title, description, lang, charset, viewport и favicon.svg. Старый mock-шаблон содержит пустой favicon.ico. |
| Отсутствие фальшивых работающих функций | Частично | Формы, скрипты, iframe и активные HTML-атрибуты удаляются; промпт запрещает выдуманные возможности. Утверждение о несуществующей функции в переведённом тексте автоматически не распознаётся. |

### 3.4. Библиотека — FR-006

| Действие | Статус | Фактическое состояние |
|---|---|---|
| Список компаний | Сделано | Карточки, счётчик, поиск по названию/городу/специализации. |
| Просмотр/редактирование компании | Сделано | Отдельный редактор с сохранением. |
| Создать сайт выбранной компании | Сделано | Выбор переносится в форму сайта. |
| Список версий | Сделано | Версии отображаются в редакторе компании. |
| Превью/скачивание сохранённой версии | Сделано для версий с файлами | Старые записи, созданные до сохранения файлов, восстановить из метаданных нельзя; UI сообщает об этом. |
| Скачать карточку JSON | Нет | Ни соответствующей кнопки, ни маршрута экспорта не обнаружено. |
| Скачать сайт ZIP | Сделано | Архив из сохранённых файлов через JSZip. |
| Старый сайт неизменен после правки компании | Сделано | Версии хранят свои файлы/снимки; новая генерация создаёт новый ID. Есть тест сохранности прежнего результата. |

## 4. OpenRouter — FR-007, NFR-002

| Пункт | Статус | Фактическое состояние |
|---|---|---|
| Настройка ключа | Сделано по новой инструкции | Отдельное поле, зашифрованная HttpOnly cookie сессии, Secure в production; сервер использует расшифрованный ключ временно. Требование первоначального ТЗ о хранении ключа на сервере заменено пользователем. |
| Выбор модели | Сделано | Поиск/список; для сайта фильтруются модели со структурированным текстовым ответом. |
| Проверка «API действительно подключен» | Частично | /api/session проверяет наличие читаемой cookie. Ключ проверяется по формату при вводе, но отдельного запроса проверки его действительности и доступности API нет. Зелёный кружок означает наличие ключа в сессии. |
| Текущий этап генерации | Частично | Есть «генерируем/готово/ошибка», но нет живой индикации этапов запроса, перевода, валидации и повторных попыток с сервера. |
| Ошибки / неверный ответ модели | Сделано с ограничениями | Ошибки запросов/JSON/схем/обязательных подстановок обрабатываются. Неверная структура результата не исправляется отдельным корректирующим запросом. |
| Ограниченные повторные попытки | Сделано для запросов | Таймаут, ограничение числа попыток, backoff; постоянные HTTP-ошибки не повторяются. Повтор после ошибки схемы не реализован. |
| Учёт стоимости | Частично | Используется usage.cost либо расчёт тарифа; сайт показывает и сохраняет стоимость. Стоимость генерации компании возвращается API, но UI её не показывает и карточка не сохраняет; общего журнала расходов нет. |
| Лимит на операцию | Частично | Предварительная консервативная оценка/резервирование попыток и отказ при неизвестной цене реализованы. Это не жёсткая гарантия итогового счёта провайдера при иных тарифных компонентах/условиях цены. |
| Ключ не попадает в сайты/экспорт/ответы/логи | Реализовано архитектурно, полный аудит не завершён | Ключ не входит в промпты/карточки/версии, API сессии его не возвращает, есть тесты cookie/границы API. Полная проверка истории Git и всех исторических артефактов в этом аудите не выполнялась. |
| Открытие сохранённого без платных запросов | Сделано | Версии/файлы читаются из хранилища; просмотр и ZIP не обращаются к генерации модели. |

## 5. Согласованность и различия — FR-005/008

| Проверка | Статус | Фактическое состояние |
|---|---|---|
| Общая карточка как источник | Сделано | CompanyCore, производный Fact Registry и снимок с SHA-256. |
| Совпадение сведений на всех страницах | Частично | Общие подстановки обеспечивают одинаковые закреплённые значения. Полный анализ текста HTML отсутствует; CrossModuleValidator проверяет главным образом верхнеуровневые поля, а не факты в HTML. |
| Телефон ↔ страна/город | Частично | При редактировании проверяется формат +49; город не сверяется. При первичной генерации телефон в основном контролируется промптом, не специальным валидатором. |
| Нет противоречий продукта | Нет автоматической проверки | Указание в промпте и ручное подтверждение пользователя. |
| Смысл сохранён при переводе | Частично | Точная структура переводов и числа проверяются. Семантика автоматически не проверяется; предусмотрена ручная проверка. |
| Нет пустых полей/незаменённых переменных | Частично | Схемы и валидатор AI-подстановок есть; редактор проверяет пробелы/маркеры. Первичная генерация компании не применяет все эти правила. |
| Содержательные различия повторов | Нет автоматической проверки | Нет сравнения историй, специализаций, биографий, продукта и FAQ с предыдущими карточками. |

## 6. Архитектура восьми направлений — FR-009

Подготовлены CompanyCore, Fact Registry, CoreSnapshot, поле extensions, интерфейсы модуля и реестр модулей. Самостоятельная реализация всех восьми направлений не требуется в текущем первом этапе и не считается недоделкой этого этапа.

**Частично выполнено требование совместной проверки:** JointValidator содержит заготовки и фактически возвращает успешный результат без содержательной проверки комплекта; правила межмодульной согласованности и подключения к итоговому сценарию ещё не реализованы полностью.

## 7. Результаты работы — FR-010

| Результат | Статус | Фактическое состояние |
|---|---|---|
| Работающая панель с двумя этапами | Частично подтверждено | Локальный интерфейс/API и mock-поток проверены. Полный окончательный сценарий с реальной AI-генерацией и оба языка нужно подтвердить. |
| Исходный код | Сделано локально | Находится в рабочем каталоге; публикация на GitHub отдельно отложена. |
| Инструкция запуска | Частично | Актуальнее docs/RUN_INSTRUCTIONS.md; README и некоторые старые документы ещё предлагают серверный ключ/старый конфиг. |
| Пример конфигурации без ключей | Частично | server/.env.example актуален; корневой .env.example содержит старое поле OPENROUTER_API_KEY. В обоих шаблонах похожих на реальные OpenRouter-ключей не обнаружено; значения секретов не выводились. |
| Схема компании | Есть в коде | Zod-схема и TypeScript-типы, пример в архитектуре. Отдельный законченный документ docs/schema.md отсутствует. |
| Два готовых примера компаний и сайтов | Нет оформленного комплекта | Каталог examples существует, но пуст. Рабочие данные в локальном хранилище не заменяют комплект проверенных примеров для передачи. |

## Последующие требования вне первоначального ТЗ

- Превью/мобильная ширина и сессионный ключ реализованы; нижний зелёный кружок добавлен отдельно в рамках этого запроса.
- Supabase adapter, миграция и Render blueprint подготовлены; реальные облачные ресурсы, применение миграции и запуск на Render не проверены.
- Обязательная зависимость от sing-box убрана. Прямая связь проверялась, причины старых отказов достоверно не установлены; проверка из Render остаётся впереди.
- Унификация и GitHub по указанию пользователя пока не выполнялись — это согласованная последовательность, а не исправленная в этом аудите недоделка.

## Изменения в рамках этой проверки

Из функционального кода изменена только индикация подключения: класс is-connected для нижнего статуса и зелёный кружок в CSS. Обнаруженные несоответствия не исправлялись. Добавлены отчёт и служебные записи аудита. Сборка frontend и проверка его типов прошли.

Основные источники: scope-of-work.md; client/src/main.ts, editor-view.ts, site-preview.ts; server/src/routes/core.ts, site.ts, session.ts; generators/company-prompt.ts, ai-site-generator.ts; core/edit-core.ts; validators/core-schema.ts, cross-module.ts, joint.ts; services/openrouter.ts; storage/*; docs/RUN_INSTRUCTIONS.md и README.md.


---

## Источник: docs/session-handoff.md

# Session Handoff — update 2026-10-25

## Latest: catalogs, approval and JSON export completed locally, 2026-10-26
- User asked to continue remaining tasks and explicitly deferred real website generation verification until an account with balance is connected. No billable requests performed. Do not treat this verification as the next blocking task.
- Catalog/input stage: company-catalog.ts + company-inputs.ts, catalogs route, exact brand prompt/response enforcement; direction/service manual or random, only supported country/scales randomly selected. Prior browser/tests passed; documented now.
- Current stage: card-actions.ts approval/export, optional meta.approval (saved version/date), edit clears approval, POST /api/core/:id/approve, GET /api/core/:id/export; site route rejects drafts before model calls. UI approve/review/status/export, library badges and disabled drafts in site selection. Older cards stay drafts until reviewed; old websites remain accessible.
- JSON is canonical core fields with rebuilt facts and empty extensions; no unknown/service/module payloads. Schema change is optional JSONB metadata; no extra SQL migration needed.
- Checks: 55 tests/13 files, full build + server/client typechecks pass; isolated mock browser tested approve/reload/export/edit-reset/draft selection. Ports 3014 and 3015 test servers stopped and tabs closed. Screenshot: visualizations workspace/card-approval.png. Real cards/keys untouched.
- Next: content completeness/home benefits and stronger fact/phone validation, diversity/cross-module/joint rules, handover examples/docs. Keep code unification at the end, GitHub prep after unification. Live AI/Supabase/Render verification remains pending; final paid smoke deferred by user.
- Preserve extensive unrelated pre-existing working-tree changes; no reset/commit/publish/deploy occurred.

## Latest: priority stage 6 completed locally, 2026-10-25
- FR-007 / P5-002/P5-003 moved first by user request: costs/history, operation budget, live stages/attempts. Free-only is an optional filter OFF by default; paid models remain available.
- Scoped changes: server operations service/routes, OpenRouter billing/retries, generation integrations, file/Supabase journal + migration 002; client generation-operations.ts/main/nav/styles; tests/docs. Preserve all existing unrelated working-tree changes.
- Verification: 51 tests, full build and server/client types pass. Isolated browser mock company generation/edit/save, site generation/preview, history reload/filter/quota pass. QA server 3013 stopped, tab closed; no real paid requests/external resources.
- main.ts recovered after own scripted replacement error from this session's source/patch history; serialization preserved and editor/browser flow checked. No known recovery issue.
- Apply BOTH Supabase migrations in order when cloud setup is separately authorized. Live Supabase/Render/final successful real AI site smoke remain unverified. Unknown charges require manual OpenRouter Activity reconciliation; app allowance is not final billing guarantee.
- Next: other audited feature stages in docs/scope-audit-2026-10-25.md, with cost/progress gaps now superseded. Details: docs/generation-operations.md. Keep unification last and GitHub prep after it.


## Latest: scope audit, no gap fixes authorized
- User asked to fully audit state-of-work.md and report done/missing, without fixing; file absent, used actual scope-of-work.md sections 1–7 plus later amendments. Full matrix: docs/scope-audit-2026-10-25.md.
- Only authorized functional edit: lower OpenRouter connection indicator green dot in client/src/main.ts and workspace.css. Verified simulated connected/disconnected UI on isolated port 3012; no real session key replaced or external requests made. Temporary tab/server stopped. Build/client types pass.
- Audit explicitly separates implementation from live proof. Main remaining gaps and cloud/real-AI limits are in the audit; do not start fixing them without new user instruction. No catalogs, JSON export, approval, semantics/diversity, home benefits, docs/config discrepancies or examples were repaired.
- Green dot means session-key presence only. API credential validation remains a finding, not fixed. examples/ exists but is empty; docs/schema.md absent. README/root env example remain outdated. Next: user selects follow-up work from audit; unify only at end, GitHub after unification.

## Latest fix: local Origin/Host mismatch
- User reported connection/company generation blocked by Cross-site requests are not allowed. Reproduced root cause: Vite string proxy shorthand rewrites Host (changeOrigin=true), while Origin stays frontend-facing.
- Explicit changeOrigin=false for /api and /health in client/vite.config.ts; unchanged security policy moved to server/src/security/same-origin.ts and used by startup. Added actual-Vite integration regression tests.
- Verified live local POST for both localhost and 127.0.0.1 reaches application validation; company generation without key reaches 401 session check; external origin remains 403. No real key/session was changed and no paid request performed.
- 41 source tests, full build/client-server types and changed-file diff whitespace checks pass. Vite picked up config edit automatically. User should refresh the page and retry entering key.

## Latest: AI generation, session credentials and deployment preparation
- Final verification update: main Vite on port 5174 was restarted to pick up the new proxy configuration; /#settings now successfully reports that no user key is configured. Isolated test server/tab were stopped/closed. Repeat direct network diagnostic: one transient native timeout, then all native/undici/curl requests returned 200; root cause of historical restrictions remains unknown.
- Active user scope: AI-generated websites with faithful translation; visual preview; OpenRouter key entered in UI and retained only in session cookie; personal shared library on Supabase/Render. Unify code only at end, then prepare GitHub. No cloud provisioning/publication authorized or performed.
- Implemented ai-site-generator with structured JSON schema, generated HTML fragments/CSS, translation field/number checks, immutable fact placeholders, sanitize-html/PostCSS cleanup, explicit mock flag, model/cost metadata. Real mode never silently falls back. Site form searches compatible text-output/structured models, accepts design brief and shows cost.
- Preview: iframe sandbox, restricted CSP, local page navigation, mobile-width toggle; saved version preview/ZIP does not generate again.
- Credentials: routes/session.ts encrypts key into HttpOnly/SameSite=Strict cookie; Secure in production, no Max-Age. Key transient per request, no env fallback. Legacy OPENROUTER_API_KEY line removed from ignored local server/.env without showing value. Separate SESSION_SECRET protects cookies; APP_ACCESS_PASSWORD protects production personal workspace.
- Deployment: same-origin compiled frontend/API, client Vite proxy; SupabaseAdapter implemented with private immutable bundles and SQL migration; render.yaml single instance. No live Supabase credentials provided; no resources deployed. Old local cards are not auto-migrated.
- Networking: direct native Node public models request HTTP 200 (~507ms), curl direct HTTP 200 (~646ms). No basis to prove old region/Node hypothesis; Render and authenticated model-provider access must still be checked there. OPENROUTER_PROXY_URL optional per-provider only, generic proxy env ignored. Diagnostic: node server/scripts/check-openrouter.mjs.
- undici patched 8.5.0 -> 8.12.3; npm audit after installation: 0 vulnerabilities.
- Verification: 38 distinct source tests pass including production cookie behavior (older counts duplicated dist tests; now fixed), full build/client types pass. Browser isolated mock server verified preview/page links/mobile and key set/reload/remove. Test-only credential was removed and test tab closed; actual user cards untouched.
- Important unfinished verification: real AI smoke runs before final parser/schema/session changes were rejected; no successful real end-to-end final result yet. Paid retries stopped per workflow. Final AI pipeline is tested with mocked provider. Supabase live migration/adapter and Render deployment/network remain unverified. Translation semantics require human review.
- Next: user adds their key at /#settings, validate one real generated site, apply Supabase migration/config only when provisioned, then address remaining catalogs/diversity/JSON export. Finish feature work before unification, and GitHub prep only after that.
- New/affected files include ai-site-generator, session route/tests, site-preview, Vite config, Supabase adapter/tests/migration, networking diagnostic, render.yaml, env example, startup/API/services and docs. See git status; pre-existing edits preserved.

## Latest UX/UI work
- Implemented user-requested restrained redesign: graphite navigation, light workspace, consistent controls, Russian labels, structured editor sections and FAQ, in-page section links, human-readable generation results, library search/count, simplified site form/source disclosure and unsaved-change confirmation.
- Files: client/index.html, client/src/main.ts, new client/src/editor-view.ts and client/src/workspace.css; status/activity/handoff docs. Existing client/src/style.css retained, index now loads workspace.css.
- Checks: frontend build, client TypeScript and changed-source diff whitespace pass. Browser desktop/mobile verification, 390px requested viewport with 375px usable width and no horizontal overflow; library filter/no-match, populated editor, cancel unsaved navigation then restore original field value, transfer selected card to site. Console errors: none. No real company changes saved, no paid requests.
- Backend behavior/validation remains as below. Local frontend: http://127.0.0.1:5174/. Responsive viewport override was reset after checking.

## Latest completed work (supersedes historical template below)
- Authorized: manual card editing under shared-fact/version rules, full-list OpenRouter model search.
- Implemented: dedicated #cards/:id page with all text/FAQ fields; GET/PUT persistence; server schema/required/template/DE phone checks; canonical Fact Registry rebuild; revision conflict protection; atomic file writes; snapshot/HTML storage for new site versions and version ZIP downloads; model search/count/no-match state.
- Changed: client/src/main.ts; server/src/routes/core.ts; server/src/core/edit-core.ts; server/src/core/__tests__/edit-core.test.ts; server/src/storage/file-adapter.ts; server/src/storage/types.ts; server/src/generators/site-generator.ts; status/activity/handoff docs.
- Checks: client build, client/server typechecks, 33 tests passed outside Windows sandbox (atomic rename blocked in sandbox). API tests cover GET/PUT/stale conflict/invalid ID/list; storage test proves edited facts persist and old site snapshot/HTML stays unchanged. Browser verified populated editor/FAQ and model search/no results. Real cards not modified for testing.
- Preserved pre-existing staged/unstaged changes and user-added client/src/style.css. No commit/deployment.
- Limits: semantic contradictions and city/phone matching require explicit human review. Old metadata-only site versions lack downloadable files. Supabase remains a stub; concurrency guard is per server process. Translation/style behavior and catalogs/diversity remain separate unfinished work.
- Local frontend: http://127.0.0.1:5174/. Backend watcher should reload routes; a dist-based launch needs rebuild/restart.

## Historical template (outdated)

## Current status
- Phase: Preparation (A-F in progress/completing)
- Last completed: Architecture (B), plan (C), agent docs started
- Blockers: Stack/storage proposed but not human-approved; spend limits/catalog/diversity/joint validation undefined

## Last results
- Created: docs/requirements.md, docs/architecture.md, docs/adr/*, docs/implementation-plan.md, docs/development-setup.md, docs/quality-and-operations.md, AGENTS.md, docs/agent-workflow.md, docs/agent-activity-log.md, docs/agent-token-policy.md, docs/project-status.md
- Verified: scope-of-work read fully, no existing code, no git repo

## Open questions (for human)
1. Approve stack: Node.js + TypeScript + Express + Vite + file-based JSON? Or different?
2. Spend limit per operation - value and enforcement logic?
3. Model listing/selection approach?
4. Catalog contents for random values (DE/small/medium)?
5. Definition of "substantively different" for diversity checks?
6. Joint validation criteria for 8 directions?

## Changed files
See docs/agent-activity-log.md

## Checks performed
- Read scope-of-work completely
- Cross-checked requirements against all sections
- No secrets added
- No business logic implemented
- No destructive commands run

## Documents needed to continue
- scope-of-work.md
- docs/requirements.md
- docs/architecture.md
- docs/implementation-plan.md
- docs/project-status.md
- AGENTS.md

## Recommended next steps
1. Review proposed stack/decisions
2. Answer open questions or provide safe defaults
3. Begin Phase 0 scaffolding (P0-001..P0-004) after approval
4. Implement P1 infrastructure with security focus


---

## Источник: docs/ДЛЯ_ЧЕЛОВЕКА_КРАТКОЕ_РУКОВОДСТВО.md

# КРАТКОЕ РУКОВОДСТВО ДЛЯ ЧЕЛОВЕКА

## Что сделано

Я полностью подготовил проект к разработке. Никакой бизнес-логики реализовано не было - только анализ, проектирование и подготовка инфраструктуры.

### Готовые документы
- `docs/requirements.md` - все требования с ID (FR-*/NFR-*), матрица соответствия, допущения, блокирующие вопросы
- `docs/architecture.md` - архитектура с обоснованием, диаграмма, `CompanyCore`, факт-реестр, модульные контракты, кросс/совместная валидация
- `docs/adr/` - краткие ADR с контекстом, решением, альтернативами, последствиями
- `docs/implementation-plan.md` - поэтапный план разработки с задачами, зависимостями, тестами
- `docs/development-setup.md` - настройка окружения и команды
- `docs/quality-and-operations.md` - стратегия тестирования, качество, эксплуатация
- `AGENTS.md` - правила работы для будущих ИИ-агентов
- `docs/agent-workflow.md` - алгоритм работы агента
- `docs/agent-activity-log.md` - журнал всех действий
- `docs/agent-token-policy.md` - правила экономии контекста
- `docs/project-status.md` - текущий статус проекта
- `docs/session-handoff.md` - шаблон передачи сессии
- `docs/initialization-report.md` - итоговый отчёт подготовки

### Структура проекта
- `server/` - Express + TypeScript (core/, modules/, validators/, storage/, services/, routes/, generators/, config/)
- `client/` - Vite + TypeScript
- `data/` - для локального файла-адаптера (gitignored)
- `templates/` - шаблоны сайтов
- `examples/` - примеры (gitignored)
- `.env.example` - пример конфига без ключей
- `.gitignore` - настроен

### Git
- Инициализирован репозиторий
- Ветки: `main` и `dev`
- Первый коммит в `main`: "init: architecture planning - Node/TS+Express+Vite, Supabase Postgres+Storage, CompanyCore canonical model"

## Предложенное архитектурное решение

| Компонент | Решение | Пояснение |
|-----------|---------|-----------|
| Backend | Node.js + TypeScript + Express | REST API, прокси OpenRouter, серверная логика |
| Frontend | Vite + TypeScript | Лёгкий UI для двух фаз |
| Хранение (облако) | Supabase Postgres (JSONB) + Supabase Storage | Надёжно для Render/Railway, бесплатно. CompanyCore в JSONB, ZIP в Storage |
| Хранение (локально) | Файловый адаптер | Удобство разработки без внешних сервисов |
| Шаблоны сайтов | Handlebars/EJS | Статичный HTML/CSS/JS, 3 страницы, RU/DE, ZIP-экспорт |

## Ключевые принципы

- **Canonical Company Model (CompanyCore)** - единый источник правды. Все модули читают из него.
- **Fact Registry + Module Contract** - атомарные факты, запрет на регенерацию core-фактов
- **Core Snapshot** - снимок на момент генерации
- **Cross-module Validator + Joint Validation** - согласованность между модулями
- **Версионирование** - при изменении карточки создаётся новая версия сайта
- **Безопасность** - ключ OpenRouter только на сервере, прокси + кэш моделей, лимит расходов
- **Без "пустышек"** - только реализуемый функционал
- **Расширяемость** - заложена архитектура под 8 направлений без глобальной переделки

## Что нужно от вас для продолжения

Ответьте на вопросы из первого сообщения:
1. Стек/хранение для облака (Render/Railway + Supabase) - согласны?
2. Лимит расходов на одну операцию в USD и подход к расчёту
3. Выбор модели OpenRouter (динамический список + кэш + whitelist)
4. Каталоги рандома - пока только страна (10) и масштаб (5), остальное позже
5. Критерий "существенно разные" - отличия в истории/специализации/команде/ЦА/продукте/FAQ
6. Согласованность 8 направлений - CompanyCore + Fact Registry + контракты + валидация

## Следующий шаг

После ваших ответов начну реализацию **слоя CompanyCore** (схема, сервис, факт-реестр, базовые валидаторы) и **storage-адаптера** под Supabase + файловый. Бизнес-логику генерации трогать буду только после заложения этих механизмов согласованности.


---

## Источник: docs/adr/0001-stack-choice.md

# ADR-0001: Stack choice

## Status
Proposed

## Context
Need minimal web panel (server + client) for company generation via OpenRouter, site generation from card, static export, file storage. No stack specified. Must support security (keys server-side), versioning, extensibility.

## Decision
Use Node.js + TypeScript + Express (backend), Vite + TypeScript (frontend), file-based JSON storage, simple templating for static site generation.

## Alternatives considered
- Python/FastAPI + frontend - also viable, Python available but Node/TS common for fullstack JS; both fine. Chose Node/TS for simplicity in single ecosystem.
- Go + frontend - not installed
- Next.js fullstack - more opinionated/heavier, could work but prefer minimal separation

## Consequences
- **Positive:** Single language ecosystem, simple deployment, easy file I/O, good HTTP client support
- **Negative:** Less "batteries included" than full frameworks, need to structure carefully
- **Risks:** Need to ensure proper security practices manually

## References
- Node.js v24 available
- Express.js patterns (general)


---

## Источник: docs/adr/0002-storage.md

# ADR-0002: Storage mechanism

## Status
Proposed

## Context
Need to persist companies, site versions, generated sites. Must support versioning (old sites preserved when card edited). Project will be run in cloud (Render/Railway). Free Render has ephemeral disk, so local files are not reliable for persistent data.

## Decision
Use **Supabase Postgres + Supabase Storage** as primary storage for cloud. 
- **Postgres (JSONB)** - canonical `CompanyCore`, fact registry, site versions, future modules results
- **Supabase Storage** - generated static sites packaged as `.zip` for preview/download
- Keep a **file-based adapter** for local development to simplify work without external services.

## Alternatives considered
- **Local files only** - simple, but ephemeral on free Render. Rejected for cloud-ready setup.
- **Render Disk** - often limited/unavailable on free tier or requires paid plan.
- **SQLite** - file-based but still needs persistent volume in cloud. Less convenient with serverless-like free hosts.
- **Railway Volume + files** - possible, but Supabase gives managed Postgres + Storage in one place for free.

## Consequences
- **Positive:** Reliable persistence in cloud, easy to scale later, JSONB fits `CompanyCore` well, Storage fits static site exports
- **Negative:** Requires external service (Supabase). Need to handle env vars and connection
- **Risks:** Misconfiguration of RLS/keys. Must keep service keys server-side only

## References
- Scope requires persistence, versioning, exports
- Discussion: cloud-first with free tier in mind


---

## Источник: client/README.md

# Client scaffold
Vite + TypeScript. Two-phase UI (Company / Site) to be implemented.


---

## Источник: server/README.md

# Server scaffold
Core layers prepared: core/, modules/, validators/, storage/, services/, routes/, generators/, config/
Canonical CompanyCore to be implemented with Fact Registry and module contracts.
