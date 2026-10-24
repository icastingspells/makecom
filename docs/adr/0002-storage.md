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
