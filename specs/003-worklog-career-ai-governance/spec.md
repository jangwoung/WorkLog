# Feature Specification: WorkLog — Career Assets & Governed AI Review

**Feature Branch**: `003-worklog-career-ai-governance`  
**Created**: 2026-02-08  
**Status**: Draft  
**Input**: WorkLog web application that transforms GitHub development activity into career assets and governed AI review records, with full traceability from intent to execution.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Requestor creates intent and obtains career assets from PRs (Priority: P1)

A Requestor (developer) connects GitHub repositories and receives structured career assets (e.g. AssetCards) generated from Pull Request activity. Each asset is traceable to a specific PR. The Requestor can approve, edit, store, and export these assets for portfolios or evaluations. No AI execution or repository provisioning occurs without explicit intent and approval.

**Why this priority**: This is the core value—turning development activity into reusable, evaluator-friendly assets. It establishes the data flow and user control without depending on AI review or provisioning.

**Independent Test**: Connect a repository, trigger PR events, receive generated assets in an inbox, approve or edit, then export. Verify each asset is linked to the originating PR and that no GitHub resources are created without approval.

**Acceptance Scenarios**:

1. **Given** an authenticated Requestor, **When** they connect a GitHub repository, **Then** the system records the connection and monitors that repository for PR events.
2. **Given** a connected repository, **When** a PR is opened, updated, or merged, **Then** the system generates a structured career asset (e.g. summary, impact, technologies, contributions) and places it in the Requestor’s inbox for review.
3. **Given** an asset in the inbox, **When** the Requestor approves, edits, or rejects it, **Then** the system stores the decision and, on approve/edit, adds the asset to a persistent library.
4. **Given** assets in the library, **When** the Requestor requests export, **Then** the system produces output in a defined format (e.g. README or resume-style) for copy or download.
5. **Given** any generated asset, **When** an auditor or user inspects it, **Then** the asset can be traced back to the specific PR and repository (evidence preserved).

---

### User Story 2 - Requestor runs low-risk AI review with intent only (Priority: P2)

A Requestor creates an intent that describes the purpose, scope, constraints, and success criteria for an AI-powered code review. The system classifies the intent as low risk. The Requestor submits a single execution request with that intent. The system executes the AI review once, records the run and its outcome, and makes the run available for audit. No approval step is required for low risk.

**Why this priority**: This establishes the execution gate (intent required) and proves that one execution is one recorded run, traceable to a human-defined intent and to the PR.

**Independent Test**: Create an intent, receive low-risk classification, submit one execution with that intent, and verify one run is stored with PR link and review outcome. No approval is required.

**Acceptance Scenarios**:

1. **Given** a Requestor with a PR to review, **When** they create an intent (purpose, scope, constraints, success criteria), **Then** the system stores the intent and returns an intent identifier.
2. **Given** a stored intent, **When** the system evaluates risk, **Then** low risk is determined and no human approval is required before execution.
3. **Given** a low-risk intent, **When** the Requestor submits one execution with that intent, **Then** the system accepts the request, performs the AI review once, and records the run with its outcome.
4. **Given** a completed run, **When** an Auditor requests an audit report, **Then** the run appears in the report with intent and evidence (e.g. PR URL, diff reference) and no missing links.

---

### User Story 3 - Approver approves or rejects higher-risk AI runs (Priority: P3)

An Approver (e.g. security or SRE lead) sees pending requests for higher-risk intents in an approvals inbox. They complete a short template (e.g. 1–3 questions) to grant or deny approval. Only with a valid approval can an execution for that intent be created and run. Attempts to run without approval are rejected and recorded as exceptions.

**Why this priority**: Higher-risk AI use must not run without explicit human risk acceptance. This story enforces the approval gate and gives Approvers one place to approve, reject, or send back.

**Independent Test**: Create a higher-risk intent, open the approvals inbox, approve with template and validity window, then submit an execution with that intent and approval; run is accepted. Repeat without approval; run is rejected and an exception is recorded.

**Acceptance Scenarios**:

1. **Given** an intent classified as higher risk, **When** the system creates an approval request, **Then** it appears in the Approvals Inbox.
2. **Given** an item in the Approvals Inbox, **When** the Approver completes the template and sets a validity period, **Then** the system records the approval and links it to the intent.
3. **Given** a valid approval for a higher-risk intent, **When** the Requestor submits an execution with that intent and approval, **Then** the system accepts and runs once.
4. **Given** a higher-risk intent with no valid approval, **When** a client attempts to run, **Then** the system rejects the request and records the attempt as an exception (visible in an exceptions inbox).

---

### User Story 4 - Requestor initiates project with intent and approval, then provisions GitHub repo (Priority: P4)

A Requestor captures project purpose, scope, constraints, and success criteria. The system may generate risk and security considerations. No GitHub resources (e.g. repositories) are created until a human approves. After approval, the system can create or initialize a GitHub repository and bootstrap a specification-driven development structure, preserving evidence of what was created and why.

**Why this priority**: Ensures no automatic provisioning without intent and approval; supports teams that want Speckit-ready or specification-driven project setup with full traceability.

**Independent Test**: Create a project intent, receive risk/security considerations, obtain approval, then trigger provisioning; verify the repository is created or initialized and that evidence links the repo to the intent and approval.

**Acceptance Scenarios**:

1. **Given** a Requestor, **When** they define project purpose, scope, constraints, and success criteria, **Then** the system stores the intent and may produce risk or security considerations.
2. **Given** a project intent, **When** no approval has been recorded, **Then** the system MUST NOT create or modify any GitHub repositories.
3. **Given** a project intent and a valid human approval, **When** the Requestor triggers provisioning, **Then** the system creates or initializes the requested GitHub repository and preserves evidence (what was created, intent id, approval id, timestamp).
4. **Given** a provisioned repository, **When** an auditor inspects the evidence, **Then** they can see the intent, approval, and the resulting repository and structure (e.g. specification-driven layout).

---

### User Story 5 - Auditor generates audit report and SRE triages exceptions (Priority: P5)

An Auditor requests an audit report for a time range and scope. The system produces a report that lists executions (and, where applicable, project provisioning events) with their intent, approval (when required), run outcome, and evidence. Any missing link in this chain is clearly marked and affects the report’s success metric. An SRE (or security operator) views an exceptions inbox that lists unapproved run attempts, break-glass runs pending post-hoc approval, and expired approvals, and can triage or resolve within policy.

**Why this priority**: Auditability and exception visibility are core to “no shadow AI” and regulated use. The report must expose gaps; exceptions must be visible and actionable.

**Independent Test**: Generate an audit report for a period that includes complete and incomplete runs; verify missing links are marked and the success metric reflects completeness. Trigger an unapproved run attempt and an expired approval; verify both appear in the exceptions inbox.

**Acceptance Scenarios**:

1. **Given** an Auditor and a time range and scope, **When** they request an audit report, **Then** the system returns a report that lists runs (and provisioning events where applicable) with intent, approval (if required), and evidence; missing links are clearly indicated and the report success metric reflects deficiencies.
2. **Given** an attempt to run without required approval or with expired approval, **When** the system rejects the request, **Then** the attempt is logged and appears in the Exceptions Inbox.
3. **Given** policy-allowed break-glass execution, **When** the run is performed, **Then** it is recorded as requiring post-hoc approval and appears in the Exceptions Inbox.
4. **Given** approvals that have passed their validity period, **When** an SRE opens the Exceptions Inbox, **Then** expired approvals (or runs depending on them) are detectable and listable.

---

### Edge Cases

- What happens when the same execution request (e.g. same idempotency key) is submitted twice? The system MUST treat the second request as idempotent and return the same result without creating a duplicate run.
- What happens when a run is requested with an intent that does not exist or was revoked? The system MUST reject with a client error and MUST NOT execute.
- What happens when an approval has expired? The system MUST reject run requests that depend on that approval and MUST record or surface the expiry in exceptions.
- What happens when PR events arrive for a repository that is not connected or was disconnected? The system MUST NOT generate career assets for that repository.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an authenticated user to connect and disconnect GitHub repositories; only connected repositories MAY trigger career-asset generation from PR events.
- **FR-002**: The system MUST generate structured career assets (e.g. AssetCards) from Pull Request events (e.g. opened, updated, merged) for connected repositories and place them in the user’s inbox for review.
- **FR-003**: The system MUST allow the user to approve, edit, or reject each asset in the inbox; approved or edited assets MUST be stored in a persistent library.
- **FR-004**: The system MUST support export of assets from the library in at least one defined format (e.g. README or resume-style) for copy or download.
- **FR-005**: The system MUST require a stored intent (purpose, scope, constraints, success criteria) before any AI-powered execution or any GitHub resource provisioning.
- **FR-006**: The system MUST evaluate risk for each intent and MUST require a valid human approval for higher-risk intents before allowing execution or provisioning.
- **FR-007**: The system MUST execute at most one AI review run per execution request and MUST record each run with its outcome, linked to the intent and (when required) approval.
- **FR-008**: The system MUST NOT create or modify GitHub repositories until a human has approved the associated project intent.
- **FR-009**: The system MUST preserve evidence for each provisioning action (what was created, intent id, approval id, and when).
- **FR-010**: The system MUST produce audit reports that list runs (and provisioning events where applicable) with intent, approval (when required), and evidence, and MUST clearly mark any missing link and reflect completeness in a report success metric.
- **FR-011**: The system MUST record and surface in an exceptions inbox: unapproved run attempts, break-glass runs requiring post-hoc approval, and expired approvals (or runs depending on them).
- **FR-012**: The system MUST support idempotent execution requests (e.g. by idempotency key) so that duplicate submissions do not create duplicate runs.

### Key Entities

- **User**: Authenticated actor (e.g. via OAuth); owns repositories, assets, and intents.
- **Repository (connection)**: A GitHub repository connected by the user for monitoring; has connection status and is used to scope PR events and evidence.
- **Career Asset (e.g. AssetCard)**: A structured record generated from a PR (title, description, impact, technologies, contributions, etc.); has status (e.g. pending, approved, rejected) and is traceable to a PR.
- **Intent**: A recorded statement of purpose, scope, constraints, and success criteria; used for AI review runs and for project provisioning; has an identifier and risk classification.
- **Approval**: A human decision (approve, reject, send back) linked to an intent, with optional template answers and a validity period; required for higher-risk intents before execution or provisioning.
- **Run (e.g. AgentRun)**: A single AI review execution; linked to one intent and (when required) one approval; has outcome and evidence (e.g. PR URL, diff reference).
- **Review Outcome**: The result of one run (e.g. summary, findings); fixed schema; stored and available for audit.
- **Evidence**: Artifacts that link runs or provisioning to external references (e.g. PR URL, diff hash, repository URL).
- **Exception Event**: A recorded violation or special case (unapproved attempt, break-glass, approval expired) visible in the exceptions inbox.
- **Provisioning Event**: A record of a created or initialized GitHub resource (e.g. repository), linked to intent and approval, with evidence of what was created and when.

## Assumptions

- Authentication is provided by an existing mechanism (e.g. OAuth); the system uses the authenticated identity for ownership and audit (actor id).
- “Higher risk” and “low risk” are determined by rules or policy (e.g. keyword-based or configurable); the exact rule set can be updated without changing this spec.
- “Specification-driven development structure” or “Speckit-ready” means a project layout that supports specification-first workflows (e.g. specs, contracts, tasks); the exact layout is a design decision.
- Export formats (e.g. README, resume-style) are defined elsewhere; this spec only requires that at least one format is supported.
- Break-glass execution is allowed only when permitted by policy and MUST be recorded and surfaced for post-hoc approval.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every AI execution and every GitHub provisioning action can be traced back to a human-defined intent and (when required) to a human approval.
- **SC-002**: An auditor can generate a report for a time range and scope and see no missing links for runs and provisioning events that are complete; the report success metric is 1 when all required links are present and 0 otherwise for the reported set.
- **SC-003**: Users can complete the primary flow (connect repo → receive assets → approve or edit → export) without errors in under five minutes for a single asset.
- **SC-004**: Unapproved run attempts and expired approvals are visible in the exceptions inbox within one minute of the triggering event.
- **SC-005**: Users in regulated or high-risk environments can demonstrate that every AI action is explainable, auditable, and accountable via intent, approval, run, and evidence.

## Out of Scope (Non-goals)

- Autonomous code modification or auto-commit by AI.
- Learning management or task scheduling features.
- Social or peer review features.
- IDE replacement or full AI-driven implementation.
