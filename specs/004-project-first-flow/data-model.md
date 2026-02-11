# Data Model: WorkLog — プロジェクト先行フロー（004）

**Feature**: 004-project-first-flow | **Date**: 2026-02-08

## Overview

004 では **Project** を起点に、**AuditCriteria（監査観点）** の提案・承認、**Report**（PR に基づく評価レポート）を扱う。既存の users, repositories, pr-events, provisioning_events を拡張・参照する。

- **Firestore** を継続利用。004 で新規追加するコレクション: **projects**, **audit_criteria**, **project_approvals**, **reports**。
- 既存 **repositories** に `projectId` を追加し「このリポはどのプロジェクトで作成されたか」を紐づける。
- 機密は保存しない（PR のフル diff は保存せず、diffHash と PR URL のみ）。

---

## 新規コレクション

### 1. projects

プロジェクト設定（目的・厳守点・成功基準など）。004 フローの起点。

| Field | Type | Description |
|-------|------|-------------|
| projectId | string | Document ID |
| userId | string | オーナー（作成者） |
| name | string? | プロジェクト表示名（任意） |
| purpose | string | 解決したい課題・目的 |
| mustObserve | string[] | 厳守すべき点（複数可） |
| successCriteria | string? | 成功基準 |
| scope | string? | スコープ |
| constraints | object? | その他制約（JSON） |
| status | string | `draft` \| `criteria_proposed` \| `criteria_approved` \| `provisioned` |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

**ステータス遷移**:
- `draft` — 設定入力中。保存済みで「監査観点の提案」をまだ実行していない。
- `criteria_proposed` — AI が監査観点を提案済み。ユーザーが承認・編集・却下する段階。
- `criteria_approved` — 監査観点の承認完了。プロビジョニング（リポ作成）可能。
- `provisioned` — GitHub リポ作成済み。PR 発生時にレポート生成対象。

**Validation**: purpose は必須。mustObserve は配列（空可）。userId は認証ユーザーと一致すること。

**Relationships**: User 1:* Project。Project 1:* AuditCriteria。Project 0..1 ProjectApproval。Project 0..* Report（リポ経由で PR が来たとき）。

---

### 2. audit_criteria（監査観点）

プロジェクトに紐づく「監査すべき点」。AI 提案 + ユーザー承認で確定する。

| Field | Type | Description |
|-------|------|-------------|
| criteriaId | string | Document ID |
| projectId | string | 紐づくプロジェクト |
| title | string | 観点のタイトル（例: 認証・認可の抜けがないか） |
| description | string | 説明・チェック内容 |
| category | string? | カテゴリ（例: security, performance, convention） |
| order | number | 表示順（0 始まり） |
| status | string | `proposed` \| `approved` \| `rejected` |
| source | string | `ai` \| `user`（AI 提案 or ユーザー追加） |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

**Validation**: projectId は存在するプロジェクトを参照。title, description は必須。

**Relationships**: Project 1:* AuditCriteria。承認時は status を `approved` に更新。Report の findings は criteriaId で参照可能。

---

### 3. project_approvals

プロジェクト単位の「監査観点一覧」に対する承認。承認済みであることを証跡として残す。

| Field | Type | Description |
|-------|------|-------------|
| approvalId | string | Document ID |
| projectId | string | 紐づくプロジェクト |
| approverId | string | 承認したユーザー |
| status | string | `approved` \| `rejected` |
| approvedCriteriaIds | string[] | 承認した監査観点の ID 一覧 |
| comment | string? | 承認時のコメント |
| validFrom | timestamp | 有効開始（承認日時） |
| validTo | timestamp? | 有効期限（任意） |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

**Validation**: projectId, approverId 必須。status が approved のときのみプロビジョニング可能。

**Relationships**: Project 0..* ProjectApproval（通常は 1 件「承認済み」）。Approval は「このプロジェクトの監査観点を承認した」という事実を表す。

---

### 4. reports

PR 発生時に、プロジェクトの目的・厳守点・承認済み監査観点に基づいて AI が生成する評価レポート。

| Field | Type | Description |
|-------|------|-------------|
| reportId | string | Document ID |
| projectId | string | 紐づくプロジェクト |
| repositoryId | string | WorkLog 側リポジトリ ID |
| prEventId | string | PR イベント ID（pr-events 参照） |
| repoFullName | string | 例: owner/repo |
| prNumber | number | PR 番号 |
| prUrl | string | PR の URL |
| baseSHA | string? | ベース SHA |
| headSHA | string? | ヘッド SHA |
| diffHash | string? | diff のハッシュ（証跡用、フル diff は保存しない） |
| summary | string | レポート要約 |
| findings | array | 下記 Finding スキーマの配列 |
| model | string? | 使用した AI モデル |
| modelVersion | string? | モデルバージョン |
| status | string | `completed` \| `failed` |
| errorCode | string? | status が failed 時のエラーコード |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

**findings 要素（固定スキーマ）**:

| Field | Type | Description |
|-------|------|-------------|
| criteriaId | string | 監査観点 ID |
| title | string | 観点タイトル（スナップショット） |
| result | string | `pass` \| `fail` \| `na` |
| comment | string | 所見・コメント |
| evidenceRef | string? | 証拠参照（例: ファイル名・行） |

**Validation**: projectId, repositoryId, prEventId, summary, findings 必須。findings[].result は pass/fail/na のいずれか。

**Relationships**: Project 1:* Report。Report は 1 つの prEvent（1 つの PR）に 1 件（idempotent by prEventId）。

---

## 既存コレクションの拡張

### repositories

004 でプロビジョニングしたリポをプロジェクトに紐づけるため、以下を追加。

| Field（追加） | Type | Description |
|---------------|------|-------------|
| projectId | string? | このリポを生成したプロジェクト ID。null の場合は「手動接続」等。 |

- `projectId` が set されているリポの PR イベントでは、そのプロジェクトの設定・承認済み監査観点を使って Report を生成する。
- Webhook 受信時に repository を取得し、projectId があれば「プロジェクト紐づき PR」としてレポート生成ジョブを enqueue する。

---

## 既存コレクションの参照（変更なし）

- **users** — 認証ユーザー。Project.userId, ProjectApproval.approverId で参照。
- **pr-events** — PR イベント。Report.prEventId で参照。既存の ingest のまま利用。
- **provisioning_events** — リポ作成証跡。003 と同様に intentId/approvalId の代わりに projectId/approvalId を記録するか、004 では project_approvals と projectId で紐づける。設計では「プロビジョニング時に projectId を渡し、provisioning_events に projectId を追加」可能。

---

## リレーション図（概念）

```
User 1 ---- * Project
Project 1 ---- * AuditCriteria
Project 0 ---- * ProjectApproval   (通常 1 件が approved)
Project 1 ---- * Report            (PR ごとに 1 件)
Project 0 ---- 1 Repository        (provisioning で 1 リポ作成、repositories.projectId で紐づけ)
Repository 1 ---- * PREvent
PREvent 0 ---- 1 Report            (プロジェクト紐づきリポの場合)
```

---

## インデックス（Firestore）

- **projects**: `userId` + `createdAt`（一覧）、`status`（criteria_approved の取り出し）
- **audit_criteria**: `projectId` + `order`（プロジェクト別の観点一覧）、`projectId` + `status`
- **project_approvals**: `projectId`（プロジェクトの承認取得）
- **reports**: `projectId` + `createdAt`（プロジェクト別レポート一覧）、`prEventId`（冪等用）、`repositoryId` + `createdAt`

---

## バリデーションルール（要約）

- **Project**: purpose 必須。status は上記 4 値のみ。criteria_approved になるのは、監査観点が少なくとも 1 件 approved かつ project_approval が 1 件 approved のとき（実装で制御）。
- **AuditCriteria**: projectId 存在、title/description 必須。status は proposed/approved/rejected。
- **ProjectApproval**: projectId 存在、approverId 存在。status approved のときのみプロビジョニング許可。
- **Report**: projectId, repositoryId, prEventId 存在。findings は固定スキーマ。フル diff は保存しない。
