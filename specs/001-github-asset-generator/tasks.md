# Tasks: GitHub Career Asset Generator

**Input**: Design documents from `specs/001-github-asset-generator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by Implementation Phase (1–5). Within each phase, categories: Infrastructure, Backend Services, API Routes, Workers / Async Jobs, LLM Integration, Frontend UI, Testing.

**Format**: `[ID] [P?] [Story?]` — [P] = parallelizable; [US1/US2/US3] = user story. Include exact file paths.

---

## Phase 0: Setup

**Purpose**: Project initialization and structure per plan. No feature work until complete.

### Phase 0 — Infrastructure

- [X] **T001** Create project structure per plan.md  
  **Description**: Create directories `app/` (auth, dashboard, api, components, hooks, context, styles), `src/` (infrastructure, controllers, services, middleware, models, schemas, types, utils), `workers/pr-event-processor/`, `workers/asset-generator/`, `config/`, `tests/` (contract, integration, unit), `public/`.  
  **Acceptance Criteria**: All paths exist; structure matches plan.md Project Structure.

- [X] **T002** Initialize Next.js 14 (App Router) project with TypeScript  
  **Description**: Run `npx create-next-app` with App Router, TypeScript, ESLint. Configure `next.config.js`, `tsconfig.json`, `package.json` at repo root.  
  **Acceptance Criteria**: `npm run dev` starts Next.js; TypeScript compiles; App Router routes resolve.

- [X] **T003** [P] Add dependencies per plan  
  **Description**: Install `@google-cloud/firestore`, `@google-cloud/tasks`, `@google-cloud/aiplatform`, `next-auth`. Add to `package.json`.  
  **Acceptance Criteria**: All packages install; no peer-dependency errors.

- [X] **T004** [P] Add `.env.example` and document required variables  
  **Description**: Create `.env.example` with `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLOUD_PROJECT`, `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL`, `CLOUD_TASKS_QUEUE_NAME`, `CLOUD_TASKS_LOCATION`, `GITHUB_WEBHOOK_SECRET`.  
  **Acceptance Criteria**: Quickstart env section can be reproduced from `.env.example`; no secrets in repo.

- [X] **T005** [P] Add Firestore security rules scaffold  
  **Description**: Create `config/firestore.rules`, scoping `users`, `repositories`, `pr-events`, `asset-cards`, `decision-logs` by `userId` for read/write. Deploy as `firestore.rules` per GCP when applicable.  
  **Acceptance Criteria**: Rules file exists at `config/firestore.rules`; draft rules enforce `request.auth.uid` match on `userId`.

---

## Phase 1: Infrastructure & Core Services

**Purpose**: Infra clients, data models, auth + repository services, and auth/repository/webhook API routes. Foundation for Phase 2.

**Independent Test**: Authenticate via GitHub OAuth, connect one repository, call `GET /api/repositories`, receive stored repo; send test webhook, verify 200 and task enqueued (no processing yet).

### Phase 1 — Infrastructure

- [X] **T006** [P] Implement Firestore client and collection refs  
  **Description**: Add `src/infrastructure/firestore/client.ts` and `collections.ts`. Initialize Firestore; export typed refs for `users`, `repositories`, `pr-events`, `asset-cards`, `decision-logs`.  
  **Acceptance Criteria**: Client connects with `GOOGLE_APPLICATION_CREDENTIALS`; collections resolvable.

- [X] **T007** [P] Implement Cloud Tasks client  
  **Description**: Add `src/infrastructure/cloud-tasks/client.ts`. Create task enqueue helper using queue name and location from env.  
  **Acceptance Criteria**: Can enqueue a task to the configured queue; no runtime errors.

- [X] **T008** [P] Implement Vertex AI Gemini client  
  **Description**: Add `src/infrastructure/vertex-ai/client.ts`. Export a function to call Gemini (e.g. `generateContent`) with project, location, model from env.  
  **Acceptance Criteria**: Client invocable; returns a valid response for a trivial prompt.

- [X] **T009** [P] Implement GitHub API client  
  **Description**: Add `src/infrastructure/github/client.ts`. Use Octokit or fetch with OAuth token. Support: list repos, get PR, get PR diff, create webhook, delete webhook.  
  **Acceptance Criteria**: Can list user repos and fetch a PR + diff given token; can create/delete webhook for a repo.

### Phase 1 — Backend Services

- [X] **T010** Implement auth service  
  **Description**: Add `src/services/auth/auth.service.ts`. Use NextAuth.js; implement GitHub provider; persist user in Firestore `users` (or ensure NextAuth adapter writes user). Handle token storage per data-model.  
  **Acceptance Criteria**: Login via GitHub creates/updates user; session available in API routes.

- [X] **T011** Implement repository service  
  **Description**: Add `src/services/repository/repository.service.ts`. Connect/disconnect repo: create GitHub webhook, store in `repositories`, update user `connectedRepositoryIds`. Disconnect: remove webhook, update status.  
  **Acceptance Criteria**: Connect stores repo + webhookId; disconnect removes webhook and updates repo status.

- [X] **T012** Implement PR event ingestion (storage only)  
  **Description**: Add `src/services/pr-event/pr-event.service.ts`. `ingest(webhookPayload)`: parse PR event, validate repo is connected, write to `pr-events` with `processingStatus: "pending"`, `githubEventId` for idempotency. No processing yet.  
  **Acceptance Criteria**: Ingest creates `pr-events` doc; duplicate `githubEventId` does not create duplicate (idempotent).

### Phase 1 — Models & Schemas

- [X] **T013** [P] Add TypeScript models per data-model.md  
  **Description**: Create `src/models/user.model.ts`, `repository.model.ts`, `pr-event.model.ts`, `asset-card.model.ts`, `decision-log.model.ts` with interfaces matching Firestore schema.  
  **Acceptance Criteria**: All entities have types; field names and enums match data-model.

- [X] **T014** [P] Add AssetCard JSON schema and validation helper  
  **Description**: Create `src/schemas/asset-card-schema.ts` with fixed schema (title, description, impact, technologies, contributions, metrics). Export `validateAssetCard(data): boolean`.  
  **Acceptance Criteria**: Valid payload passes; invalid (missing/mistyped fields) fails.

- [X] **T015** [P] Add request validation schemas  
  **Description**: Create `src/schemas/validation.schemas.ts` for API payloads (e.g. repository connect `{ owner, name }`, export `{ assetCardIds, format }`).  
  **Acceptance Criteria**: Repository connect and export payloads validated; invalid requests identifiable.

### Phase 1 — API Routes

- [X] **T016** Wire NextAuth.js API routes  
  **Description**: Add `app/api/auth/[...nextauth]/route.ts`. Configure GitHub provider, callbacks, session. Ensure `users` in Firestore aligned with data-model.  
  **Acceptance Criteria**: `GET /api/auth/signin`, callback, `POST /api/auth/signout` work; session cookie set.

- [X] **T017** Implement `GET /api/repositories` and `POST /api/repositories/connect`  
  **Description**: Add `app/api/repositories/route.ts`. GET: list user's repositories from Firestore. POST: validate body, call repository service connect, return repo. Use auth middleware.  
  **Acceptance Criteria**: GET returns user repos; POST connects repo and returns it; 401 when unauthenticated.

- [X] **T018** Implement `DELETE /api/repositories/[repositoryId]`  
  **Description**: Add `app/api/repositories/[repositoryId]/route.ts`. Verify repo belongs to user, call disconnect, return success.  
  **Acceptance Criteria**: Delete disconnects repo and removes webhook; 403 for wrong user, 404 if missing.

- [X] **T019** Implement GitHub webhook receiver `POST /api/webhooks/github`  
  **Description**: Add `app/api/webhooks/github/route.ts`. Verify `X-Hub-Signature-256` with `GITHUB_WEBHOOK_SECRET`. Parse `pull_request` events only. Call PR event ingestion service, then enqueue Cloud Task for processing. **Return 200 immediately**; do not process in request. Use `X-GitHub-Delivery` as idempotency key (e.g. in task name or payload).  
  **Acceptance Criteria**: Valid webhook → 200 + task enqueued; invalid signature → 401; non-PR events ignored; duplicate delivery ID does not create duplicate work.

### Phase 1 — Middleware

- [X] **T020** [P] Add auth middleware for API routes  
  **Description**: Add `src/middleware/auth.middleware.ts`. Export helper used by API routes to assert session and `userId`.  
  **Acceptance Criteria**: Protected routes reject unauthenticated requests with 401.

- [X] **T021** [P] Add error-handling middleware  
  **Description**: Add `src/middleware/error.middleware.ts`. Centralized error handler; map known errors to HTTP status and JSON body.  
  **Acceptance Criteria**: API errors return consistent `{ error: { code, message } }`; 500 for unexpected errors.

- [X] **T022** [P] Add logging utility  
  **Description**: Add `src/utils/logger.ts`. Structured logger for API and workers (e.g. request id, userId, level).  
  **Acceptance Criteria**: Logs emitted in structured form; usable from routes and workers.

---

## Phase 2: PR Event Processing & LLM Pipeline

**Purpose**: Process PR events via Cloud Tasks, extract PR context + diff, run Extract → Synthesize LLM pipeline, validate schema, store AssetCards. Idempotent; cost-aware diff handling.

**Independent Test**: Trigger webhook for a PR → task runs → AssetCard created in `asset-cards` with `status: "inbox"`; duplicate webhook does not create duplicate AssetCard.

### Phase 2 — Utils

- [X] **T023** Implement cost-aware diff processor  
  **Description**: Add `src/utils/diff-processor.ts`. Truncate diff to first N lines (e.g. 5000); produce `diffStats` (filesChanged, additions, deletions). Optionally summarize remainder.  
  **Acceptance Criteria**: Large diffs truncated; stats correct; token-friendly output for LLM.

- [X] **T024** Implement idempotency helper for PR processing  
  **Description**: Add `src/utils/idempotency.ts`. Check `pr-events` by `repositoryId` + `prNumber` + `eventType` (and/or `githubEventId`) before creating AssetCard; ensure one AssetCard per PR event.  
  **Acceptance Criteria**: Duplicate events do not create duplicate AssetCards; retries are safe.

### Phase 2 — Workers / Async Jobs

- [X] **T025** Implement PR event processor worker  
  **Description**: Add `workers/pr-event-processor/`. HTTP handler invoked by Cloud Tasks. Payload: `prEventId` (or equivalent). Load PR event. **Before processing**: verify repository still connected and user has access (query `repositories`); if disconnected or inaccessible, mark PR event `processingStatus: "failed"`, skip fetch, do not enqueue asset-generator. Otherwise: fetch PR + diff via GitHub client, run diff processor, store enriched PR event, enqueue **asset-generator** task with `prEventId`.  
  **Acceptance Criteria**: Worker runs from Cloud Task; skips processing when repo disconnected/inaccessible; otherwise fetches PR/diff, enqueues asset-generator, updates PR event status.

- [X] **T026** Implement asset-generator worker (LLM pipeline)  
  **Description**: Add `workers/asset-generator/`. HTTP handler invoked by Cloud Tasks. Load PR event, call Extract → Synthesize (see T027), validate with AssetCard schema. If valid: create `asset-cards` doc (`status: "inbox"`), update PR event `assetCardId` and `processingStatus: "completed"`. If invalid: retry up to 2 times per research; then create AssetCard with `status: "flagged"`, store `validationErrors` (and partial LLM output if useful), link to PR event (**flagged-for-review** flow). Idempotent per T024.  
  **Acceptance Criteria**: Valid → AssetCard `inbox`; invalid after retries → AssetCard `flagged` with validation errors; no duplicate AssetCards.

### Phase 2 — LLM Integration

- [X] **T027** Implement Extract → Synthesize LLM pipeline with fixed schema  
  **Description**: In `workers/asset-generator` or shared `src/services/asset-card/`, implement two-step pipeline: (1) **Extract**: from PR title, description, diff (and diffStats), extract structured facts. (2) **Synthesize**: map to AssetCard fields (title, description, impact, technologies, contributions, metrics). Use Vertex AI Gemini; enforce output via function-calling or strict JSON schema. No scoring/grading; deterministic, schema-validated only.  
  **Acceptance Criteria**: Pipeline returns object conforming to AssetCard schema; all outputs validated; no extra fields.

### Phase 2 — AssetCard Orchestration

- [X] **T028** Implement AssetCard generation orchestration service  
  **Description**: Add `src/services/asset-card/asset-card.service.ts` (or extend). `generateFromPrEvent(prEventId)`: load PR event, run diff processor, call LLM pipeline, validate. If valid: create AssetCard `status: "inbox"`. If invalid after retries: create AssetCard `status: "flagged"` with `validationErrors`. Update PR event. Used by asset-generator worker.  
  **Acceptance Criteria**: Service creates AssetCard (inbox or flagged) and links to PR event; respects idempotency.

### Phase 2 — Webhook / API

- [X] **T029** Ensure webhook enqueues PR processor task (not asset-generator directly)  
  **Description**: Update `app/api/webhooks/github/route.ts` so it enqueues the **pr-event-processor** task (which then enqueues asset-generator). Payload must include `githubEventId` / delivery id for idempotency.  
  **Acceptance Criteria**: Webhook → pr-event-processor task only; delivery ID passed; 200 returned immediately.

---

## Phase 3: Asset Management & User Actions

**Purpose**: AssetCard CRUD, approve/edit/reject, decision logging. Inbox and library API routes.

**Independent Test**: Call `GET /api/assets/inbox` and `GET /api/assets/library`; approve/edit an AssetCard via API; verify decision log and status transitions.

### Phase 3 — Backend Services

- [ ] **T030** Implement AssetCard CRUD and state transitions  
  **Description**: Extend `src/services/asset-card/asset-card.service.ts`. List inbox (`status: "inbox"` OR `"flagged"`), list library (approved/edited). Get by id. Approve: set `approvedAt`, `status: "approved"`, move to library (accepts `inbox` or `flagged`). Edit: apply patches, `editedAt`, `editHistory`, `status: "edited"` (accepts `inbox` or `flagged`; fixes validation issues for flagged). Reject: delete or soft-delete. Enforce userId.  
  **Acceptance Criteria**: Inbox includes inbox + flagged; library correct; approve/edit/reject apply to inbox and flagged; state persists.

- [ ] **T031** Implement decision log service  
  **Description**: Add `src/services/decision-log/` (or module). Log `approve` / `reject` / `edit` with `assetCardId`, `actionType`, `editedFields` when edit, `timestamp`.  
  **Acceptance Criteria**: Every approve/edit/reject creates a decision-log entry; queryable by user or asset.

### Phase 3 — API Routes

- [ ] **T032** Implement `GET /api/assets/inbox`  
  **Description**: Add `app/api/assets/inbox/route.ts`. Paginated list of user's AssetCards with `status: "inbox"` OR `"flagged"` (pending review), ordered by `generatedAt` desc. Include `validationErrors` when `status: "flagged"`.  
  **Acceptance Criteria**: Returns inbox + flagged items; pagination (limit/cursor) works; 401 when unauthenticated.

- [ ] **T033** Implement `GET /api/assets/library`  
  **Description**: Add `app/api/assets/library/route.ts`. Paginated list of approved/edited AssetCards; optional `status` filter.  
  **Acceptance Criteria**: Returns library items; filter and pagination work.

- [ ] **T034** Implement `GET /api/assets/[assetCardId]`  
  **Description**: Add `app/api/assets/[assetCardId]/route.ts`. Return single AssetCard if owned by user.  
  **Acceptance Criteria**: 200 with AssetCard; 403/404 when not owner or missing.

- [ ] **T035** Implement `POST /api/assets/[assetCardId]/approve`  
  **Description**: Add `app/api/assets/[assetCardId]/approve/route.ts`. Call asset-card service approve; log decision. Accepts `status: "inbox"` or `"flagged"`.  
  **Acceptance Criteria**: AssetCard moves to library as approved; decision logged; 400 if not inbox or flagged.

- [ ] **T036** Implement `POST /api/assets/[assetCardId]/edit`  
  **Description**: Add `app/api/assets/[assetCardId]/edit/route.ts`. Validate body (partial AssetCard fields), call edit service, log decision. Applies to `inbox` and `flagged` (user can fix validation issues on flagged).  
  **Acceptance Criteria**: Edits applied; editHistory updated; decision logged; validation enforced; supported for inbox and flagged.

- [ ] **T037** Implement `DELETE /api/assets/[assetCardId]`  
  **Description**: Add `app/api/assets/[assetCardId]/route.ts` DELETE. Soft-delete or remove AssetCard; log reject.  
  **Acceptance Criteria**: AssetCard removed or marked deleted; decision logged; 403/404 handled.

---

## Phase 4: Export Functionality

**Purpose**: Export approved/edited AssetCards to README (markdown) and resume (bullet) formats.

**Independent Test**: `POST /api/export` with `assetCardIds` and `format: "readme"` or `"resume"` returns formatted content.

### Phase 4 — Backend Services

- [ ] **T038** Implement export service  
  **Description**: Add `src/services/export/export.service.ts`. `export(assetCardIds, format)`: load AssetCards (must be approved/edited), validate ownership. Format as README (markdown) or resume (plain bullets). Return `{ format, content, exportedAssetCardIds, exportedAt }`.  
  **Acceptance Criteria**: README and resume formats match contracts; only allowed AssetCards exported; timestamps updated.

### Phase 4 — API Routes

- [ ] **T039** Implement `POST /api/export`  
  **Description**: Add `app/api/export/route.ts`. Validate body (`assetCardIds`, `format`). Call export service. Return JSON with `content` and metadata. **Handle export template render errors**: on template failure, return 500, log error (via T021/logger); do not expose raw error to client.  
  **Acceptance Criteria**: Export payload validated; response matches contracts; 400/403/404 for invalid or unauthorized; 500 + logging when template render fails.

---

## Phase 5: UI Implementation

**Purpose**: Inbox + Library UI, auth flows, repository management, export. Minimal actions; approval/editing over creation.

**Independent Test**: Login → connect repo → open inbox → approve/edit AssetCard → export to README or resume.

### Phase 5 — Layout & Common Components

- [ ] **T040** [P] Add root layout and global styles  
  **Description**: Implement `app/layout.tsx` and `app/styles/globals.css`. Root layout wraps app; redirect unauthenticated to login.  
  **Acceptance Criteria**: Layout renders; globals applied; auth redirect works.

- [ ] **T041** [P] Add Header component  
  **Description**: Create `app/components/layout/Header.tsx`. Links to inbox, library, repositories, export; sign-out.  
  **Acceptance Criteria**: Navigation works; sign-out clears session.

- [ ] **T042** [P] Add common components  
  **Description**: Create `app/components/common/Button.tsx`, `Input.tsx`, `Modal.tsx` (minimal, reusable).  
  **Acceptance Criteria**: Components render; usable in forms and modals.

### Phase 5 — Auth UI

- [ ] **T043** Implement login page  
  **Description**: Add `app/(auth)/login/page.tsx`. "Connect GitHub" triggers NextAuth sign-in.  
  **Acceptance Criteria**: Click connects to GitHub OAuth; callback returns to app.

- [ ] **T044** Implement OAuth callback page  
  **Description**: Add `app/(auth)/callback/page.tsx` or rely on NextAuth callback. Redirect to dashboard (e.g. inbox) after success.  
  **Acceptance Criteria**: Post-login redirect to inbox or dashboard.

### Phase 5 — Repositories UI

- [ ] **T045** Implement repositories page  
  **Description**: Add `app/(dashboard)/repositories/page.tsx`. List connected repos via `GET /api/repositories`; connect (modal or form) via `POST /api/repositories/connect`; disconnect via `DELETE`. Use `useRepositories` hook.  
  **Acceptance Criteria**: List, connect, disconnect work; UI reflects state.

- [ ] **T046** [P] Add RepositoryList and RepositoryCard components  
  **Description**: Create `app/components/features/Repository/RepositoryList.tsx`, `RepositoryCard.tsx`.  
  **Acceptance Criteria**: List and card used by repositories page; display owner, name, status.

### Phase 5 — Inbox & Library UI

- [ ] **T047** Implement inbox page  
  **Description**: Add `app/(dashboard)/inbox/page.tsx`. Fetch `GET /api/assets/inbox`; show AssetCards (inbox + flagged) in inbox-style list (most recent first). Visually distinguish `flagged` items (e.g. badge, validationErrors). Use `useAssetCards` hook.  
  **Acceptance Criteria**: Inbox lists pending AssetCards (inbox + flagged); flagged clearly marked; empty state when none.

- [ ] **T048** Implement library page  
  **Description**: Add `app/(dashboard)/library/page.tsx`. Fetch `GET /api/assets/library`; show approved/edited AssetCards.  
  **Acceptance Criteria**: Library lists approved/edited assets; supports export selection.

- [ ] **T049** Add AssetCard components  
  **Description**: Create `AssetCardItem.tsx`, `AssetCardDetail.tsx`, `AssetCardEditor.tsx` in `app/components/features/AssetCard/`. Item for list; Detail for view; Editor for lightweight edit.  
  **Acceptance Criteria**: Inbox uses Item; Detail shows full card; Editor allows field edits and save.

- [ ] **T050** Wire approve and edit actions in inbox (including flagged-for-review)  
  **Description**: From inbox, approve (no edit) or open editor and save. Call `POST /api/assets/[id]/approve` or `.../edit`. Support **flagged** items: user can edit to fix validation issues then approve, or reject. Update local state or refetch.  
  **Acceptance Criteria**: Approve and edit work for inbox and flagged; flagged → edit → approve flow works; AssetCard moves to library; UI updates.

### Phase 5 — Export UI

- [ ] **T051** Implement export page and ExportDialog  
  **Description**: Add `app/(dashboard)/export/page.tsx` and `app/components/features/Export/ExportDialog.tsx`. Select AssetCards from library; choose README or resume; call `POST /api/export`; show copy/download.  
  **Acceptance Criteria**: User can select assets, pick format, copy or download; content matches format.

### Phase 5 — Hooks & Context

- [ ] **T052** [P] Add useAuth hook and AuthContext  
  **Description**: Create `app/hooks/useAuth.ts` and `app/context/AuthContext.tsx`. Expose session, loading, sign-out.  
  **Acceptance Criteria**: Auth state available across app; hooks used in layout and pages.

- [ ] **T053** [P] Add useRepositories, useAssetCards, useExport hooks  
  **Description**: Create `app/hooks/useRepositories.ts`, `useAssetCards.ts`, `useExport.ts`. Wrap `GET/POST/DELETE` repos, `GET` inbox/library, `POST` export.  
  **Acceptance Criteria**: Hooks encapsulate API calls; used by repositories, inbox, library, export pages.

### Phase 5 — Routing

- [ ] **T054** Configure dashboard routing and default redirect  
  **Description**: Ensure `app/(dashboard)/*` routes exist; root or `/` redirects to inbox (or login if unauthenticated).  
  **Acceptance Criteria**: `/` → inbox or login; dashboard routes accessible when authenticated.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Docs, security, and quickstart validation. No new features.

### Phase 6 — Testing

- [ ] **T055** Run quickstart validation  
  **Description**: Follow `quickstart.md` (GCP, Firestore, GitHub OAuth, env, Cloud Tasks). Run app and workers; verify auth, connect repo, webhook → AssetCard, inbox, export.  
  **Acceptance Criteria**: Quickstart steps succeed; end-to-end flow works.

### Phase 6 — Infrastructure

- [ ] **T056** Harden Firestore rules and API auth  
  **Description**: Review `config/firestore.rules` (see T005); ensure all collections scoped by `userId`. Ensure all relevant API routes use auth middleware and validate ownership.  
  **Acceptance Criteria**: No cross-user data access; rules and routes audited.

### Phase 6 — Validation Middleware

- [ ] **T057** Add validation middleware to API routes  
  **Description**: Add `src/middleware/validation.middleware.ts`. **Build on T015 schemas** (`src/schemas/validation.schemas.ts`); apply to repository connect, asset edit, export routes. Return 400 with clear messages for invalid input.  
  **Acceptance Criteria**: Invalid payloads rejected via middleware using T015 schemas; error format consistent.

---

## Edge Cases & MVP Handling

| Edge Case (spec) | In MVP? | Handling |
| --------------- | ------- | -------- |
| User disconnects repo while PR events are processing | Yes | T025: before processing, verify repo still connected; if not, mark PR event failed, skip AssetCard creation. In-flight tasks may complete for already-enqueued events. |
| PR events from repos user no longer has access to | Yes | T025: same as above; verify repository connected and user access before processing. |
| LLM transformation fails or invalid schema data | Yes | T026/T028: create AssetCard `status: "flagged"` with `validationErrors`; user reviews in inbox, edits or rejects (U1). |
| Duplicate PR events (webhook retries, manual) | Yes | T019, T024: idempotency via `X-GitHub-Delivery` / `githubEventId`; one AssetCard per PR event. |
| Export format template fails to render | Yes | T039: return 500, log error; no raw error to client. |
| Very large PR diffs exceed processing limits | Yes | T023: cost-aware diff processor; truncate (e.g. 5000 lines), use `diffStats`; SC-008 (10k lines) via truncation + stats. |
| GitHub OAuth token expires or revoked | Yes | NextAuth refresh; if refresh fails, user re-authenticates. No dedicated task; document in quickstart. |
| Concurrent PR events for same repo | Yes | T024: idempotency; async processing (Cloud Tasks) serializes per task. |

---

## Dependencies & Execution Order

### Phase order

- **Phase 0 (Setup)**: No dependencies. Must complete first.
- **Phase 1 (Infrastructure & Core Services)**: Depends on Phase 0. Blocks Phases 2–5.
- **Phase 2 (PR Event Processing & LLM)**: Depends on Phase 1. Blocks Phase 3 (AssetCard dependency).
- **Phase 3 (Asset Management)**: Depends on Phase 2. Blocks Phase 4 (export uses library).
- **Phase 4 (Export)**: Depends on Phase 3. Can run in parallel with Phase 5 if API stable.
- **Phase 5 (UI)**: Depends on Phases 1–4 (consumes APIs). Can overlap with Phase 4.
- **Phase 6 (Polish)**: After Phases 1–5.

### Task dependencies within phases

- **Phase 1**: T006–T009 (infra) → T010–T012 (services) → T016–T019 (API). T013–T015, T020–T022 can run in parallel with one another where marked [P].
- **Phase 2**: T023–T024 (utils) → T025–T028 (workers + orchestration). T029 aligns webhook with processor.
- **Phase 3**: T030–T031 (services) → T032–T037 (API routes).
- **Phase 4**: T038 → T039.
- **Phase 5**: T040–T042, T052–T053 can run [P]; remaining UI tasks after hooks/context and API stability.

### Parallel opportunities

- Phase 0: T003, T004, T005 [P].
- Phase 1: T006–T009 [P]; T013–T015 [P]; T020–T022 [P].
- Phase 5: T040–T042 [P]; T046 [P]; T052–T053 [P].

---

## Implementation Strategy

### MVP first

1. Complete Phase 0 and Phase 1.
2. Complete Phase 2 (webhook → AssetCard).
3. **Checkpoint**: Verify PR → AssetCard via API/workers; no UI required.
4. Add Phase 3 (Asset API) → Phase 4 (Export API).
5. Add Phase 5 (UI) for full user flow.
6. Phase 6 (Polish) last.

### Incremental delivery

- After Phase 1: Auth + repos + webhook ingestion; testable via curl/Postman.
- After Phase 2: End-to-end PR → AssetCard; testable via webhook + workers.
- After Phase 3–4: Inbox, library, export via API only.
- After Phase 5: Full MVP with UI.
- After Phase 6: Quickstart-validated, security-hardened MVP.

---

## Notes

- [P] = parallelizable (different files, no blocking deps).
- [US1] = Auth + repositories; [US2] = PR ingestion + AssetCard generation; [US3] = Inbox, library, approve/edit, export. Omitted where task is cross-cutting or setup.
- Webhook **must** return 200 immediately and enqueue Cloud Tasks; idempotency via `X-GitHub-Delivery` / `githubEventId`.
- LLM pipeline: **Extract → Synthesize** only; fixed schema; no ADK, no scoring.
- UI: Inbox + Library; approval and light editing over full creation.
- No new features beyond plan; no architecture or tech stack changes.
