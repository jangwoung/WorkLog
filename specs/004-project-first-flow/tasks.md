# Tasks: WorkLog — プロジェクト先行フロー（004）

**Input**: `specs/004-project-first-flow/spec.md`, `data-model.md`, `contracts/api.md`  
**Prerequisites**: 003 実装済み（認証、Firestore, provisioning 基盤）を前提に 004 を追加する。

**Organization**: User Story 単位（US1〜US4）でタスクをグループ化し、各ストーリーを独立して実装・テストできるようにする。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並列実行可能（別ファイル、依存なし）
- **[Story]**: US1〜US4。Setup / Foundational / Polish はラベルなし
- 各タスクに **ファイルパス** を明示する

## Path Conventions

- **API**: `app/api/projects/route.ts`, `app/api/projects/[projectId]/route.ts`, `app/api/projects/[projectId]/criteria/route.ts` 等
- **Models**: `src/models/project.model.ts`, `src/models/audit-criteria.model.ts`, `src/models/report.model.ts`
- **Services**: `src/services/project/`, `src/services/audit-criteria/`, `src/services/report/`
- **Firestore**: `src/infrastructure/firestore/collections.ts` に projects, audit_criteria, project_approvals, reports を追加

---

## Phase 1: Setup（004 用の準備）

**Purpose**: 004 用のディレクトリ・ルートが存在することを確認し、不足していれば追加する。

- [ ] T001 Verify or add API route directories for 004: `app/api/projects/`, `app/api/projects/[projectId]/`, `app/api/projects/[projectId]/criteria/`, `app/api/projects/[projectId]/propose-criteria/`, `app/api/projects/[projectId]/approve/`, `app/api/projects/[projectId]/provision/`, `app/api/projects/[projectId]/reports/`, `app/api/reports/`, `app/api/tasks/pr-report-generator/` per contracts/api.md

- [ ] T002 Verify `src/models/` and `src/services/` can host project, audit-criteria, project-approval, report; add `src/services/project/`, `src/services/audit-criteria/`, `src/services/report/` if missing

---

## Phase 2: Foundational（データ層・モデル）

**Purpose**: Project, AuditCriteria, ProjectApproval, Report の Firestore コレクションとモデルを用意する。既存 repositories の拡張を含む。

- [ ] T003 Add Firestore collection and accessors for `projects` in `src/infrastructure/firestore/collections.ts` with fields per data-model.md (userId, name, purpose, mustObserve, successCriteria, scope, constraints, status, createdAt, updatedAt)

- [ ] T004 [P] Add Firestore collection and accessors for `audit_criteria` in `src/infrastructure/firestore/collections.ts` (projectId, title, description, category, order, status, source, createdAt, updatedAt)

- [ ] T005 [P] Add Firestore collection and accessors for `project_approvals` in `src/infrastructure/firestore/collections.ts` (projectId, approverId, status, approvedCriteriaIds, comment, validFrom, validTo, createdAt, updatedAt)

- [ ] T006 [P] Add Firestore collection and accessors for `reports` in `src/infrastructure/firestore/collections.ts` with fields per data-model.md (projectId, repositoryId, prEventId, repoFullName, prNumber, prUrl, baseSHA, headSHA, diffHash, summary, findings[], model, modelVersion, status, errorCode, createdAt, updatedAt)

- [ ] T007 Extend Repository type and Firestore usage to support optional `projectId` in `src/models/repository.model.ts` and `src/infrastructure/firestore/collections.ts`; migration or write path for existing repos is no-op (projectId null)

- [ ] T008 [P] Create Project model and types in `src/models/project.model.ts` (projectId, userId, name, purpose, mustObserve, successCriteria, scope, constraints, status, createdAt, updatedAt)

- [ ] T009 [P] Create AuditCriteria model and types in `src/models/audit-criteria.model.ts` (criteriaId, projectId, title, description, category, order, status, source, createdAt, updatedAt)

- [ ] T010 [P] Create ProjectApproval and Report models in `src/models/project-approval.model.ts` and `src/models/report.model.ts` per data-model.md

**Checkpoint**: データ層とモデルが揃い、US1 以降の実装に進める。

---

## Phase 3: User Story 1 — ログインとプロジェクト設定（P1）

**Goal**: ユーザーがプロジェクトを 1 件作成し、目的・厳守点・成功基準などを入力・保存できる。status は draft。次のステップ「監査観点の提案」に進める。

**Independent Test**: ログイン → プロジェクト作成（purpose, mustObserve 入力）→ 一覧・詳細で表示される。PATCH で draft の間だけ編集可能。

- [ ] T011 [US1] Implement project service (create, getById, list, update) in `src/services/project/project.service.ts`; create only with status draft; update only when status is draft; list filter by userId

- [ ] T012 [US1] Implement POST /api/projects in `app/api/projects/route.ts`; validate body (purpose required, mustObserve array); return 201 with projectId and status draft

- [ ] T013 [US1] Implement GET /api/projects in `app/api/projects/route.ts`; query params status, limit, cursor; return projects for authenticated user with nextCursor and hasMore

- [ ] T014 [US1] Implement GET /api/projects/[projectId] and PATCH /api/projects/[projectId] in `app/api/projects/[projectId]/route.ts`; GET returns full project; PATCH allows partial update only when status is draft; 404 if not owner

- [ ] T015 [US1] Add minimal UI for project list and project create/edit in `app/(dashboard)/projects/page.tsx` and `app/(dashboard)/projects/[projectId]/page.tsx`; form fields purpose, mustObserve, successCriteria, scope, name; link to next step "Propose criteria"

**Checkpoint**: US1 完了。プロジェクトの作成・一覧・詳細・更新ができる。

---

## Phase 4: User Story 2 — AI が監査観点を提案し、ユーザーが承認（P1）

**Goal**: プロジェクト設定が完了したら、AI が監査観点を提案する。ユーザーは一覧を確認し、承認・編集・却下する。承認が完了するとプロジェクト status が criteria_approved になり、プロビジョニング可能になる。

**Independent Test**: draft プロジェクトで POST propose-criteria → criteria が作成され status が criteria_proposed。PATCH で criteria を approved にし、POST approve → project_approval が作成され status が criteria_approved。

- [ ] T016 [US2] Implement audit-criteria service (create, listByProjectId, update, proposeWithAI) in `src/services/audit-criteria/audit-criteria.service.ts`; proposeWithAI calls Vertex AI with project purpose/mustObserve and returns fixed-schema criteria list; store with source ai and status proposed

- [ ] T017 [US2] Implement project-approval service (create, getByProjectId) in `src/services/project-approval/project-approval.service.ts`; create only when project has at least one approved criterion and project status is criteria_proposed; set project status to criteria_approved after create

- [ ] T018 [US2] Implement POST /api/projects/[projectId]/propose-criteria in `app/api/projects/[projectId]/propose-criteria/route.ts`; require project status draft; call proposeWithAI; persist criteria and set project status to criteria_proposed; return criteria list

- [ ] T019 [US2] Implement GET /api/projects/[projectId]/criteria and PATCH /api/projects/[projectId]/criteria/[criteriaId] and POST /api/projects/[projectId]/criteria in `app/api/projects/[projectId]/criteria/route.ts` and `app/api/projects/[projectId]/criteria/[criteriaId]/route.ts`; GET returns criteria ordered by order; PATCH allows title, description, category, order, status; POST adds one criterion with source user

- [ ] T020 [US2] Implement POST /api/projects/[projectId]/approve in `app/api/projects/[projectId]/approve/route.ts`; body approvedCriteriaIds, optional comment, validTo; create project_approval and set project status to criteria_approved; 400 if already approved or not criteria_proposed

- [ ] T021 [US2] Add UI for criteria review and approve in `app/(dashboard)/projects/[projectId]/criteria/page.tsx`; display proposed criteria; allow approve/reject per item and bulk approve; button to submit approval (POST approve)

**Checkpoint**: US2 完了。監査観点の提案・編集・承認まで一連でできる。

---

## Phase 5: User Story 3 — 承認後に GitHub リポ自動作成と Spec Kit/docs 配置（P1）

**Goal**: 承認済みプロジェクトについて、GitHub にリポジトリを自動作成し、Spec Kit / 仕様駆動開発用の docs（specs/, contracts/, docs/ 等）を初期コミットで配置する。プロジェクト status を provisioned にし、repositories に projectId を付与して登録する。

**Independent Test**: criteria_approved プロジェクトで POST provision → 202; タスク完了後にリポが作成され、docs が含まれ、repositories に projectId 付きで登録され、project status が provisioned になる。

- [ ] T022 [US3] Extend provisioning service or add project-provisioning service in `src/services/provisioning/project-provisioning.service.ts`; validate projectId (project exists, status criteria_approved, no existing provisioning for this project); enqueue task with idempotency key (e.g. projectId); payload projectId, userId, repositoryName, structureType

- [ ] T023 [US3] Implement POST /api/projects/[projectId]/provision in `app/api/projects/[projectId]/provision/route.ts`; require project status criteria_approved; call enqueue; return 202 with jobId and projectId; 400 if already provisioned

- [ ] T024 [US3] Implement provisioning task handler for 004 in `app/api/tasks/project-provisioning/route.ts` (or extend existing `app/api/tasks/provisioning/route.ts` with projectId branch): create GitHub repo via API; create Spec Kit / docs structure (specs/, contracts/, docs/ with placeholder files) and commit via GitHub API; register repo in Firestore repositories with projectId; write provisioning_events with projectId reference; set project status to provisioned; idempotent by projectId

- [ ] T025 [US3] Add Spec Kit bootstrap content (e.g. specs/README.md, contracts/.gitkeep, docs/README.md or template) in code or config so task can push initial commit; document structure in specs/004-project-first-flow or plan

- [ ] T026 [US3] Ensure webhook is registered for the newly created repo (reuse existing connectRepository flow or internal registration) so PR events are received; link repository document to projectId in Firestore

**Checkpoint**: US3 完了。承認 → プロビジョニング → リポ作成・docs 配置・project 紐づけまで動作する。

---

## Phase 6: User Story 4 — そのリポで PR 発生時に設定に基づく AI レポート作成（P1）

**Goal**: プロジェクト紐づきリポ（repositories.projectId 設定済み）で PR が発生したとき、Webhook でイベントを受け、プロジェクトの目的・厳守点・承認済み監査観点を参照して AI が Report を生成し保存する。一覧・詳細 API で取得可能にする。

**Independent Test**: projectId 付きリポで PR を発生させる → Webhook 受信 → pr-report-generator が実行され Report が 1 件作成される。GET /api/projects/[projectId]/reports で一覧取得できる。

- [ ] T027 [US4] Extend GitHub webhook handler in `app/api/webhooks/github/route.ts`; after resolving repository, if repository.projectId is set, enqueue PR report generator task (payload prEventId, projectId, repositoryId, userId) in addition to or instead of existing asset-generator for that repo (product decision: 004 repos use report-only, or both; recommend report-only for projectId repos)

- [ ] T028 [US4] Implement pr-report-generator task handler in `app/api/tasks/pr-report-generator/route.ts`; load prEvent, project, approved audit criteria; fetch PR diff from GitHub (do not store full diff); call Vertex AI with project purpose, mustObserve, criteria list and PR context; output fixed-schema Report (summary, findings per criteria with result pass/fail/na, comment, evidenceRef); save to reports collection; idempotent by prEventId (skip if report already exists for that prEventId)

- [ ] T029 [US4] Implement report service (create, getById, listByProjectId, listByRepositoryId) in `src/services/report/report.service.ts`; list supports limit and cursor

- [ ] T030 [US4] Implement GET /api/projects/[projectId]/reports and GET /api/reports/[reportId] and GET /api/repositories/[repositoryId]/reports in `app/api/projects/[projectId]/reports/route.ts`, `app/api/reports/[reportId]/route.ts`, `app/api/repositories/[repositoryId]/reports/route.ts`; enforce ownership or repo access

- [ ] T031 [US4] Add minimal UI for report list and report detail in `app/(dashboard)/projects/[projectId]/reports/page.tsx` and `app/(dashboard)/reports/[reportId]/page.tsx`; list shows summary, PR link, createdAt; detail shows findings with result and comment

**Checkpoint**: US4 完了。PR 発生 → レポート自動作成 → 一覧・詳細表示までできる。

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 冪等性、エラーハンドリング、簡易 quickstart の整備。

- [ ] T032 Enforce idempotency: project provisioning by projectId (already provisioned → skip); pr-report-generator by prEventId (existing report → return 200); document keys in contracts or quickstart

- [ ] T033 Add validation and error handling for all 004 API routes: 400 for invalid body/query, 404 for missing resource or not owner, 401 for unauthenticated; consistent error response shape per contracts/api.md

- [ ] T034 Add or update quickstart.md in `specs/004-project-first-flow/quickstart.md` with steps: create project → propose criteria → approve → provision → trigger PR → confirm report; fix gaps in implementation or docs if found

**Checkpoint**: Polish 完了。004 フローを端末で確認できる。

---

## Dependencies & Execution Order

### Phase order

- **Phase 1 (Setup)**: 依存なし。最初に実施。
- **Phase 2 (Foundational)**: Phase 1 の完了後。全 US の前提。
- **Phase 3 (US1)**: Phase 2 の後。プロジェクト CRUD。
- **Phase 4 (US2)**: Phase 2 の後。US1 完了後が望ましい（プロジェクトが存在する前提）。
- **Phase 5 (US3)**: Phase 2・4 の後。承認済みプロジェクトが必要。
- **Phase 6 (US4)**: Phase 2・3・5 の後。プロビジョニング済みリポと PR が必要。
- **Phase 7 (Polish)**: Phase 3〜6 の後。

### User story mapping

| Story | Tasks | Deliverable |
|-------|-------|-------------|
| US1 プロジェクト設定 | T011–T015 | プロジェクト作成・一覧・詳細・更新（draft） |
| US2 監査観点提案・承認 | T016–T021 | AI 提案 → 編集・承認 → criteria_approved |
| US3 リポ自動作成・docs | T022–T026 | POST provision → リポ作成 + Spec Kit/docs、projectId 紐づけ |
| US4 PR レポート | T027–T031 | Webhook 分岐、pr-report-generator、Report API・UI |

### Parallel opportunities

- Phase 2: T004, T005, T006, T008, T009, T010 は並列可能。
- Phase 3〜4 は順序を守る前提で、モデル・サービス・ルートのうち別ファイルのタスクは並列化可能。

### Implementation strategy

**MVP**: Phase 1 → 2 → 3 → 4 → 5 → 6 を順に実施し、ログイン〜プロジェクト作成〜監査観点承認〜リポ作成〜PR レポートまで一連で検証する。Phase 7 で quickstart とエラー処理を固める。

---

## Notes

- 既存 003 の repositories, pr-events, provisioning_events, webhooks を拡張して利用する。004 専用のコレクションは projects, audit_criteria, project_approvals, reports。
- 監査観点の AI 提案は固定スキーマで返すこと（category, title, description, order）。プロンプトは `src/services/audit-criteria/` または vertex-ai 用モジュールに集約する。
- Report の findings は criteriaId に対応する result (pass/fail/na) と comment, evidenceRef のみ保存し、フル diff は保存しない。
