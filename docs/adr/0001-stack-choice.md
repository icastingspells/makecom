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
