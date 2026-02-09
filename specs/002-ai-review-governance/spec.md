# Feature Specification: AI Review (PR Analysis) MVP — Intent / Approval / AgentRun / Audit

**Feature Branch**: `002-ai-review-governance`  
**Created**: 2026-02-08  
**Status**: Draft  
**Input**: AI review PR analysis MVP governed by Intent → Approval → AgentRun → Audit chain for SRE and security; execution gate and audit zero-gap as top priorities.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Requestor runs Low-risk AI review (Priority: P1)

A Requestor (developer, SRE, or security) creates an Intent with Goal, Constraints, and Success criteria. The system classifies the request as Low risk. The Requestor submits an AgentRun with the required intentId. The system executes the AI review, stores the ReviewOutput, and the run is available for audit.

**Why this priority**: This is the minimal path to a governed run. It establishes the execution gate (intentId required) and proves that one execution is recorded as one AgentRun traceable to a PR.

**Independent Test**: Create an Intent, receive Low risk classification, create an AgentRun with that intentId, execute, and verify one AgentRun is stored with the PR link and ReviewOutput. No approval step is required.

**Acceptance Scenarios**:

1. **Given** a Requestor with a PR to review, **When** they create an Intent (Goal/Constraints/Success), **Then** the system stores the Intent and returns an intentId.
2. **Given** a stored Intent, **When** the system evaluates risk, **Then** Low risk is determined and no approval is required.
3. **Given** a Low-risk Intent, **When** the Requestor creates an AgentRun with that intentId, **Then** the system accepts the request and executes the AI review.
4. **Given** a completed run, **When** an Auditor requests an audit report, **Then** the run appears in the report with Intent and Evidence (e.g. PR URL, diffHash) and no missing links.

---

### User Story 2 - Approver approves or rejects Med/High risk runs (Priority: P2)

An Approver (security, SRE lead) sees approval requests for Med/High risk Intents in an Approvals Inbox. They complete a short template (e.g. 1–3 questions) to grant or deny approval. Only with a valid Approval can an AgentRun for that Intent be created and executed.

**Why this priority**: Med/High risk must not run without explicit risk acceptance. This story enforces the approval gate and gives Approvers a single place to approve, reject, or send back.

**Independent Test**: Create a Med or High risk Intent, open Approvals Inbox, approve with template, then create AgentRun with that intentId and approvalId; run is accepted. Repeat with no approval; run creation is rejected (4xx).

**Acceptance Scenarios**:

1. **Given** an Intent classified as Med or High risk, **When** the system creates an approval request, **Then** it appears in the Approvals Inbox.
2. **Given** an item in the Approvals Inbox, **When** the Approver completes the approval template (e.g. 1–3 questions), **Then** the system records the Approval and links it to the Intent.
3. **Given** a valid Approval for a Med/High Intent, **When** the Requestor creates an AgentRun with that intentId and approvalId, **Then** the system accepts and executes.
4. **Given** a Med/High Intent with no valid Approval, **When** a client attempts to create an AgentRun, **Then** the system rejects the request (4xx) and records the attempt as an exception.

---

### User Story 3 - Auditor generates audit report (Priority: P3)

An Auditor (SRE, security, or audit role) requests an audit report for a time range and scope. The system produces a report that includes Intent, Approval (when required), AgentRun, and Evidence. Any missing link in this chain is clearly marked (e.g. highlighted) and affects the report’s success metric.

**Why this priority**: Auditability is a core goal. The report must expose gaps so that “audit zero-gap” can be measured and improved.

**Independent Test**: Generate an audit report for a period that includes both complete runs and runs with missing Approval or Evidence. Verify that the report lists all runs, marks missing links, and that the success metric reflects completeness.

**Acceptance Scenarios**:

1. **Given** an Auditor and a chosen time range and scope, **When** they request an audit report, **Then** the system returns a report (e.g. Markdown) that lists AgentRuns and their linked Intent, Approval (if required), and Evidence.
2. **Given** an AgentRun with missing Intent, Approval, or Evidence, **When** the report is generated, **Then** the missing link is clearly indicated (e.g. highlighted) and the report success metric reflects the deficiency.
3. **Given** a report request, **When** the system has a large number of runs in scope, **Then** the report completes within the defined performance target (e.g. P95 &lt; 5s with reasonable limits).

---

### User Story 4 - SRE tracks exceptions (Priority: P4)

An SRE (or security operator) views an Exceptions Inbox that lists unapproved High-risk attempts, Break-glass runs pending post-hoc approval, and Approval-expired cases. They can triage and, where policy allows, approve, reject, or send back.

**Why this priority**: Exceptions must be visible and actionable. Without this, governance violations and break-glass runs are not manageable.

**Independent Test**: Trigger an unapproved High-risk run attempt and a Break-glass run; confirm both appear in the Exceptions Inbox. Verify that expired Approvals are detectable (e.g. listed) in the same place.

**Acceptance Scenarios**:

1. **Given** an attempt to create an AgentRun for a High-risk Intent without a valid Approval, **When** the system rejects the request, **Then** the attempt is logged and appears in the Exceptions Inbox.
2. **Given** a policy-allowed Break-glass run, **When** the run is executed, **Then** it is recorded as requiring post-hoc approval and appears in the Exceptions Inbox.
3. **Given** an Approval that has passed its validity period, **When** an SRE opens the Exceptions Inbox, **Then** the expired Approval (or runs depending on it) is detectable (MVP may support listing only).
4. **Given** an item in the Exceptions Inbox, **When** the SRE approves, rejects, or sends back within the policy window, **Then** the system records the decision and updates the exception state.

---

### Edge Cases

- What happens when the same runId is submitted twice? (System MUST reject duplicate and preserve idempotency.)
- What happens when an AgentRun is requested with an intentId that does not exist? (System MUST reject with 4xx.)
- What happens when Approval has expired before run execution? (System MUST treat as invalid and reject run creation or flag in Exceptions.)
- How does the system handle Break-glass when post-hoc approval is never granted? (Remains in Exceptions Inbox; audit report shows incomplete chain.)
- What happens when the AI review execution fails (e.g. timeout, rate limit)? (ReviewOutput stores status and errorCode; run remains traceable.)
- How are concurrent run creation requests for the same Intent handled? (Idempotency by runId; first write wins or defined conflict rule.)

## Requirements *(mandatory)*

### Functional Requirements

**AgentRun creation (execution gate)**

- **FR-RUN-01**: AgentRun creation API MUST require intentId; requests without intentId MUST be rejected (4xx) and the attempt logged.
- **FR-RUN-02**: When the linked Intent is Med or High risk, the system MUST require a valid Approval; otherwise it MUST reject run creation (4xx).
- **FR-RUN-03**: The system MUST prevent duplicate registration of the same runId (idempotency).

**Input (PR)**

- **FR-IN-01**: The system MUST store repoFullName, prNumber, and prUrl for each run.
- **FR-IN-02**: The system MUST store baseSHA, headSHA, and diffHash.
- **FR-IN-03**: The system MUST NOT persist full PR diff by default; reference and hash-based storage MUST be used.

**AI review execution**

- **FR-EXEC-01**: The system MUST allow review scope to be constrained by Intent Constraints.
- **FR-EXEC-02**: The system MUST output structured Findings only; it MUST NOT perform scoring or ranking.
- **FR-EXEC-03**: The system MUST record model, agent, version, and ruleset (or equivalent) for each run.
- **FR-EXEC-04**: The system MAY record a short toolsSummary for the run.

**Output (ReviewOutput)**

- **FR-OUT-01**: ReviewOutput MUST be stored under a fixed schema.
- **FR-OUT-02**: Each finding MUST include severity and evidenceRef.
- **FR-OUT-03**: ReviewOutput MUST include status (e.g. completed, failed, cancelled).
- **FR-OUT-04**: On failure, the system MUST record an errorCode (e.g. rate_limit, timeout, policy_block).

**Evidence**

- **FR-EVI-01**: The system MUST allow Evidence to be linked to an AgentRun.
- **FR-EVI-02**: Audit report output MUST include at least PR URL and diffHash for each run.

**Exceptions and control**

- **FR-EXC-01**: Unapproved High-risk run attempts MUST be rejected and recorded as exceptions (reject log).
- **FR-EXC-02**: Break-glass runs MUST require post-hoc approval and MUST appear in the Exceptions Inbox.
- **FR-EXC-03**: The system MUST detect Approval expiry; MVP MAY support this via listing in Exceptions Inbox.

### Key Entities *(include if feature involves data)*

- **Intent**: Request for an AI review. Attributes: intentId, Goal, Constraints, Success criteria, risk level (Low/Med/High), creator, timestamps.
- **Approval**: Risk-acceptance decision for Med/High Intents. Attributes: approvalId, intentId, Approver, template answers, validity period, status (approved/rejected/sent back).
- **AgentRun**: One AI review execution. Attributes: runId, intentId, approvalId (optional for Low), actorType/actorId, agentName/agentVersion/model, repoFullName, prNumber, prUrl, baseSHA, headSHA, diffHash, status, startedAt, endedAt, toolsSummary, errorCode, timestamps.
- **ReviewOutput**: Fixed-schema result of a run. Attributes: summary, findings (id, category, severity, title, description, evidenceRef, recommendation, confidence), safeToProceed, status, errorCode.
- **Evidence**: Artifact supporting a run or finding. Attributes: evidenceId, linkedType, linkedId, kind, url, hash, createdAt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-01**: No AgentRun can be created without an intentId; all such attempts receive 4xx and are logged (execution gate).
- **SC-02**: No Med/High AgentRun is created without a valid Approval; all such attempts receive 4xx and are visible as exceptions (approval gate).
- **SC-03**: Every execution is stored as exactly one AgentRun linked to one PR (repoFullName, prNumber, prUrl) and traceable for audit.
- **SC-04**: Auditors can generate an audit report for a chosen period and scope, and the report clearly indicates any missing Intent, Approval, AgentRun, or Evidence (audit zero-gap visibility).
- **SC-05**: KPI are available: link rate (AgentRuns with intentId / total AgentRuns), approval rate (Med/High runs with approvalId / total Med/High runs), audit report success rate (reports generated with no missing required links / total report requests).
- **SC-06**: AgentRun creation API responds within the defined performance target (e.g. P95 &lt; 1s) under normal load.
- **SC-07**: Audit report generation completes within the defined target (e.g. P95 &lt; 5s) for scoped result sets.

## Assumptions

- Risk classification (Low/Med/High) is defined by policy or rules; MVP may use a simple rule set.
- Approval template (1–3 questions) is predefined per risk level or organization.
- Break-glass is allowed only when policy explicitly permits it; post-hoc approval is mandatory.
- Access control follows organization or project boundaries; exact identity provider and scopes are out of scope for this spec.
- Audit report format is human-readable (e.g. Markdown); machine-readable export can be a later enhancement.

## Non-Goals (Out of Scope)

- AI-driven automatic commits or code changes.
- Human scoring, grading, or ranking of developers or PRs.
- Advanced WORM or data escrow; may be a future requirement.
