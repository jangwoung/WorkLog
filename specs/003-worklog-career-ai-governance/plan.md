# Implementation Plan: WorkLog — Career Assets & Governed AI Review

**Branch**: `003-worklog-career-ai-governance` | **Date**: 2026-02-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/003-worklog-career-ai-governance/spec.md`

**Note**: This plan is produced by the `/speckit.plan` workflow. Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md) artifacts already exist and are referenced below.

## Summary

WorkLog is implemented as a **backend-first, event-driven web application** that (1) turns GitHub PRs into structured career assets (AssetCards) with human approval and export, (2) runs AI-powered code review only under Intent → Approval → AgentRun with full audit, and (3) provisions GitHub repositories only after a project intent and human approval, with evidence preserved. All heavy work runs asynchronously (Cloud Tasks + workers); data is stored in Firestore with minimal sensitive data (hashes, no full diff).

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20.x (align with existing WorkLog)  
**Primary Dependencies**: Next.js 16 (App Router), Firestore, NextAuth (GitHub OAuth), Cloud Tasks, Vertex AI (Gemini)  
**Storage**: Firestore — existing collections (users, repositories, pr-events, asset-cards, decision-logs, intents, approvals, agent_runs, review_outputs, evidences, exception_events); new collection: provisioning_events  
**Testing**: Same as repo (e.g. Jest or Vitest for unit; contract tests for API)  
**Target Platform**: Linux (Cloud Run / local Node); frontend runs in browser  
**Project Type**: Web application (Next.js API Routes + App Router UI; extend existing `app/` and `src/`)  
**Performance Goals**: API P95 &lt; 1s for gate and list endpoints; audit report P95 &lt; 5s; background job completion within defined SLA  
**Constraints**: No full PR diff persistence (diffHash + PR URL + SHAs only); idempotency on all job executions; AI usage cost-bounded and observable  
**Scale/Scope**: Single-tenant initially; on-demand KPI and audit; rule set small (static or configurable risk rules)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with SpecKit Constitution (AgentRun / AI Review MVP) principles:

- **P-01 (実行はIntentなしに存在しない)**: Every AgentRun is gated by intentId. Run creation API rejects with 4xx and logs when intentId is missing. **PASS** (plan enforces in API).
- **P-02 (リスクは承認で受容される)**: For Med/High risk, valid Approval is required before run. Low may omit approval. **PASS** (gate in POST /api/agent-runs).
- **P-03 (監査は欠損を許容しない)**: Audit Report detects and flags missing Intent/Approval/Run/Evidence; deficiencies affect success metric. **PASS** (Markdown report with deficit markers).
- **P-04 (機密は保存しない)**: PR diff is not stored; only diffHash, PR URL, baseSHA/headSHA. **PASS** (data model and provisioning evidence use references only).
- **P-05 (採点しない)**: AI outputs are structured Findings only (fixed schema); no scoring/ranking. **PASS** (ReviewOutput schema; AssetCard schema for career assets).

Guardrails: AgentRun API enforces intentId (G-01), input minimization (G-02), fixed ReviewOutput schema (G-03), exception logging for unapproved High / break-glass (G-04). **PASS** (plan and existing 002 implementation align).

No principle conflicts. Project provisioning (US4) is also intent- and approval-gated; evidence is stored without full diff.

## Architecture (High-Level)

- **Frontend**: Next.js App Router; authenticated via GitHub OAuth (NextAuth). Pages: Inbox, Library, Repositories, Export (career assets); Policy, Approvals, Exceptions, Audit (governance); optional Project Intent / Provisioning UI.
- **Backend**: Next.js API Routes for orchestration and control (intents, approvals, agent-runs, audit, KPI, repositories, assets, export, webhooks).
- **Background Jobs**: Cloud Tasks + Cloud Run workers (e.g. PR Event Processor, Asset Generator, AI Review Executor, Provisioning Worker). All job handlers idempotent.
- **Data Store**: Firestore (append-friendly, audit-safe). No full diff storage.
- **AI**: Vertex AI (Gemini) for transformation and summarization only (AssetCards, risk/consideration summaries); fixed schemas and versioned prompts; no autonomous decisions.
- **External**: GitHub API and Webhooks (PR events, repo create/init).

## Execution Flow (Unified)

1. **Career assets**: User connects repo → PR events → Webhook → enqueue PR Event Processor → enqueue Asset Generator → LLM produces AssetCard → inbox → user approves/edits/rejects → library → export.
2. **AI review**: User creates Intent (goal, constraints, success) → risk engine classifies → Low: run allowed; Med/High: approval required → Approver uses Approvals Inbox → User creates AgentRun (intentId, approvalId if required) → executor runs once → ReviewOutput + Evidence stored → audit report lists run with links.
3. **Project provisioning**: User creates Project Intent (purpose, scope, constraints, success) → optional AI-generated risk/security considerations → Approval required → Provisioning worker creates/initializes repo → provisioning_events record with intentId, approvalId, resourceUrl, structureType.

## Project Structure

### Documentation (this feature)

```text
specs/003-worklog-career-ai-governance/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 (API contracts)
│   └── api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

Extend existing WorkLog layout:

```text
app/
├── (dashboard)/         # UI: inbox, library, repositories, export, policy, approvals, exceptions, audit
├── api/                 # Routes: intents, approvals, agent-runs, audit/report, kpi/summary, exceptions/inbox,
│                        #          repositories, assets, export, webhooks/github, tasks/*, provisioning, provisioning/events
├── components/
└── ...

src/
├── models/              # intent, approval, agent-run, review-output, evidence, provisioning-event, ...
├── services/            # intent, approval, agent-run, risk-engine, audit-report, kpi, evidence, exception,
│                        # repository, asset-card, pr-event, export, provisioning
├── infrastructure/
│   └── firestore/       # collections, client
├── middleware/
└── ...
```

**Structure Decision**: Single Next.js app (App Router + API Routes). Career assets and AI review governance share auth and Firestore; background jobs are Cloud Tasks endpoints. New for 003: provisioning service and provisioning_events collection; optional Project Intent UI.

## Risk Mitigation

- **Idempotency**: All job executions (PR event, asset generation, agent run, provisioning) accept idempotency keys; duplicate requests return existing result.
- **Minimize stored sensitive data**: Hashes and references only; no full diff or raw secrets in store.
- **AI cost and observability**: Bounded usage (per run, per export); model and version recorded; costs observable.

## Complexity Tracking

No Constitution violations. This plan extends existing 001/002 implementations and adds provisioning with the same intent/approval gates.
