# Quickstart: WorkLog — Career Assets & Governed AI Review

**Branch**: `003-worklog-career-ai-governance` | **Date**: 2026-02-08

## Prerequisites

- Node 20.x, npm
- Firestore (emulator or project) with collections: users, repositories, pr-events, asset-cards, intents, approvals, agent_runs, review_outputs, evidences, exception_events, provisioning_events
- NextAuth (GitHub OAuth) configured
- (Optional) Cloud Tasks and workers for background jobs

All API calls require an authenticated session (same origin + logged-in user or session cookie).

## Setup

1. Checkout branch: `003-worklog-career-ai-governance`
2. Install dependencies: `npm install`
3. Configure `.env.local` (Firestore, NextAuth, GitHub, Vertex AI if used)
4. Start dev server: `npm run dev`

## Verify Career Assets Flow (P1)

1. **Connect repository**: `POST /api/repositories` with `{ "owner", "name" }` → expect 201.
2. **Trigger PR event** (or use webhook simulator): `POST /api/webhooks/github` with PR payload → expect 200; job enqueued.
3. **Inbox**: `GET /api/assets/inbox` → expect list including new asset (after job runs).
4. **Approve**: `POST /api/assets/[assetCardId]/approve` → expect 200; asset moves to library.
5. **Export**: `POST /api/export` with format and selected IDs → expect export output.

## Verify Execution Gate (AI Review)

1. **Create Intent**: `POST /api/intents` with goal, constraints, success (and optional prMeta) → expect 201 and intentId, riskLevel.
2. **Run without intentId**: `POST /api/agent-runs` with body omitting intentId → expect 400.
3. **Low-risk run**: For a Low intent, `POST /api/agent-runs` with intentId and required PR/agent fields → expect 201; run stored and (if executor runs) completed.
4. **Med/High without approval**: For Med/High intent, `POST /api/agent-runs` without approvalId → expect 400; exception event recorded.
5. **Approval then run**: `POST /api/approvals` with intentId, status approved, validTo → then `POST /api/agent-runs` with same intentId and approvalId → expect 201.
6. **Idempotency**: Same `POST /api/agent-runs` twice with same runId → second response 200, same run.

## Verify Audit & Exceptions

1. **Audit report**: `GET /api/audit/report?from=...&to=...` → expect Markdown (or JSON) with runs and deficit markers; successMetric 0 or 1.
2. **KPI**: `GET /api/kpi/summary` → expect linkRate, approvalRate, auditSuccessRate, period.
3. **Exceptions inbox**: After an unapproved Med/High attempt, `GET /api/exceptions/inbox` → expect entry for that attempt; expired approvals listed if any.

## Verify Project Provisioning (003)

1. **Create project intent**: `POST /api/intents` with goal/constraints/success for a new project.
2. **Approve**: `POST /api/approvals` with that intentId, status approved, validTo.
3. **Trigger provisioning**: `POST /api/provisioning` with intentId and approvalId → expect 202 (job enqueued).
4. **List events**: `GET /api/provisioning/events` (after job runs) → expect event with intentId, approvalId, resourceUrl.
5. **Audit**: Audit report (when extended for provisioning) should list provisioning events with intent and approval links.

## Milestones Checklist

- [ ] Career assets: connect repo → PR event → asset in inbox → approve → library → export
- [ ] Gate: intentId required; Med/High require approval; idempotent runId
- [ ] Audit: report with runs and deficit markers; successMetric; KPI
- [ ] Exceptions: unapproved attempts and expired approvals visible
- [ ] Provisioning: no repo create without approval; provisioning_events recorded
