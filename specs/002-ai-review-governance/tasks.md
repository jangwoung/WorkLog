# Tasks: AI Review (PR Analysis) MVP — Intent / Approval / AgentRun / Audit

**Input**: Design documents from `specs/002-ai-review-governance/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md  

**Organization**: Tasks follow **統制ゲート → 保存 → 例外 → 監査**. Each block has clear Done conditions tied to AC/KPI.  
**Implementation order**: Day1 (gate + persistence) → Day2 (executor + output + evidence + exceptions) → Day3 (audit + KPI + UI) → Polish → Stretch.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = Requestor Low-risk run, US2 = Approver Med/High, US3 = Auditor report, US4 = SRE exceptions
- All tasks include concrete file paths

## Path Conventions

- **API routes**: `app/api/<resource>/route.ts` or `app/api/<resource>/<action>/route.ts`
- **Models**: `src/models/<entity>.model.ts`
- **Services**: `src/services/<domain>/`
- **Firestore**: `src/infrastructure/firestore/collections.ts` (extend with new collections)
- **UI**: `app/(dashboard)/<page>/page.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure project structure is ready for 002; no new repo init (extend existing WorkLog).

- [x] T001 Verify project structure for 002: ensure `app/api/` has place for intents, approvals, agent-runs, evidences, audit/report, kpi/summary and `src/models/`, `src/services/` can host intent, approval, agent-run, risk-engine, audit-report, evidence per plan.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema and collections MUST be in place before any user story API or executor.

**Done condition**: Migration/collection creation applied; CRUD possible for all MVP collections.

- [x] T002 Add Firestore collections and accessors for intents, approvals, agent_runs, review_outputs, evidences, exception_events in `src/infrastructure/firestore/collections.ts` (and optional audit_exports); ensure document IDs and field names match data-model.md. Done: CRUD possible for each collection.

---

## Phase 3: Day1 — Gate and Persistence Foundation (US1, US2)

**Goal**: Execution gate (intentId required; Med/High require Approval) and persistence for Intents/Approvals/AgentRuns.  
**Done conditions**: AC-01 (no run without intentId, 4xx), AC-02 (no Med/High run without approval, 4xx); intentId and list of intents available; risk evaluable; approvals and inbox available.

### Models and services

- [x] T003 [P] [US1] Create Intent model and types in `src/models/intent.model.ts` (goal, constraints, success, riskLevel, requiresApproval, creatorId, timestamps per data-model.md)
- [x] T004 [P] [US1] Create Approval model and types in `src/models/approval.model.ts` (approvalId, intentId, approverId, status, templateAnswers, validFrom, validTo per data-model.md)
- [x] T005 [P] [US1] Create AgentRun, ReviewOutput, and Evidence models in `src/models/agent-run.model.ts`, `src/models/review-output.model.ts`, `src/models/evidence.model.ts` per data-model.md (no full diff; diffHash + prUrl + baseSHA/headSHA)

### Intents and risk

- [x] T006 [US1] Implement Intent service (create, get, list) and POST /api/intents in `src/services/intent/intent.service.ts` and `app/api/intents/route.ts`. Request: goal, constraints, success, prMeta (repoFullName, prNumber, prUrl, baseSHA, headSHA, diffHash). Response: intentId, riskLevel, requiresApproval. Done: intentId returned; intents listable (e.g. GET or list in UI).

- [x] T007 [US1] Implement Risk engine (MVP static rules) in `src/services/risk-engine/` (e.g. `risk-engine.service.ts`). Input: Intent meta + PR meta; output: riskLevel (Low/Med/High), reason, requiresApproval. Invoke on Intent create or on Run create. Done: risk determinable at Intent create or AgentRun create.

### Approvals (US2)

- [x] T008 [US2] Implement Approval service and POST /api/approvals plus GET /api/approvals/inbox in `src/services/approval/approval.service.ts` and `app/api/approvals/route.ts`, `app/api/approvals/inbox/route.ts`. Done: approvalId returned; Approvals Inbox returns items (e.g. Med/High intents without decided approval).

### AgentRun gate (FR-RUN-01/02/03, AC-01/02)

- [x] T009 [US1] Implement AgentRun gate and POST /api/agent-runs in `src/services/agent-run/agent-run.service.ts` and `app/api/agent-runs/route.ts`. Enforce: intentId required (FR-RUN-01 → 4xx + log if missing); Med/High require valid approvalId (FR-RUN-02 → 4xx + exception log); runId idempotency (FR-RUN-03). Persist run with status queued. Done: AC-01 and AC-02 satisfied (4xx for missing intentId or missing approval for Med/High).

**Checkpoint**: Gate and persistence foundation ready; no AI execution yet.

---

## Phase 4: Day2 — Executor, ReviewOutput, Evidence, Exceptions (US1, US2, US4)

**Goal**: One execution = one AgentRun (AC-03); fixed ReviewOutput; Evidence linkable; exception data for Exceptions Inbox.  
**Done conditions**: AC-03; audit can show summary + high-severity findings; PR URL + diffHash in audit; Exceptions Inbox has reject/break-glass/expiry data.

### Executor and ReviewOutput

- [x] T010 [US1] Implement AI review executor (queued → running → completed/failed) in `src/services/agent-run/executor.service.ts` or `workers/ai-review-executor/src/index.ts`. Update AgentRun status; record agentName, agentVersion, model, toolsSummary. MVP may run synchronously from POST /api/agent-runs. Done: 1 run = 1 AgentRun (AC-03).

- [x] T011 [US1] Persist ReviewOutput with fixed schema (summary, findings[] with id, category, severity, title, description, evidenceRef, recommendation, confidence; status, errorCode) in `src/services/agent-run/` and Firestore review_outputs (or subcollection). FR-OUT-01/02/03/04. Done: audit can show summary and high-severity excerpt.

### Evidence

- [x] T012 [US2] [US3] Implement Evidence service and POST /api/evidences in `src/services/evidence/evidence.service.ts` and `app/api/evidences/route.ts`. Link to agent_run (or intent) via linkedType/linkedId; store kind, url, hash. Done: PR URL and diffHash can appear in audit output (FR-EVI-01/02).

### Exceptions (US4)

- [x] T013 [US4] Implement exception logging: on unapproved Med/High run attempt write to exception_events (FR-EXC-01); on break-glass run record post-hoc approval required and surface in Exceptions (FR-EXC-02); detect Approval expiry and list in Exceptions (FR-EXC-03). Implement in `src/services/exception/` or write to `exception_events` from agent-run service. Done: Exceptions Inbox can list reject logs, break-glass items, expired approvals.

**Checkpoint**: Execution, output, evidence, and exceptions are stored; audit and UI can consume them.

---

## Phase 5: Day3 — Audit, KPI, Minimal UI (US3, US2, US4)

**Goal**: Audit report with deficit markers (AC-04); KPI summary (AC-05); minimal UI for Policy, Approvals Inbox, Exceptions Inbox, Audit Generator.  
**Done conditions**: AC-04 (Markdown report, deficits marked); AC-05 (KPI available); main user flows touchable in UI.

### Audit and KPI

- [x] T014 [US3] Implement audit report service and GET /api/audit/report in `src/services/audit-report/audit-report.service.ts` and `app/api/audit/report/route.ts`. Query params: from, to, scope. Output: Markdown with Intent/Approval/Run/Evidence per run; mark missing links (e.g. `❗ Missing: approvalId`). Done: AC-04 (Markdown output, chain visible, deficits highlighted).

- [x] T015 Implement KPI aggregation and GET /api/kpi/summary in `src/services/kpi/kpi.service.ts` and `app/api/kpi/summary/route.ts`. Return linkRate, approvalRate, auditSuccessRate (optional from/to). Done: AC-05.

### Minimal UI

- [x] T016 [US2] [US4] [US3] Implement minimal UI: Policy Console (rules ON/OFF) in `app/(dashboard)/policy/page.tsx`; Approvals Inbox (list, approve/reject/send back) in `app/(dashboard)/approvals/page.tsx`; Exceptions Inbox (list by type/deadline/assignee) in `app/(dashboard)/exceptions/page.tsx`; Audit Report Generator (from/to/scope input, display report) in `app/(dashboard)/audit/page.tsx`. Done: main use cases (approve, triage exceptions, generate audit) are touchable in the UI.

**Checkpoint**: Audit, KPI, and minimal UI complete; MVP demonstrable.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Validation and consistency.

- [x] T017 Run quickstart.md validation: execute gate checks (intentId required, Med/High approval required, idempotency), audit report generation, KPI, and Exceptions Inbox steps; fix any gaps in implementation or docs in `specs/002-ai-review-governance/quickstart.md`

---

## Stretch (Optional)

- [ ] T018 [Stretch] Implement PR→Intent draft generation in `src/services/intent/` (e.g. from PR meta + template produce draft Goal/Constraints/Success). Expose so user can paste result into Intent create form. Done: generated draft can be used in Intent creation UI.

---

## Dependencies & Execution Order

### Phase order

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. **Blocks** all later phases.
- **Phase 3 (Day1)**: Depends on Phase 2. Delivers gate + Intents/Approvals/AgentRun persistence.
- **Phase 4 (Day2)**: Depends on Phase 3. Delivers executor, ReviewOutput, Evidence, exceptions.
- **Phase 5 (Day3)**: Depends on Phase 4. Delivers audit, KPI, UI.
- **Phase 6 (Polish)**: Depends on Phase 5.
- **Stretch**: Optional after Phase 5.

### User story mapping

| Story | Primary tasks | Done / AC |
|-------|----------------|-----------|
| US1 Requestor Low-risk | T003–T007, T009–T011 | AC-01/02/03; intentId + run stored |
| US2 Approver Med/High | T004, T008, T012, T016 (Approvals Inbox) | Approval gate; inbox + approve/reject |
| US3 Auditor report | T012, T014, T016 (Audit Generator) | AC-04; Markdown + deficits |
| US4 SRE exceptions | T013, T016 (Exceptions Inbox) | FR-EXC-01/02/03; Inbox data |

### Parallel opportunities

- T003, T004, T005 can run in parallel (models).
- T014 and T015 can run in parallel (audit vs KPI services).
- Within Day3 UI, policy, approvals, exceptions, and audit pages can be implemented in parallel after T014/T015.

---

## Implementation Strategy

### MVP first (gate + one path)

1. Complete Phase 1 + 2.
2. Complete Phase 3 (Day1): Intents, Risk, Approvals, AgentRun gate. **Validate**: AC-01, AC-02 (4xx without intentId / without approval for Med/High).
3. Add Phase 4 (Day2): Executor + ReviewOutput + Evidence + Exceptions. **Validate**: AC-03; exception log visible.
4. Add Phase 5 (Day3): Audit + KPI + UI. **Validate**: AC-04, AC-05; quickstart flows.

### Incremental delivery

- **After Day1**: Gate and persistence only; no AI execution yet — still validates FR-RUN-01/02/03.
- **After Day2**: Full run path + exceptions; audit report can be implemented against stored data.
- **After Day3**: MVP complete; KPI and UI available.

---

## Notes

- Every task uses format: `- [ ] T0NN [P?] [USn?] Description with file path`.
- [P] = parallelizable; [USn] = user story for traceability.
- Done conditions and AC/KPI are stated in phase headers and key tasks.
- No test tasks were added (spec did not require TDD); add contract or unit tests in a follow-up if desired.
