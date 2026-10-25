# Agent Activity Log

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
