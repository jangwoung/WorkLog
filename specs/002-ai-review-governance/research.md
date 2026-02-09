# Research: AI Review MVP — Intent / Approval / AgentRun / Audit

**Branch**: `002-ai-review-governance` | **Date**: 2026-02-08

## 1. Risk engine rules storage

**Decision**: Store risk rules in Firestore (e.g. `risk_rules` or embedded in a `policy` document) with Policy Console toggles. MVP uses static rules only.

**Rationale**: Keeps rules manageable and toggleable without code deploy; aligns with existing Firestore usage. Config-file alternative is possible later for portability.

**Alternatives considered**: Config file (YAML/JSON) in repo — simpler but requires deploy to change; external policy service — overkill for MVP.

---

## 2. AI Review Executor: sync vs async

**Decision**: MVP may run AI review **synchronously** inside `POST /api/agent-runs` (create run as `queued`, then execute in same request and set `completed`/`failed`) to avoid queue wiring on Day 1. Optionally move to async (e.g. Cloud Tasks) once stable.

**Rationale**: Reduces Day 1 scope; gate and persistence remain correct; async can be added when execution time or load demands it.

**Alternatives considered**: Always async (Cloud Tasks) — better for long-running runs but adds setup; separate worker process — same as async.

---

## 3. Audit report format and deficit marking

**Decision**: Output **Markdown** with clear deficit markers (e.g. `❗ Missing: approvalId` or equivalent). Success metric = reports generated with zero missing required links / total report requests.

**Rationale**: Human-readable and version-control friendly; deficit markers satisfy P-03; no implementation detail (format is spec-driven).

**Alternatives considered**: JSON/HTML — can be added later; PDF — out of scope for MVP.

---

## 4. Exception events storage

**Decision**: Store rejections and break-glass in a queryable store (Firestore collection `exception_events` or equivalent) so Exceptions Inbox can list and filter by type, deadline, assignee.

**Rationale**: Required for FR-EXC-01/02/03 and SRE visibility; simple document shape (type, intentId/runId, timestamp, actorId, resolution).

**Alternatives considered**: Log-only — not queryable for inbox; separate DB — unnecessary when using Firestore.

---

## 5. Idempotency key and conflict behavior

**Decision**: Use **runId** as client-provided idempotency key; unique constraint on runId. Duplicate POST returns **200** with existing run (same status/body) to be idempotent.

**Rationale**: Spec FR-RUN-03; first write wins is sufficient for MVP; 200 on duplicate avoids client retry creating new runs.

**Alternatives considered**: Server-generated runId + idempotency header — more flexible but adds header contract; 409 on duplicate — valid but 200 + same body is standard for idempotent create.
