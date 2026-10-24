# AGENTS.md

## Start here
1. Read `scope-of-work.md` for requirements
2. Read `docs/requirements.md` for formalized requirements (use FR-*/NFR-* IDs)
3. Read `docs/architecture.md` for design
4. Read `docs/implementation-plan.md` for tasks
5. Read `docs/project-status.md` for current state
6. Read `docs/agent-workflow.md` for detailed algorithm

## Check current state
- Run: `git status` (if repo initialized) or check files
- Read `docs/project-status.md` and `docs/agent-activity-log.md`
- Check for open questions/blockers in `docs/requirements.md`

## Task selection
- Pick next task from `docs/implementation-plan.md` based on dependencies
- Prefer unblocked tasks that don't require missing decisions
- If blocked by open question requiring human decision, move to independent task or flag it

## Work rules
- **No business logic implementation now** unless explicitly asked - focus on preparation
- **Security first:** API keys server-side only, never in exports/logs/site/client
- **Fact consistency:** Company card is single source of truth; version sites on changes
- **Extensibility:** Design for 8-direction expansion with shared facts
- **Minimal complexity:** Prefer simple solutions
- **No secrets:** Never commit keys/tokens
- **Verify:** Check actual results, not just file existence

## Testing
- Follow `docs/quality-and-operations.md`
- Run lint/typecheck/tests as applicable
- Validate fact consistency for generated content
- Check for secret leakage

## Documentation
- Update `docs/agent-activity-log.md` for significant actions
- Update `docs/project-status.md` after major steps
- Keep single source of truth, update affected docs
- Reference requirements by ID

## Context economy
- Read only needed sections
- Use grep/search over full document reads
- Reference by ID, don't duplicate content
- Follow `docs/agent-token-policy.md`

## Forbidden without permission
- Destructive commands
- Publishing secrets
- Creating external resources
- Production deployment
- Starting implementation of business logic (in prep phase)

## Handoff
- Update `docs/session-handoff.md` before ending session
- Include status, changed files, checks, open questions, next steps
