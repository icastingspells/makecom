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
