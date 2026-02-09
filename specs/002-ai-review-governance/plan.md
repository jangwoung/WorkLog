# Implementation Plan: AI Review (PR Analysis) MVP — Intent / Approval / AgentRun / Audit

**Branch**: `002-ai-review-governance` | **Date**: 2026-02-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-ai-review-governance/spec.md`

## Summary

MVP establishes the **execution gate** (intentId required; Med/High require Approval) and **audit output** (deficit detection) first. Data is **AgentRun-centric event log** with ReviewOutput and Evidence attached. API enforces gates, stores runs with status flow (queued → running → completed/failed), and exposes Audit Report (Markdown) and KPI. Risk engine uses static rules (DB or config); Exceptions Inbox surfaces reject logs, break-glass, and expiry.

## Plan Summary (MVP)

- **Execution gate**: intentId mandatory on `POST /api/agent-runs`; Med/High require valid Approval (4xx + exception log otherwise).
- **Audit**: Report for from/to/scope with Intent/Approval/Run/Evidence chain; missing links highlighted (e.g. red); success metric reflects completeness.
- **Data**: AgentRun as primary event; ReviewOutput and Evidence as attached artifacts; no full diff storage (diffHash + PR URL + SHAs only).

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20.x (align with existing WorkLog)  
**Primary Dependencies**: Next.js 16 (App Router), Firestore, existing auth (NextAuth)  
**Storage**: Firestore (new collections: intents, approvals, agent_runs, review_outputs, evidences; optional: exception_events, audit_exports)  
**Testing**: Same as repo (e.g. Jest or Vitest for unit; contract tests for API)  
**Target Platform**: Linux (Cloud Run / local Node)  
**Project Type**: Web application (API Server + Console UI; extend existing `app/` and `src/`)  
**Performance Goals**: AgentRun create P95 &lt; 1s; Audit report P95 &lt; 5s (scoped)  
**Constraints**: No full diff persistence; idempotency by runId; actorId on all material events  
**Scale/Scope**: MVP — single-tenant, on-demand KPI; rule set small (static rules for risk)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **P-01**: AgentRun creation requires intentId; missing intentId → 4xx and reject log. **PASS** (plan enforces in API).
- **P-02**: Med/High require valid Approval; otherwise 4xx and exception. **PASS** (gate in `POST /api/agent-runs`).
- **P-03**: Audit Report detects and flags missing Intent/Approval/Run/Evidence; deficits affect success metric. **PASS** (Markdown report with deficit markers).
- **P-04**: No full diff storage; diffHash + PR URL + baseSHA/headSHA only. **PASS** (data model and Risk Engine input).
- **P-05**: ReviewOutput is fixed-schema Findings only; no scoring/ranking. **PASS** (schema in spec and data-model).

Guardrails G-01–G-04 are covered by API gate, storage minimization, fixed ReviewOutput schema, and exception logging.

## Architecture (MVP)

### Components

- **API Server**: Intents, Approvals, AgentRuns, Evidences, Audit, KPI (Next.js API routes under `app/api/`).
- **AI Review Executor**: Runs after AgentRun is created (queued); MVP may run synchronously or via existing Cloud Tasks pattern.
- **DB**: Firestore collections — AgentRun, ReviewOutput, Evidence, Approval, Intent; optional exception_events, audit_exports.
- **UI (Console)**: Policy Console (minimal), Approvals Inbox, Exceptions Inbox, Audit Report Generator; optional Run Detail.

### Data Flow (Run)

1. `POST /api/agent-runs` → gate check (intentId required; Med/High require approvalId).
2. Persist AgentRun with status `queued`.
3. Executor starts → status `running`.
4. On completion → status `completed` + ReviewOutput stored; on failure → status `failed` + errorCode.

## Risk Engine (MVP)

- **Input**: Intent meta (Goal, Constraints, Scope), PR meta (repo, prNumber, diffHash, etc.).
- **Output**: riskLevel (Low / Med / High), reason, requiresApproval (boolean).
- **Implementation**: Rules in DB or config file; Policy Console toggles (ON/OFF). MVP: static rules (e.g. security category, repo allowlist, forbidden paths).

## Data Model / Storage

- **Tables (collections)**: intents, approvals, agent_runs, review_outputs, evidences; optional audit_exports, exception_events.
- **Minimization**: No full diff; diffHash + PR URL + baseSHA/headSHA required.

## Audit Report (MVP)

- **Input**: from, to, scope (repo / env / agent / team).
- **Output**: Markdown; deficits marked (e.g. `❗ Missing: approvalId`).
- **Required sections**: Intent, Approval (when required), AgentRun (model/agent/version/status/time/cost), Evidence (PR URL, diffHash + optional), Findings summary (summary + high-severity excerpt).

## Exceptions (MVP)

- **Types**: Unapproved Med/High run attempt (reject log), Break-glass (post-approval required), Approval expired.
- **UI**: Exceptions Inbox with filters (type, deadline, assignee).

## Idempotency

- `POST /api/agent-runs`: runId as idempotency key; unique constraint; same runId returns same result (status etc.).

## Observability / Metrics

- **Logs**: Intent created, Approval created, Run created, Run rejected, Audit generated; actorId always recorded.
- **KPI**: `/api/kpi/summary` — link rate, approval rate, audit success rate; MVP on-demand aggregation.

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-review-governance/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md          # Created by /speckit.tasks
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── intents/           # POST
│   ├── approvals/         # POST, GET .../inbox
│   ├── agent-runs/        # POST, GET ?from=&to=&scope=
│   ├── evidences/         # POST
│   ├── audit/
│   │   └── report/        # GET ?from=&to=&scope=
│   └── kpi/
│       └── summary/       # GET
├── (dashboard)/
│   ├── policy/            # Policy Console (minimal)
│   ├── approvals/        # Approvals Inbox
│   ├── exceptions/       # Exceptions Inbox
│   └── audit/             # Audit Report Generator
src/
├── models/                # intent, approval, agent-run, review-output, evidence
├── services/
│   ├── intent/
│   ├── approval/
│   ├── agent-run/
│   ├── risk-engine/
│   ├── audit-report/
│   └── kpi/
├── infrastructure/
│   └── firestore/        # new collections
workers/
└── ai-review-executor/   # optional: async executor (or in-process in API)
```

**Structure Decision**: Extend existing Next.js app and `src/` with new API routes and services; new Firestore collections; optional worker for async AI execution. UI lives under existing dashboard layout.

## Milestones (3 days)

- **Day 1**: AgentRun registration + gate (intentId/approval) + DB schema (intents, approvals, agent_runs, review_outputs, evidences).
- **Day 2**: ReviewOutput fixed-schema persistence + Exceptions (reject log, expiry listing).
- **Day 3**: Audit Report (Markdown) + KPI endpoint + minimal UI (Approvals Inbox, Exceptions Inbox, Audit Generator).

## Complexity Tracking

No constitution violations. Optional exception_events/audit_exports and async executor are scope-controlled.
