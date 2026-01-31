# Webhook → Cloud Tasks → AssetCard 生成の設定ガイド

PR がオープン/更新されると GitHub Webhook が Cloud Run を呼び、Cloud Tasks 経由で Worker が順に実行され AssetCard が生成されます。このドキュメントでは必要な設定を詳細に説明します。

## 全体フロー

```text
GitHub (PR イベント)
    ↓ Webhook POST
Cloud Run: POST /api/webhooks/github
    ↓ 200 即返却 + タスクエンキュー
Cloud Tasks キュー: pr-event-processing
    ↓ タスク実行（HTTP POST）
Cloud Run: POST /api/tasks/pr-event-processor
    ↓ PR 取得・diff 処理 + タスクエンキュー
Cloud Tasks キュー: pr-event-processing
    ↓ タスク実行（HTTP POST）
Cloud Run: POST /api/tasks/asset-generator
    ↓ LLM パイプライン実行
Firestore: asset-cards に新規ドキュメント作成（status: inbox または flagged）
```

---

## 1. GitHub Webhook の設定

### 1.1 対象リポジトリで Webhook を作成

1. GitHub で対象リポジトリを開く
2. **Settings** → **Webhooks** → **Add webhook**
3. 以下を入力:

| 項目 | 値 |
|------|-----|
| **Payload URL** | `https://あなたのCloudRunサービスURL.run.app/api/webhooks/github` |
| **Content type** | `application/json` |
| **Secret** | `.env.local` の `GITHUB_WEBHOOK_SECRET` と同じ値 |
| **Which events would you like to trigger this webhook?** | **Let me select individual events** → `Pull requests` にチェック |

4. **Add webhook** をクリック

### 1.2 注意点

- **Payload URL** は **Cloud Run の本番 URL** にすること。`localhost` は GitHub から到達できないため使えません。
- リポジトリを WorkLog の「接続」で追加すると、アプリが Webhook を自動作成する場合があります。その場合は `GITHUB_WEBHOOK_URL` が Cloud Run の URL になるよう環境変数を設定しておく必要があります。
- **Secret** は Cloud Run の `GITHUB_WEBHOOK_SECRET` と **完全に一致**させる必要があります。

---

## 2. Cloud Run の環境変数

Cloud Run デプロイ時に以下の環境変数が必須です。

### 2.1 Webhook 受信に必要

| 変数 | 説明 | 例 |
|------|------|-----|
| `GITHUB_WEBHOOK_SECRET` | Webhook 署名検証用（GitHub の Secret と同一） | `openssl rand -hex 32` で生成 |
| `NEXTAUTH_URL` | アプリのベース URL（タスクのコールバック先の元になる） | `https://worklog-xxxxx-an.a.run.app` |

### 2.2 Cloud Tasks のタスク先 URL

タスクが呼ぶ HTTP URL は、次のルールで決まります。

- **Webhook → pr-event-processor**: `PR_EVENT_PROCESSOR_WORKER_URL` が未設定なら `{NEXTAUTH_URL}/api/tasks/pr-event-processor`
- **pr-event-processor → asset-generator**: `ASSET_GENERATOR_WORKER_URL` が未設定なら `{NEXTAUTH_URL}/api/tasks/asset-generator`

**Cloud Run で動かす場合は `NEXTAUTH_URL` を本番 URL にしておけば、通常は追加の URL 用変数は不要です。**

明示的に指定したい場合:

| 変数 | 説明 | 例 |
|------|------|-----|
| `PR_EVENT_PROCESSOR_WORKER_URL` | pr-event-processor の URL（オプション） | `https://worklog-xxxxx-an.a.run.app/api/tasks/pr-event-processor` |
| `ASSET_GENERATOR_WORKER_URL` | asset-generator の URL（オプション） | `https://worklog-xxxxx-an.a.run.app/api/tasks/asset-generator` |

### 2.3 Cloud Tasks キューに必要

| 変数 | 説明 | 例 |
|------|------|-----|
| `GOOGLE_CLOUD_PROJECT` | GCP プロジェクト ID | `worklog-adb04` |
| `CLOUD_TASKS_QUEUE_NAME` | キュー名 | `pr-event-processing` |
| `CLOUD_TASKS_LOCATION` | キューのリージョン（Cloud Run と同一推奨） | `asia-northeast1` |

### 2.4 デプロイコマンド例

```bash
gcloud run deploy worklog \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "\
GOOGLE_CLOUD_PROJECT=worklog-adb04,\
GITHUB_CLIENT_ID=あなたのClientID,\
GITHUB_CLIENT_SECRET=あなたのClientSecret,\
NEXTAUTH_SECRET=本番用の32文字,\
NEXTAUTH_URL=https://worklog-xxxxx-an.a.run.app,\
GITHUB_WEBHOOK_SECRET=あなたのWebhookSecret,\
FIRESTORE_DATABASE_ID=(default),\
VERTEX_AI_LOCATION=asia-northeast1,\
VERTEX_AI_MODEL=gemini-2.0-flash-exp,\
CLOUD_TASKS_QUEUE_NAME=pr-event-processing,\
CLOUD_TASKS_LOCATION=asia-northeast1"
```

**重要**: 初回デプロイ後、表示される実際の URL で `NEXTAUTH_URL` を更新し、再デプロイするか `gcloud run services update` で環境変数を変更してください。

---

## 3. Cloud Tasks キューの作成

キューが存在しない場合は作成します。

```bash
gcloud tasks queues create pr-event-processing \
  --location=asia-northeast1
```

リージョンは Cloud Run と合わせることを推奨します（レイテンシとデータ所在地の観点から）。

---

## 4. Cloud Tasks が Cloud Run を呼ぶための前提

### 4.1 認証

- Cloud Run を `--allow-unauthenticated` でデプロイした場合、`/api/tasks/*` も未認証で呼び出せます。
- Cloud Tasks はそのまま HTTP POST でこれらの URL を呼びます。
- 本番でより厳密にする場合は、Cloud Tasks の OIDC トークン発行と Cloud Run の IAM 連携が必要です（別途設定）。

### 4.2 サービスアカウント

- Cloud Run のデフォルトサービスアカウントに、Cloud Tasks のタスク作成に必要な権限があります。
- ソースからデプロイする場合は、Cloud Build 用サービスアカウントに `roles/cloudtasks.enqueuer` 等が付与されている必要があります（`docs/DEPLOY-CLOUDRUN.md` 参照）。

---

## 5. 動作確認手順

### 5.1 事前確認

1. WorkLog にログイン
2. **Repositories** で対象リポジトリを「接続」
3. 対象リポジトリの GitHub Webhook の Payload URL が Cloud Run の `/api/webhooks/github` になっている

### 5.2 Webhook の動作確認

1. 接続済みリポジトリで PR を 1 本オープン（または既存 PR を更新）
2. GitHub: **Settings** → **Webhooks** → 対象 Webhook → **Recent Deliveries**
3. 最新のリクエストで **Response** が `200` であることを確認

### 5.3 Cloud Tasks の確認

1. GCP Console: **Cloud Tasks** → 該当キューを選択
2. タスクが作成・実行されているか確認
3. 実行済みタスクの「詳細」で、どの URL に POST されたかを確認可能

### 5.4 AssetCard の確認

1. 数分以内に WorkLog の **Inbox** に新しい AssetCard が表示される
2. 表示されない場合は Cloud Run のログで `pr-event-processor` / `asset-generator` のエラーを確認

---

## 6. トラブルシューティング

| 現象 | 確認ポイント |
|------|--------------|
| Webhook が 401 | `GITHUB_WEBHOOK_SECRET` が GitHub の Secret と一致しているか |
| Webhook が 500 | Cloud Run ログで `GITHUB_WEBHOOK_SECRET` 未設定やその他のエラーを確認 |
| タスクが作成されない | `CLOUD_TASKS_QUEUE_NAME` / `CLOUD_TASKS_LOCATION` / `GOOGLE_CLOUD_PROJECT` が正しいか |
| タスクが失敗する | Cloud Tasks のタスク詳細で「失敗理由」を確認。URL が Cloud Run の正しいパスか確認 |
| AssetCard が生成されない | Cloud Run ログで Vertex AI / Firestore / GitHub API のエラーを確認。リポジトリがまだ「接続」状態か確認 |

---

## 7. 関連ドキュメント

- [DEPLOY-CLOUDRUN.md](./DEPLOY-CLOUDRUN.md) - Cloud Run デプロイ手順
- [.env.example](../.env.example) - 環境変数一覧
