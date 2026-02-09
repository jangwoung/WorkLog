# Quickstart: AI Review MVP — Intent / Approval / AgentRun / Audit

**Branch**: `002-ai-review-governance` | **Date**: 2026-02-08

## Prerequisites

- Node 20.x, npm (or equivalent)
- Firestore emulator or project with collections: `intents`, `approvals`, `agent_runs`, `review_outputs`, `evidences`, `exception_events`
- NextAuth (or same auth as WorkLog) configured for actor identity

**Note**: All API endpoints below require an authenticated session (e.g. cookie). Use the same origin as the app (e.g. `http://localhost:3000`) and a logged-in browser session, or send session cookie with requests.

## Setup

1. Checkout branch: `002-ai-review-governance`
2. Install dependencies: `npm install`
3. Configure environment: copy `.env.example` to `.env.local` and set Firestore and NextAuth vars
4. Run Firestore rules/config for new collections if your project uses them
5. Start dev server: `npm run dev`

## Verify execution gate (Day 1)

### 1. Create Intent

`POST /api/intents` with body (required: `goal`, `success`; optional: `constraints`, `prMeta`).

Example (minimal):

```json
{
  "goal": "Review PR for security issues",
  "constraints": {},
  "success": "No high-severity findings"
}
```

Example (with prMeta for risk evaluation):

```json
{
  "goal": "Review PR for security issues",
  "constraints": {},
  "success": "No high-severity findings",
  "prMeta": {
    "repoFullName": "owner/repo",
    "prNumber": 1,
    "prUrl": "https://github.com/owner/repo/pull/1",
    "baseSHA": "abc123",
    "headSHA": "def456",
    "diffHash": "sha256..."
  }
}
```

- **Expect**: `201` and `{ "intentId": "...", "riskLevel": "Low"|"Med"|"High", "requiresApproval": true|false }`. Note `intentId` and `riskLevel` for later steps.

### 2. Create AgentRun without intentId

`POST /api/agent-runs` with body **omitting** `intentId` (e.g. include other required fields but remove intentId).

- **Expect**: `400` and no run created. Error body includes message that intentId is required.

### 3. Create AgentRun with intentId (Low risk)

For a **Low-risk** intent (from step 1), call:

`POST /api/agent-runs` with body:

```json
{
  "runId": "run-idempotent-1",
  "intentId": "<intentId from step 1>",
  "repoFullName": "owner/repo",
  "prNumber": 1,
  "prUrl": "https://github.com/owner/repo/pull/1",
  "baseSHA": "abc",
  "headSHA": "def",
  "diffHash": "h1",
  "agentName": "mvp-stub",
  "agentVersion": "1.0",
  "model": "stub"
}
```

- **Expect**: `201` and `{ "runId": "...", "status": "completed"|"queued", "intentId": "..." }`. MVP executor runs synchronously, so status may be `completed`. Run is stored with `intentId`.

### 4. Create AgentRun for Med/High without approvalId

Create a **Med or High** intent (e.g. use goal containing "security" or "compliance" to get Med/High from risk engine). Then:

`POST /api/agent-runs` with that `intentId` and **no** `approvalId`.

- **Expect**: `400`. An entry is written to `exception_events` with type `unapproved_attempt`.

### 5. Create Approval then AgentRun (Med/High)

1. `POST /api/approvals` with body:

```json
{
  "intentId": "<Med/High intentId>",
  "status": "approved",
  "templateAnswers": {},
  "validTo": "2026-12-31T23:59:59.000Z"
}
```

- **Expect**: `201` and `{ "approvalId": "...", "intentId": "...", "validTo": "..." }`.

2. `POST /api/agent-runs` with same `intentId`, the new `approvalId`, and required PR/agent fields.

- **Expect**: `201`.

### 6. Idempotency

Send the **same** `POST /api/agent-runs` **twice** with the **same** `runId` (and same intentId, approvalId if needed, etc.).

- **Expect**: First response `201`; second response `200` with same run (no duplicate run created).

## Verify audit report (Day 3)

### 1. Generate report

`GET /api/audit/report?from=<ISO8601>&to=<ISO8601>` (optional: `&scope=owner/repo`).

Example: `GET /api/audit/report?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.999Z`

- **Expect**: Markdown (or JSON with `markdown` and `successMetric` if `Accept: application/json`). Report lists runs with Intent/Approval/Run/Evidence; any missing link marked (e.g. `❗ Missing: approvalId`). `successMetric` is 1 when no missing required links, 0 otherwise.

### 2. KPI

`GET /api/kpi/summary` or `GET /api/kpi/summary?from=<ISO8601>&to=<ISO8601>`.

- **Expect**: `200` and `{ "linkRate": number, "approvalRate": number, "auditSuccessRate": number, "period": { "from": "...", "to": "..." } }`.

## Verify Exceptions Inbox (Day 2)

1. **Unapproved attempt**: Trigger step 4 (Med/High run without approvalId). Then open **Exceptions** page in UI or `GET /api/exceptions/inbox`. Expect an entry for the reject (type `unapproved_attempt`).

2. **Break-glass**: MVP records break-glass via service (`logBreakGlass`); there is no public “break-glass run” API in MVP. Exceptions Inbox can show type `break_glass` if such events were logged elsewhere.

3. **Approval expiry**: Create an Approval with `validTo` in the past or a short window. Call `GET /api/exceptions/inbox`. Response includes `expiredApprovals` array; confirm expired approvals appear there.

## Milestones checklist

Use this to confirm each phase after running the steps above:

- [ ] **Day 1**: AgentRun registration + gate (intentId required, Med/High require approval) + idempotency; DB collections in use
- [ ] **Day 2**: ReviewOutput fixed schema + Exception events (unapproved_attempt, expired approvals list)
- [ ] **Day 3**: Audit Report (Markdown, deficits marked) + KPI + minimal UI (Policy, Approvals Inbox, Exceptions Inbox, Audit Generator)

## Validation summary (T017)

The implementation has been checked against this quickstart:

- **Gate**: Missing `intentId` → 400; Med/High without valid `approvalId` → 400 and `exception_events` entry; idempotent `runId` → 200 on repeat.
- **Audit**: `GET /api/audit/report?from=&to=` returns Markdown and success metric; deficits highlighted.
- **KPI**: `GET /api/kpi/summary` returns linkRate, approvalRate, auditSuccessRate and period.
- **Exceptions**: `GET /api/exceptions/inbox` returns `items` (exception events) and `expiredApprovals`.

Gaps fixed in this doc: added auth note, example request bodies, optional vs required fields, and Exceptions/expiredApprovals behaviour.
