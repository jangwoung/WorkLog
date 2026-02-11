# Data Model: WorkLog — Career Assets & Governed AI Review

**Branch**: `003-worklog-career-ai-governance` | **Date**: 2026-02-08

## Overview

WorkLog uses **Firestore** for all persistent data. The model unifies:

1. **Career assets** (001): users, repositories, pr-events, asset-cards, decision-logs  
2. **AI review governance** (002): intents, approvals, agent_runs, review_outputs, evidences, exception_events  
3. **Project provisioning** (003): same intents/approvals; new **provisioning_events** for created/initialized GitHub resources

No full PR diff is stored; only identifiers and hashes (diffHash, PR URL, SHAs) for traceability. All collections are scoped by userId or actorId where applicable for isolation and audit.

## Existing Collections (001 / 002)

Refer to existing specs for full field definitions:

- **users** — Authenticated users (e.g. GitHub OAuth); own repositories and assets.
- **repositories** — Connected GitHub repositories; webhook and connection status.
- **pr-events** — Ingested PR events; trigger asset generation and link to asset-cards.
- **asset-cards** — Career assets generated from PRs; status pending/approved/rejected/flagged; traceable to PR.
- **decision-logs** — User decisions on asset-cards (approve, edit, reject).
- **intents** — Purpose, scope, constraints, success criteria; riskLevel (Low/Med/High); requiresApproval; creatorId. Used for AI review runs and for project provisioning.
- **approvals** — Linked to intent; status approved/rejected/sent_back; validFrom/validTo; templateAnswers.
- **agent_runs** — One run per execution; intentId required; approvalId when Med/High; PR refs (repoFullName, prNumber, prUrl, baseSHA, headSHA, diffHash); status; timestamps.
- **review_outputs** — Per run; summary; findings[] (id, category, severity, title, description, evidenceRef, recommendation, confidence); status; errorCode.
- **evidences** — Linked to run or intent; kind (e.g. pr_url, diff_hash); url; hash.
- **exception_events** — type (unapproved_attempt, break_glass, approval_expired); intentId; runId; actorId; resolution; createdAt.

## New Collection: provisioning_events (003)

Records each GitHub resource creation or initialization triggered by an approved project intent. Enables audit (FR-009, SC-001, SC-002).

| Field        | Type      | Description                                      |
|-------------|-----------|--------------------------------------------------|
| eventId     | string    | Document ID                                      |
| intentId    | string    | Reference to Intent that triggered provisioning   |
| approvalId  | string    | Reference to Approval that authorized provisioning |
| actorId     | string    | User who triggered the action                    |
| resourceType| string    | e.g. "repository"                                |
| resourceId  | string    | External ID (e.g. GitHub repo ID)               |
| resourceUrl | string    | e.g. GitHub repo URL                             |
| structureType | string? | e.g. "speckit-ready" if bootstrap applied        |
| createdAt   | timestamp | When the provisioning completed                 |

**Validation**: intentId and approvalId must reference existing documents. resourceUrl must be a valid reference (e.g. HTTPS GitHub URL).

**Relationships**: Many-to-one to Intent; many-to-one to Approval. One provisioning event per provisioned resource (idempotent by intentId + resourceType + scope if needed).

## Intent Usage (Unified)

- **AI review**: Intent created with goal/constraints/success → risk engine sets riskLevel/requiresApproval → Low: AgentRun allowed with intentId only; Med/High: Approval required → AgentRun stores intentId and approvalId.
- **Project provisioning**: Intent created (project purpose, scope, constraints, success) → optional AI-generated risk/security considerations → Approval required → Provisioning worker creates/initializes repo → provisioning_events record with intentId, approvalId, resourceUrl, structureType.

Intent document shape remains the same; differentiation is by which API or flow uses it (review vs provisioning).

## Validation Rules (from Requirements)

- **AgentRun**: intentId required; approvalId required when intent.riskLevel is Med or High; runId unique (idempotency).
- **ReviewOutput**: findings[].severity and findings[].evidenceRef required; fixed schema only.
- **Provisioning**: No repository create/update without valid intent and approval; every provisioning action must have a provisioning_events record.
- **Evidence**: Only references and hashes stored; no full diff or raw secrets.

## Relationships (Conceptual)

- User → Repositories (1:*), AssetCards (1:*), Intents (1:*), DecisionLogs (1:*)
- Repository → PREvents (1:*)
- PREvent → AssetCard (0..1)
- Intent → Approvals (0..* for Med/High), AgentRuns (1:*), ProvisioningEvents (0..* when type is project)
- Approval → AgentRuns (0..*), ProvisioningEvents (0..*)
- AgentRun → ReviewOutput (0..1), Evidences (0..*)
- ExceptionEvent → references intentId, runId, actorId
