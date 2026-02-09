# API Contracts: AI Review MVP — Intent / Approval / AgentRun / Audit

**Branch**: `002-ai-review-governance` | **Created**: 2026-02-08

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://[domain]/api`

## Authentication

All endpoints require authentication (e.g. NextAuth session). Actor identity (actorId) is taken from session for audit.

---

## Intents

### POST /api/intents

Create an Intent (Goal, Constraints, Success). Risk engine evaluates and sets riskLevel/requiresApproval.

**Request body**:
```json
{
  "goal": "string",
  "constraints": {},
  "success": "string",
  "prMeta": {
    "repoFullName": "string",
    "prNumber": 0,
    "prUrl": "string",
    "baseSHA": "string",
    "headSHA": "string",
    "diffHash": "string"
  }
}
```

**Response** `201`:
```json
{
  "intentId": "string",
  "riskLevel": "Low|Med|High",
  "requiresApproval": false
}
```

**Errors**: `400` invalid input; `401` unauthenticated.

---

## Approvals

### POST /api/approvals

Create an Approval for a Med/High Intent (template answers, validity window).

**Request body**:
```json
{
  "intentId": "string",
  "status": "approved|rejected|sent_back",
  "templateAnswers": {},
  "validTo": "ISO8601"
}
```

**Response** `201`:
```json
{
  "approvalId": "string",
  "intentId": "string",
  "validTo": "ISO8601"
}
```

**Errors**: `400` invalid intent or missing fields; `404` intent not found; `401` unauthenticated.

### GET /api/approvals/inbox

List approval requests (e.g. Med/High Intents without a decided Approval).

**Query**: Optional `status`, `assignee`.

**Response** `200`:
```json
{
  "items": [
    {
      "intentId": "string",
      "goal": "string",
      "riskLevel": "Med|High",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

## Agent Runs

### POST /api/agent-runs

Create and optionally execute an AgentRun. **intentId required**. Med/High require **approvalId**. runId is idempotency key.

**Request body**:
```json
{
  "runId": "string",
  "intentId": "string",
  "approvalId": "string?",
  "repoFullName": "string",
  "prNumber": 0,
  "prUrl": "string",
  "baseSHA": "string",
  "headSHA": "string",
  "diffHash": "string",
  "agentName": "string",
  "agentVersion": "string",
  "model": "string"
}
```

**Response** `201` (new run):
```json
{
  "runId": "string",
  "status": "queued|running|completed|failed",
  "intentId": "string"
}
```

**Response** `200` (idempotent: same runId already exists): same body as existing run.

**Errors**:
- `400` missing intentId → reject, log exception.
- `400` Med/High without valid approvalId → reject, log exception.
- `404` intentId or approvalId not found.
- `409` or unique violation: treat as idempotent and return 200 with existing run (per implementation choice).

### GET /api/agent-runs

List runs for audit/reporting. **Query**: `from`, `to` (ISO8601), `scope` (e.g. repo, agent).

**Response** `200`:
```json
{
  "runs": [
    {
      "runId": "string",
      "intentId": "string",
      "approvalId": "string?",
      "status": "string",
      "repoFullName": "string",
      "prNumber": 0,
      "createdAt": "ISO8601"
    }
  ]
}
```

---

## Evidences

### POST /api/evidences

Attach Evidence to an AgentRun (or other linked entity).

**Request body**:
```json
{
  "linkedType": "agent_run",
  "linkedId": "string",
  "kind": "pr_url|diff_hash|ci_result|issue",
  "url": "string?",
  "hash": "string?"
}
```

**Response** `201`:
```json
{
  "evidenceId": "string",
  "linkedId": "string",
  "createdAt": "ISO8601"
}
```

---

## Audit Report

### GET /api/audit/report

Generate audit report for period and scope. Output Markdown; deficits marked (e.g. `❗ Missing: approvalId`).

**Query**: `from`, `to` (required), `scope` (optional: repo, env, agent, team).

**Response** `200`:
- Content-Type: `text/markdown` (or application/json with markdown field).
- Body: Markdown report with Intent / Approval / AgentRun / Evidence per run; missing links clearly indicated.
- Report success metric: 1 if no missing required links, 0 otherwise (or per-run deficit count).

**Errors**: `400` missing from/to; `401` unauthenticated.

---

## KPI

### GET /api/kpi/summary

Aggregate KPI: link rate, approval rate, audit success rate. MVP: on-demand aggregation.

**Query**: Optional `from`, `to` for period.

**Response** `200`:
```json
{
  "linkRate": 0.0,
  "approvalRate": 0.0,
  "auditSuccessRate": 0.0,
  "period": { "from": "ISO8601", "to": "ISO8601" }
}
```

- linkRate = AgentRuns with intentId / total AgentRuns
- approvalRate = (Med/High runs with approvalId) / (Med/High runs total)
- auditSuccessRate = (reports with no missing links) / (report requests) — or derived from last N reports

**Errors**: `401` unauthenticated.
