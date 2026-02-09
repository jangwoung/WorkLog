# Data Model: AI Review MVP — Intent / Approval / AgentRun / Audit

**Branch**: `002-ai-review-governance` | **Date**: 2026-02-08

## Overview

Data is **AgentRun-centric**: each run is one document with references to Intent and optional Approval; ReviewOutput and Evidence are stored as subcollections or linked documents. No full PR diff is stored (diffHash + PR URL + SHAs only).

## Collections (Firestore)

### intents

| Field | Type | Description |
|-------|------|-------------|
| intentId | string | Document ID |
| goal | string | Goal of the review |
| constraints | map/array | Scope and constraints |
| success | string | Success criteria |
| riskLevel | string | Low \| Med \| High (set by risk engine) |
| requiresApproval | boolean | Derived from riskLevel |
| creatorId | string | actorId of Requestor |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### approvals

| Field | Type | Description |
|-------|------|-------------|
| approvalId | string | Document ID |
| intentId | string | Reference to Intent |
| approverId | string | actorId of Approver |
| status | string | approved \| rejected \| sent_back |
| templateAnswers | map | Answers to 1–3 template questions |
| validFrom | timestamp | |
| validTo | timestamp | Validity window; expiry detectable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### agent_runs

| Field | Type | Description |
|-------|------|-------------|
| runId | string | Document ID; idempotency key |
| intentId | string | Required; reference to Intent |
| approvalId | string? | Required when Intent is Med/High |
| actorType | string | |
| actorId | string | Who requested the run |
| agentName | string | |
| agentVersion | string | |
| model | string | |
| repoFullName | string | |
| prNumber | number | |
| prUrl | string | |
| baseSHA | string | |
| headSHA | string | |
| diffHash | string | No full diff stored |
| status | string | queued \| running \| completed \| failed \| cancelled |
| startedAt | timestamp? | |
| endedAt | timestamp? | |
| toolsSummary | string? | |
| costEstimate | number? | |
| errorCode | string? | rate_limit \| timeout \| policy_block \| ... |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### review_outputs

Stored per run (subcollection under `agent_runs/{runId}/review_outputs` or single doc reference).

| Field | Type | Description |
|-------|------|-------------|
| summary | string | |
| findings | array | See Finding schema below |
| safeToProceed | boolean? | Advisory |
| status | string | completed \| failed \| cancelled |
| errorCode | string? | When status = failed |

**Finding** (element of findings array):

| Field | Type | Description |
|-------|------|-------------|
| id | string | |
| category | string | |
| severity | string | |
| title | string | |
| description | string | |
| evidenceRef | string | Reference to Evidence or inline ref |
| recommendation | string | |
| confidence | number? | Optional |

### evidences

| Field | Type | Description |
|-------|------|-------------|
| evidenceId | string | Document ID |
| linkedType | string | e.g. agent_run |
| linkedId | string | e.g. runId |
| kind | string | e.g. pr_url, diff_hash, ci_result |
| url | string? | PR URL etc. |
| hash | string? | diffHash etc. |
| createdAt | timestamp | |

### exception_events (optional)

| Field | Type | Description |
|-------|------|-------------|
| eventId | string | Document ID |
| type | string | unapproved_attempt \| break_glass \| approval_expired |
| intentId | string? | |
| runId | string? | |
| actorId | string | |
| resolution | string? | approved \| rejected \| sent_back (when resolved) |
| createdAt | timestamp | |

### audit_exports (optional)

| Field | Type | Description |
|-------|------|-------------|
| exportId | string | Document ID |
| from | timestamp | |
| to | timestamp | |
| scope | map | repo / env / agent / team filters |
| requestedBy | string | actorId |
| createdAt | timestamp | |

## Relationships

- **Intent** 1 — * **Approval** (for Med/High)
- **Intent** 1 — * **AgentRun** (each run has one intentId)
- **AgentRun** 1 — 1 **ReviewOutput** (when completed/failed)
- **AgentRun** 1 — * **Evidence**
- **Exception event** references intentId and/or runId

## Validation (from requirements)

- AgentRun: intentId required; approvalId required when Intent.riskLevel is Med or High.
- AgentRun: runId unique (idempotency).
- ReviewOutput: findings[].severity and findings[].evidenceRef required.
- No full diff: only diffHash, prUrl, baseSHA, headSHA stored for PR context.
