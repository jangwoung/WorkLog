# Research: WorkLog — Career Assets & Governed AI Review

**Branch**: `003-worklog-career-ai-governance` | **Date**: 2026-02-08

## Purpose

Consolidate technical decisions for the unified WorkLog platform (career assets + AI review governance + project provisioning). The HOW input provided the architecture; this document records decisions, rationale, and alternatives.

---

## 1. Backend-First, Event-Driven Architecture

**Decision**: Orchestration via Next.js API Routes; heavy work (PR processing, AssetCard generation, AI review execution, repo provisioning) in background jobs (Cloud Tasks + Cloud Run workers). Webhook and user actions enqueue jobs; APIs return quickly.

**Rationale**: Keeps UI responsive and avoids timeouts; allows retries and observability at job level; aligns with existing 001/002 patterns.

**Alternatives considered**: Synchronous processing in API — rejected for PR/LLM and provisioning latency. Serverless functions per event — rejected in favor of shared workers and existing Cloud Tasks setup.

---

## 2. Data Store: Firestore

**Decision**: Continue using Firestore for all persistent data (users, repositories, pr-events, asset-cards, intents, approvals, agent_runs, review_outputs, evidences, exception_events, and new provisioning_events). Append-friendly, audit-safe; no full PR diff stored.

**Rationale**: Already in use for 001 and 002; good fit for document-shaped entities and audit trails; supports real-time listeners if needed later.

**Alternatives considered**: Separate DB for audit — rejected for MVP (single store simplifies traceability). PostgreSQL — rejected to avoid migration and to keep consistency with existing WorkLog.

---

## 3. AI: Vertex AI (Gemini) for Transformation and Summarization Only

**Decision**: Use Vertex AI (Gemini) only for deterministic transformation and summarization: AssetCard generation from PR content, optional risk/security consideration text from project intent. Fixed schemas and versioned prompts; no autonomous decisions or code modification.

**Rationale**: Matches Constitution P-05 (structured findings, no scoring); keeps AI usage cost-bounded and explainable; aligns with 001 LLM pipeline.

**Alternatives considered**: Open-source LLM on-prem — rejected for operational simplicity. Multiple AI providers — deferred; single provider simplifies versioning and audit.

---

## 4. Project Provisioning: Async Worker + Evidence Record

**Decision**: After project intent and human approval, a background worker creates or initializes the GitHub repository (e.g. via GitHub API). A `provisioning_events` collection stores: what was created (repo URL, structure type), intentId, approvalId, actorId, timestamp. No full diff or secrets stored.

**Rationale**: Keeps provisioning behind the same intent/approval gate (FR-008, FR-009); async avoids blocking UI; evidence supports audit (SC-001, SC-002).

**Alternatives considered**: Synchronous provisioning in API — rejected for GitHub API latency and timeout risk. No evidence record — rejected for audit requirement.

---

## 5. Intent Types: Review vs Project

**Decision**: Use a single `intents` collection. Intent use is distinguished by usage context: (1) AI review — intent drives AgentRun; (2) Project — intent drives provisioning. Optionally add an `intentType` or `kind` field (e.g. "review" | "project") if the same API must serve both; otherwise separate endpoints can imply type.

**Rationale**: Same risk and approval semantics; avoids duplicate approval flows; 002 already has intents for review; 003 adds project intents that trigger provisioning.

**Alternatives considered**: Separate collections for review vs project intents — rejected to keep one approval model and one audit chain.

---

## 6. Idempotency

**Decision**: All job executions and run creation accept an idempotency key (e.g. runId for AgentRun, prEventId for asset generation). Duplicate requests return the same result without creating duplicate side effects.

**Rationale**: Prevents double provisioning, double runs, and duplicate assets; required by FR-012 and risk mitigation.

**Alternatives considered**: No idempotency — rejected. Client-generated keys only — accepted; server can generate if client omits.

---

## 7. Speckit-Ready / Specification-Driven Layout

**Decision**: “Speckit-ready” means a project layout that supports specification-first workflows (e.g. `specs/`, `contracts/`, `tasks` or similar). Exact directory and file set are a design detail in the provisioning worker; not fixed in this research.

**Rationale**: Spec and plan are technology-agnostic; implementation can align with existing Speckit templates (e.g. 001, 002) when generating new repos.

**Alternatives considered**: Fully fixed layout in spec — rejected to allow iteration. No standard layout — rejected; spec calls for “specification-driven development structure.”

---

## Summary Table

| Topic              | Decision                          | Rationale / Note                    |
|--------------------|-----------------------------------|-------------------------------------|
| Architecture       | Backend-first, event-driven       | Async jobs for heavy work           |
| Storage            | Firestore                         | Existing; audit-safe; no full diff  |
| AI                 | Vertex AI (Gemini), fixed schemas | No autonomous decisions             |
| Provisioning       | Async worker + provisioning_events| Intent/approval gate; evidence       |
| Intent model       | Single intents collection         | Review + project; one approval flow |
| Idempotency        | All jobs and run creation         | FR-012; risk mitigation             |
| Speckit layout     | Implementation-defined            | Spec-driven structure; details in code |
