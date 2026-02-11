# Tasks: WorkLog — Career Assets & Governed AI Review

**Input**: Design documents from `specs/003-worklog-career-ai-governance/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Organization**: Tasks are grouped by user story (US1–US5) so each story can be implemented and tested independently. Execution gate (intentId/approval), audit report, exception handling, and fixed-schema outputs align with Constitution.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5 for user story phases; no label for Setup, Foundational, or Polish
- Include exact file paths in task descriptions

## Path Conventions

- **API routes**: `app/api/<resource>/route.ts` or `app/api/<resource>/<action>/route.ts`
- **Models**: `src/models/<entity>.model.ts`
- **Services**: `src/services/<domain>/<service>.ts`
- **Firestore**: `src/infrastructure/firestore/collections.ts`, `client.ts`
- **UI**: `app/(dashboard)/<page>/page.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and configuration for 003; extend existing WorkLog layout as needed.

- [x] T001 Verify or extend project structure for 003: ensure `app/api/` has routes for intents, approvals, agent-runs, audit/report, kpi/summary, exceptions/inbox, repositories, assets, export, webhooks/github, and `src/models/`, `src/services/` can host intent, approval, agent-run, risk-engine, audit-report, kpi, evidence, exception, provisioning per plan.md

- [x] T002 Verify GitHub OAuth (NextAuth) and session-based auth in `src/auth/` and `app/api/auth/`; ensure actor identity (userId) is available for API routes and audit

- [x] T003 Verify Firestore client and environment configuration in `src/infrastructure/firestore/client.ts` and `.env.local`; ensure collections for 001/002 exist and provisioning_events can be added

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer and core models that all user stories depend on. No user story work until this phase is complete.

- [x] T004 Add Firestore collection and accessor for `provisioning_events` in `src/infrastructure/firestore/collections.ts` with fields per data-model.md (intentId, approvalId, actorId, resourceType, resourceId, resourceUrl, structureType, createdAt)

- [x] T005 [P] Create ProvisioningEvent model and types in `src/models/provisioning-event.model.ts` (eventId, intentId, approvalId, actorId, resourceType, resourceId, resourceUrl, structureType?, createdAt per data-model.md)

- [x] T006 Ensure Intent, Approval, AgentRun models exist in `src/models/intent.model.ts`, `src/models/approval.model.ts`, `src/models/agent-run.model.ts`; add optional intentType or kind field if needed to distinguish review vs project intents per research.md

- [x] T007 Ensure Firestore collections and accessors for intents, approvals, agent_runs, review_outputs, evidences, exception_events exist in `src/infrastructure/firestore/collections.ts`; add any missing 002 collections

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Career Assets from PRs (Priority: P1) — MVP

**Goal**: Requestor connects repositories, receives AssetCards from PR events, approves/edits/rejects, and exports. Each asset traceable to PR; no GitHub provisioning without approval.

**Independent Test**: Connect a repo, trigger PR event, receive asset in inbox, approve or edit, export. Verify asset links to PR and no repo is created without approval.

- [x] T008 [US1] Implement or verify GET /api/repositories and POST /api/repositories in `app/api/repositories/route.ts` and `app/api/repositories/[repositoryId]/route.ts`; connect and disconnect GitHub repos per contracts/api.md

- [x] T009 [US1] Implement or verify GitHub webhook ingestion in `app/api/webhooks/github/route.ts`; validate signature, ingest PR event to Firestore (pr-events), enqueue PR Event Processor task; return 200 quickly

- [x] T010 [US1] Implement or verify PR Event Processor task handler (e.g. `app/api/tasks/pr-event-processor/route.ts`); fetch PR and diff from GitHub, update pr-event, enqueue Asset Generator

- [x] T011 [US1] Implement or verify Asset Generator task in `app/api/tasks/asset-generator/route.ts`; generate AssetCard via Vertex AI (Gemini) with fixed schema, store in asset-cards; idempotent by prEventId

- [x] T012 [US1] Implement or verify GET /api/assets/inbox and GET /api/assets/library in `app/api/assets/inbox/route.ts` and `app/api/assets/library/route.ts`; list pending and approved assets for authenticated user

- [x] T013 [US1] Implement or verify POST /api/assets/[assetCardId]/approve and PUT /api/assets/[assetCardId]/edit in `app/api/assets/[assetCardId]/approve/route.ts` and `app/api/assets/[assetCardId]/edit/route.ts`; update status and decision-logs

- [x] T014 [US1] Implement or verify POST /api/export in `app/api/export/route.ts`; export selected assets as README or resume format per contracts; support copy and download

- [x] T015 [US1] Ensure asset-cards and decision-logs link to PR (repositoryId, prEventId or equivalent) so audit can trace assets to PR and repository per FR-001–FR-004

**Checkpoint**: US1 complete; career assets flow independently testable.

---

## Phase 4: User Story 2 — Low-Risk AI Review with Intent Only (Priority: P2)

**Goal**: Requestor creates intent; system classifies low risk; Requestor submits one run with intentId; system executes once and records run with outcome; no approval required for low risk.

**Independent Test**: Create intent, get low-risk classification, POST agent-runs with intentId only, verify one run stored with PR link and review outcome.

- [x] T016 [P] [US2] Implement or verify Intent model and types in `src/models/intent.model.ts` (goal, constraints, success, riskLevel, requiresApproval, creatorId, timestamps per data-model.md)

- [x] T017 [US2] Implement or verify Intent service (create, get, list) in `src/services/intent/intent.service.ts`; create intent and evaluate risk via risk engine

- [x] T018 [US2] Implement or verify Risk engine (static or configurable rules) in `src/services/risk-engine/risk-engine.service.ts`; input intent/pr meta, output riskLevel (Low/Med/High) and requiresApproval; invoke on intent create

- [x] T019 [US2] Implement or verify POST /api/intents and GET /api/intents in `app/api/intents/route.ts`; request body goal, constraints, success, optional prMeta; response intentId, riskLevel, requiresApproval per contracts

- [x] T020 [US2] Implement or verify AgentRun creation API in `app/api/agent-runs/route.ts` with intentId required (reject 4xx if missing); persist run with status queued in `src/services/agent-run/agent-run.service.ts`

- [x] T021 [US2] Implement or verify AgentRun executor in `src/services/agent-run/executor.service.ts`; transition queued → running → completed/failed; store ReviewOutput with fixed schema; record model/version/toolsSummary; MVP may run synchronously from POST /api/agent-runs

- [x] T022 [US2] Implement or verify GET /api/agent-runs in `app/api/agent-runs/route.ts`; list runs for audit; ensure run is linked to intent and (when required) approval and evidence (PR URL, diffHash) for audit report

**Checkpoint**: US2 complete; low-risk run flow independently testable.

---

## Phase 5: User Story 3 — Approver Approves or Rejects Higher-Risk Runs (Priority: P3)

**Goal**: Higher-risk intents require approval; Approvals Inbox lists pending intents; Approver records approval with template and validity; run without valid approval is rejected and logged as exception.

**Independent Test**: Create Med/High intent, open Approvals Inbox, approve with validTo, POST agent-runs with intentId and approvalId → accepted. POST without approvalId → 400 and exception event.

- [x] T023 [P] [US3] Implement or verify Approval model and types in `src/models/approval.model.ts` (approvalId, intentId, approverId, status, templateAnswers, validFrom, validTo per data-model.md)

- [x] T024 [US3] Implement or verify Approval service (create, getById, listInbox) in `src/services/approval/approval.service.ts`; validate intent exists and is Med/High for create; list intents without decided approval

- [x] T025 [US3] Implement or verify POST /api/approvals and GET /api/approvals/inbox in `app/api/approvals/route.ts` and `app/api/approvals/inbox/route.ts`; request intentId, status, templateAnswers, validTo; response approvalId, intentId, validTo; inbox returns items with intentId, goal, riskLevel, createdAt

- [x] T026 [US3] Enforce approval gate in AgentRun creation in `src/services/agent-run/agent-run.service.ts`: for Med/High intent require valid approvalId; validate approval exists, links to intent, status approved, validTo not expired; reject with 4xx and log to exception_events on violation

- [x] T027 [US3] Implement or verify exception logging in `src/services/exception/exception.service.ts` and from agent-run service: on unapproved Med/High run attempt write to exception_events with type unapproved_attempt (FR-EXC-01); support break_glass and approval_expired types (FR-EXC-02, FR-EXC-03)

- [x] T028 [US3] Implement or verify GET /api/exceptions/inbox in `app/api/exceptions/inbox/route.ts`; return exception events and expired approvals list per contracts

**Checkpoint**: US3 complete; approval gate and exceptions independently testable.

---

## Phase 6: User Story 4 — Project Intent and Provisioning (Priority: P4)

**Goal**: Requestor defines project intent (purpose, scope, constraints, success); system may generate risk/security considerations; no repo creation until human approval; after approval, provisioning creates/initializes GitHub repo and records evidence in provisioning_events.

**Independent Test**: Create project intent, get approval, POST /api/provisioning → 202; after job runs, GET provisioning/events shows event with intentId, approvalId, resourceUrl.

- [x] T029 [US4] Implement optional AI-generated risk/security considerations for project intents in `src/services/intent/` (e.g. call Vertex AI with fixed schema to produce consideration text); store or return with intent; fixed schema, no autonomous decisions per plan

- [x] T030 [US4] Implement provisioning service in `src/services/provisioning/provisioning.service.ts`: validate intentId and approvalId (intent exists, approval exists, status approved, validTo not expired); enqueue provisioning task with idempotency key; do not create repo in API handler

- [x] T031 [US4] Implement POST /api/provisioning in `app/api/provisioning/route.ts`; request body intentId, approvalId, optional repositoryName, structureType; validate approval; enqueue job; return 202 with jobId/intentId per contracts

- [x] T032 [US4] Implement provisioning task handler in `app/api/tasks/provisioning/route.ts` (or Cloud Run worker); create or initialize GitHub repository via GitHub API; apply Speckit bootstrap (specs/, contracts/, etc.) if structureType speackit-ready; idempotent by intentId+scope

- [x] T033 [US4] After successful provisioning in task handler, write to provisioning_events collection in `src/services/provisioning/provisioning.service.ts` or in task: eventId, intentId, approvalId, actorId, resourceType repository, resourceId, resourceUrl, structureType, createdAt

- [x] T034 [US4] Implement GET /api/provisioning/events in `app/api/provisioning/events/route.ts`; list provisioning events with optional from, to, intentId filters for audit

- [x] T035 [US4] Add provisioning events to audit report in `src/services/audit-report/audit-report.service.ts`; include provisioning_events in report for period/scope; mark missing intent/approval links; reflect in success metric

- [x] T036 [US4] Handle partial failures and retries in provisioning task: idempotency key; retry-safe GitHub API calls; on failure do not write provisioning_events; log error for observability

**Checkpoint**: US4 complete; project provisioning independently testable.

---

## Phase 7: User Story 5 — Audit Report and Exceptions Inbox (Priority: P5)

**Goal**: Auditor gets report for time range and scope listing runs and provisioning events with intent, approval, evidence; missing links marked; success metric. SRE sees exceptions inbox (unapproved attempts, break-glass, expired approvals).

**Independent Test**: GET audit/report?from=&to= → report with runs and provisioning events, deficit markers, successMetric. GET exceptions/inbox → items and expiredApprovals.

- [x] T037 [US5] Implement or verify audit report service in `src/services/audit-report/audit-report.service.ts`; query agent_runs (and provisioning_events) in period/scope; for each run load intent, approval, review output, evidences; build Markdown with deficit markers (e.g. Missing: approvalId); compute successMetric (1 if no missing links, 0 otherwise)

- [x] T038 [US5] Implement or verify GET /api/audit/report in `app/api/audit/report/route.ts`; query params from, to required, scope optional; return Markdown or JSON with markdown and successMetric; 400 if from/to missing

- [x] T039 [US5] Implement or verify KPI aggregation in `src/services/kpi/kpi.service.ts`; compute linkRate, approvalRate, auditSuccessRate for period (optional from/to); default last 30 days

- [x] T040 [US5] Implement or verify GET /api/kpi/summary in `app/api/kpi/summary/route.ts`; return linkRate, approvalRate, auditSuccessRate, period per contracts

- [x] T041 [US5] Implement or verify listExceptionEvents and listExpiredApprovals in `src/services/exception/exception.service.ts`; GET /api/exceptions/inbox returns items and expiredApprovals with optional type and limit filters

- [x] T042 [US5] Implement or verify minimal UI for Audit and Exceptions in `app/(dashboard)/audit/page.tsx` and `app/(dashboard)/exceptions/page.tsx`; Audit: from/to/scope input, display report and success metric; Exceptions: list events and expired approvals with type filter; ensure Policy, Approvals Inbox, Inbox, Library, Export pages exist per plan

**Checkpoint**: US5 complete; audit and exceptions independently testable.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Idempotency, security, and validation across all stories.

- [x] T043 Enforce idempotency on all job executions: PR Event Processor, Asset Generator, AgentRun (runId), Provisioning task; document idempotency keys in quickstart or contracts; retry handling in task handlers

- [x] T044 Review access control and security: ensure all API routes use requireAuth or equivalent; no full diff or secrets in store; Firestore rules or app-level checks for userId/actorId scoping per plan

- [x] T045 Optimize cost and performance: bound AI usage (Vertex AI) per run/export; record model and version for audit; API P95 targets per plan; add indexes for audit and list queries if needed

- [x] T046 Run quickstart.md validation: execute career assets flow, execution gate (intentId required, Med/High approval required, idempotency), audit report, KPI, Exceptions Inbox, and provisioning steps; fix gaps in implementation or docs in `specs/003-worklog-career-ai-governance/quickstart.md`

**Checkpoint**: Polish complete; ready for release or next iteration.

---

## Dependencies & Execution Order

### Phase order

- **Phase 1 (Setup)**: No dependencies. Must complete first.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2. Delivers career assets (repos, assets, export).
- **Phase 4 (US2)**: Depends on Phase 2. Delivers intent and low-risk AgentRun gate.
- **Phase 5 (US3)**: Depends on Phase 2 and 4 (needs Intent and AgentRun API). Delivers approvals and exceptions.
- **Phase 6 (US4)**: Depends on Phase 2 and 5 (needs Intent, Approval). Delivers provisioning.
- **Phase 7 (US5)**: Depends on Phase 2–6. Delivers audit report (with provisioning), KPI, Exceptions UI.
- **Phase 8 (Polish)**: Depends on Phase 3–7.

### User story mapping

| Story | Primary tasks   | Done / AC |
|-------|-----------------|-----------|
| US1 Career assets | T008–T015 | Connect repo → PR → assets → approve → export; traceable to PR |
| US2 Low-risk AI review | T016–T022 | Intent + run with intentId only; one run = one record |
| US3 Approver | T023–T028 | Approval gate; Approvals Inbox; exception logging |
| US4 Provisioning | T029–T036 | No repo without approval; provisioning_events; Speckit bootstrap |
| US5 Audit & Exceptions | T037–T042 | Report with deficits; KPI; Exceptions Inbox |

### Parallel opportunities

- T005, T006 can run in parallel within Phase 2.
- T016 (Intent model) can run in parallel with T023 (Approval model) if both in same phase; here they are in different phases.
- Within US4: T029, T030 can run in parallel with other US4 tasks after T031 contract is clear.
- Within US5: T037, T039, T041 can run in parallel (audit service, KPI service, exception list).

### Implementation strategy

**MVP first (US1 only)**  
1. Complete Phase 1 and 2.  
2. Complete Phase 3 (US1).  
3. Validate: connect repo → PR event → asset → approve → export.  
4. Deploy/demo career assets.

**Incremental delivery**  
- After Phase 2: Foundation ready.  
- After Phase 3: Career assets live.  
- After Phase 4: Low-risk AI review live.  
- After Phase 5: Approval gate and exceptions live.  
- After Phase 6: Project provisioning live.  
- After Phase 7: Audit and Exceptions UI live.  
- After Phase 8: Polish and quickstart validated.

---

## Notes

- Tasks use format: `- [ ] T0NN [P?] [USn?] Description with file path`.
- [P] = parallelizable; [USn] = user story for traceability.
- Existing 001/002 implementations may satisfy some tasks; “Implement or verify” means add missing behavior or confirm alignment with contracts and data-model.
- No test tasks were added (spec did not require TDD); add contract or unit tests in a follow-up if desired.
