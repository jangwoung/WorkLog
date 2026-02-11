# API Contracts: WorkLog — Career Assets & Governed AI Review

**Branch**: `003-worklog-career-ai-governance` | **Created**: 2026-02-08

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://[domain]/api`

## Authentication

All endpoints require authentication (e.g. NextAuth GitHub OAuth session). Actor identity (actorId/userId) is taken from session for ownership and audit.

---

## Repositories (Career Assets)

### GET /api/repositories

List connected GitHub repositories for the authenticated user.

**Response** `200`: `{ "repositories": [ { repositoryId, fullName, connectionStatus, ... } ] }`

### POST /api/repositories

Connect a GitHub repository (owner, name). Only connected repos trigger PR-based asset generation.

**Request body**: `{ "owner": "string", "name": "string" }`  
**Response** `201`: repository record  
**Errors**: `400` invalid input; `401` unauthenticated

### DELETE /api/repositories/[repositoryId]

Disconnect a repository. Stops PR event processing for that repo.

**Response** `200` or `204`  
**Errors**: `404` not found; `401` unauthenticated

---

## Assets (Career Assets)

### GET /api/assets/inbox

List pending asset-cards for the user (status pending/flagged).

**Response** `200`: `{ "assets": [ ... ] }`

### GET /api/assets/library

List approved/edited asset-cards (library).

**Response** `200`: `{ "assets": [ ... ] }`

### POST /api/assets/[assetCardId]/approve

Approve an asset; moves it to library.

**Response** `200`  
**Errors**: `404` not found; `401` unauthenticated

### PUT /api/assets/[assetCardId]/edit

Edit an asset (e.g. title, description, impact); saved to library.

**Request body**: Patch fields.  
**Response** `200`  
**Errors**: `400` invalid input; `404`; `401`

### POST /api/export

Export selected assets (README or resume format). Request body specifies format and asset IDs.

**Response** `200`: Export payload or file  
**Errors**: `400` invalid selection; `401` unauthenticated

---

## Intents

### POST /api/intents

Create an Intent (goal, constraints, success). Risk engine sets riskLevel and requiresApproval. Used for AI review and (with type/kind) for project provisioning.

**Request body**: `{ "goal": "string", "constraints": {}|[], "success": "string", "prMeta": { ... }? }`  
**Response** `201`: `{ "intentId": "string", "riskLevel": "Low|Med|High", "requiresApproval": boolean }`  
**Errors**: `400` invalid input; `401` unauthenticated

### GET /api/intents

List intents for the authenticated user.

**Response** `200`: `{ "intents": [ ... ] }`

---

## Approvals

### POST /api/approvals

Create an Approval for a Med/High Intent (or project intent). Required before AgentRun or provisioning when risk requires it.

**Request body**: `{ "intentId": "string", "status": "approved|rejected|sent_back", "templateAnswers": {}, "validTo": "ISO8601" }`  
**Response** `201`: `{ "approvalId": "string", "intentId": "string", "validTo": "ISO8601" }`  
**Errors**: `400` invalid intent or missing fields; `404` intent not found; `401` unauthenticated

### GET /api/approvals/inbox

List approval requests (Med/High intents without a decided approval; optionally project intents pending approval).

**Response** `200`: `{ "items": [ { intentId, goal, riskLevel, createdAt } ] }`

---

## Agent Runs (AI Review)

### POST /api/agent-runs

Create and run one AI review execution. intentId required; approvalId required when intent is Med/High. runId is idempotency key.

**Request body**: `{ "runId"?: "string", "intentId": "string", "approvalId"?: "string", "repoFullName", "prNumber", "prUrl", "baseSHA", "headSHA", "diffHash", "agentName", "agentVersion", "model" }`  
**Response** `201` (new run) or `200` (idempotent): `{ "runId": "string", "status": "queued|running|completed|failed", "intentId": "string" }`  
**Errors**: `400` missing intentId or invalid approval; `404` intent/approval not found; `401` unauthenticated

### GET /api/agent-runs

List runs (for audit/reporting). Query: optional `limit`, `from`, `to`, `scope`.

**Response** `200`: `{ "runs": [ { runId, intentId, approvalId?, status, repoFullName, prNumber, createdAt } ] }`

---

## Evidences

### POST /api/evidences

Attach evidence to a run or intent (e.g. pr_url, diff_hash).

**Request body**: `{ "linkedType": "agent_run"|"intent", "linkedId": "string", "kind": "string", "url"?: "string", "hash"?: "string" }`  
**Response** `201`: `{ "evidenceId": "string", "linkedId": "string", "createdAt": "ISO8601" }`

---

## Audit & KPI

### GET /api/audit/report

Generate audit report for period and scope. Lists runs (and optionally provisioning events) with intent, approval, evidence; marks missing links.

**Query**: `from`, `to` (required, ISO8601), `scope` (optional, e.g. repo).  
**Response** `200`: Markdown or JSON with `markdown` and `successMetric` (1 = no missing links, 0 = deficiencies).  
**Errors**: `400` missing from/to; `401` unauthenticated

### GET /api/kpi/summary

Aggregate KPI: link rate, approval rate, audit success rate.

**Query**: Optional `from`, `to`.  
**Response** `200`: `{ "linkRate": number, "approvalRate": number, "auditSuccessRate": number, "period": { "from": "ISO8601", "to": "ISO8601" } }`

---

## Exceptions

### GET /api/exceptions/inbox

List exception events (unapproved attempts, break-glass, approval expired) and expired approvals.

**Query**: Optional `type`, `limit`.  
**Response** `200`: `{ "items": [ ... ], "expiredApprovals": [ ... ] }`

---

## Provisioning (003)

### POST /api/provisioning

Trigger GitHub repository creation or initialization for an approved project intent. Requires valid intentId and approvalId; runs asynchronously (job enqueued). Idempotent by request key if provided.

**Request body**: `{ "intentId": "string", "approvalId": "string", "repositoryName"?: "string", "structureType"?: "speckit-ready" }`  
**Response** `202`: `{ "jobId": "string", "intentId": "string", "message": "Provisioning enqueued" }`  
**Errors**: `400` intent not approved or approval expired; `404` intent/approval not found; `401` unauthenticated

### GET /api/provisioning/events

List provisioning events (for audit). Query: optional `from`, `to`, `intentId`.

**Response** `200`: `{ "events": [ { eventId, intentId, approvalId, resourceUrl, structureType, createdAt } ] }`

---

## Webhooks & Tasks (Internal / Background)

### POST /api/webhooks/github

Receive GitHub webhook (e.g. PR events). Validates signature; ingests event; enqueues PR Event Processor. Returns 200 quickly.

### POST /api/tasks/pr-event-processor

Cloud Tasks: process PR event (fetch PR/diff, enqueue asset generator). Idempotent by prEventId.

### POST /api/tasks/asset-generator

Cloud Tasks: generate AssetCard via LLM; store in asset-cards. Idempotent.

### POST /api/tasks/provisioning

Cloud Tasks (003): create/initialize GitHub repo; write provisioning_events record. Idempotent.
