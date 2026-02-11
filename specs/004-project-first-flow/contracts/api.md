# API Contracts: WorkLog — プロジェクト先行フロー（004）

**Feature**: 004-project-first-flow | **Date**: 2026-02-08

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://[domain]/api`

## Authentication

全エンドポイントで認証必須。NextAuth（GitHub OAuth）のセッションから `userId` を取得し、オーナー・承認者として利用する。

---

## Projects（プロジェクト）

### POST /api/projects

プロジェクトを新規作成（status: draft）。

**Request body**:
```json
{
  "name": "string (optional)",
  "purpose": "string (required)",
  "mustObserve": ["string"],
  "successCriteria": "string (optional)",
  "scope": "string (optional)",
  "constraints": {}
}
```

**Response** `201`:
```json
{
  "projectId": "string",
  "name": "string | null",
  "purpose": "string",
  "mustObserve": ["string"],
  "status": "draft",
  "createdAt": "ISO8601"
}
```

**Errors**: `400` 不正入力（purpose 欠損など）、`401` 未認証

---

### GET /api/projects

認証ユーザーがオーナーのプロジェクト一覧を取得。クエリ: `status`, `limit`, `cursor`（ページング）。

**Response** `200`:
```json
{
  "projects": [
    {
      "projectId": "string",
      "name": "string | null",
      "purpose": "string",
      "status": "draft | criteria_proposed | criteria_approved | provisioned",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "nextCursor": "string | null",
  "hasMore": "boolean"
}
```

---

### GET /api/projects/[projectId]

プロジェクト 1 件の詳細を取得。オーナーのみ。

**Response** `200`:
```json
{
  "projectId": "string",
  "userId": "string",
  "name": "string | null",
  "purpose": "string",
  "mustObserve": ["string"],
  "successCriteria": "string | null",
  "scope": "string | null",
  "constraints": {},
  "status": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors**: `404` 存在しない or 権限なし、`401` 未認証

---

### PATCH /api/projects/[projectId]

プロジェクトを更新。**status が draft のときのみ**編集可能。purpose, mustObserve, successCriteria, scope, constraints, name を部分的に更新。

**Request body**: 更新したいフィールドのみ送る（部分更新）。
```json
{
  "name": "string",
  "purpose": "string",
  "mustObserve": ["string"],
  "successCriteria": "string",
  "scope": "string",
  "constraints": {}
}
```

**Response** `200`: 更新後のプロジェクト（GET と同じ形）

**Errors**: `400` 不正入力 or status が draft 以外、`404`, `401`

---

## Audit Criteria（監査観点）

### POST /api/projects/[projectId]/propose-criteria

プロジェクトの設定（purpose, mustObserve 等）から、AI が監査観点を提案する。プロジェクトは **draft** であること。実行後、プロジェクト status は `criteria_proposed` に更新し、提案された観点が `audit_criteria` に保存される。

**Response** `200`:
```json
{
  "projectId": "string",
  "status": "criteria_proposed",
  "criteriaCount": "number",
  "criteria": [
    {
      "criteriaId": "string",
      "title": "string",
      "description": "string",
      "category": "string | null",
      "order": "number",
      "status": "proposed",
      "source": "ai"
    }
  ]
}
```

**Errors**: `400` プロジェクトが draft でない or 既に criteria がある、`404`, `401`, `503` AI 一時エラー

---

### GET /api/projects/[projectId]/criteria

プロジェクトに紐づく監査観点一覧。order でソート。

**Response** `200`:
```json
{
  "criteria": [
    {
      "criteriaId": "string",
      "projectId": "string",
      "title": "string",
      "description": "string",
      "category": "string | null",
      "order": "number",
      "status": "proposed | approved | rejected",
      "source": "ai | user",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

### PATCH /api/projects/[projectId]/criteria/[criteriaId]

監査観点 1 件を更新。タイトル・説明の編集、または status を `approved` / `rejected` に変更。

**Request body**:
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "category": "string (optional)",
  "order": "number (optional)",
  "status": "proposed | approved | rejected (optional)"
}
```

**Response** `200`: 更新後の criteria 1 件

**Errors**: `400`, `404`, `401`

---

### POST /api/projects/[projectId]/criteria

ユーザーが監査観点を 1 件手動追加（source: user）。プロジェクトが criteria_proposed または criteria_approved のとき可能。

**Request body**:
```json
{
  "title": "string",
  "description": "string",
  "category": "string (optional)",
  "order": "number (optional)"
}
```

**Response** `201`: 作成された criteria（status: proposed）

---

### POST /api/projects/[projectId]/approve

プロジェクトの「監査観点一覧」を承認する。承認済み criteria のみを approvedCriteriaIds に含め、project_approvals に 1 件作成。プロジェクト status を `criteria_approved` に更新。

**Request body**:
```json
{
  "approvedCriteriaIds": ["string"],
  "comment": "string (optional)",
  "validTo": "ISO8601 (optional)"
}
```

**Response** `200`:
```json
{
  "approvalId": "string",
  "projectId": "string",
  "status": "approved",
  "approvedCriteriaIds": ["string"],
  "validFrom": "ISO8601",
  "validTo": "ISO8601 | null"
}
```

**Errors**: `400` プロジェクトが criteria_proposed でない or 既に承認済み、`404`, `401`

---

## Provisioning（リポ作成）

### POST /api/projects/[projectId]/provision

承認済みプロジェクトについて、GitHub にリポジトリを自動作成し、Spec Kit / 仕様駆動開発用の docs（specs/, contracts/, docs/ 等）を配置する。非同期で実行し、既存の provisioning 基盤（Cloud Tasks）を利用する。プロジェクト status は `provisioned` に更新し、作成されたリポを repositories に登録し `projectId` を付与する。

**Request body**:
```json
{
  "repositoryName": "string (optional)",
  "structureType": "speckit-ready (optional)"
}
```

**Response** `202`:
```json
{
  "jobId": "string",
  "projectId": "string",
  "message": "Provisioning enqueued"
}
```

**Errors**: `400` プロジェクトが criteria_approved でない or 既に provisioned、`404`, `401`

---

## Reports（PR レポート）

### GET /api/projects/[projectId]/reports

プロジェクトに紐づくレポート一覧。クエリ: `limit`, `cursor`, `repositoryId`（任意）。

**Response** `200`:
```json
{
  "reports": [
    {
      "reportId": "string",
      "projectId": "string",
      "repositoryId": "string",
      "prEventId": "string",
      "repoFullName": "string",
      "prNumber": "number",
      "prUrl": "string",
      "summary": "string",
      "findings": [
        {
          "criteriaId": "string",
          "title": "string",
          "result": "pass | fail | na",
          "comment": "string",
          "evidenceRef": "string | null"
        }
      ],
      "status": "completed | failed",
      "createdAt": "ISO8601"
    }
  ],
  "nextCursor": "string | null",
  "hasMore": "boolean"
}
```

---

### GET /api/reports/[reportId]

レポート 1 件の詳細。紐づくプロジェクトのオーナーまたはリポの接続者のみ。

**Response** `200`:
```json
{
  "reportId": "string",
  "projectId": "string",
  "repositoryId": "string",
  "prEventId": "string",
  "repoFullName": "string",
  "prNumber": "number",
  "prUrl": "string",
  "baseSHA": "string | null",
  "headSHA": "string | null",
  "diffHash": "string | null",
  "summary": "string",
  "findings": [...],
  "model": "string | null",
  "modelVersion": "string | null",
  "status": "completed | failed",
  "errorCode": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors**: `404`, `401`

---

### GET /api/repositories/[repositoryId]/reports

リポジトリ単位のレポート一覧（そのリポが projectId 付きで紐づいている場合）。クエリ: `limit`, `cursor`。

**Response** `200`: 上記と同様の `reports` 配列 + `nextCursor`, `hasMore`

---

## Webhooks & Tasks（内部・バックグラウンド）

### POST /api/webhooks/github（既存拡張）

PR イベント受信時、該当リポの `projectId` が set されていれば、**プロジェクト用レポート生成タスク**を enqueue する（既存の Asset Generator とは別キューまたは別ハンドラ）。projectId が null のリポは従来どおり既存フロー（001/003）で処理。

### POST /api/tasks/pr-report-generator（004 新規）

Cloud Tasks: プロジェクト紐づき PR について、プロジェクトの目的・厳守点・承認済み監査観点を参照し、AI で Report を生成して保存。**prEventId をキーに冪等**（同一 PR で 2 回実行しても 1 件の Report のみ）。

---

## エラー形式（共通）

```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

よく使う code: `UNAUTHORIZED`, `INVALID_INPUT`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`
