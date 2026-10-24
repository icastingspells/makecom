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
