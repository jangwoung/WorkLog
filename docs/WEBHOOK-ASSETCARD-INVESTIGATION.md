# Webhook → AssetCard が作成されない場合の調査ガイド

デプロイ後に新規 PR で Webhook を送っても AssetCard が Inbox に表示されない場合、以下の順で切り分けしてください。

---

## 1. フローと失敗ポイント

```text
GitHub (PR) → POST /api/webhooks/github
  → リポジトリ未接続なら 200 のままタスクは作らない
  → タスクエンキュー失敗時も 200 を返す（ログにエラー）
Cloud Tasks (pr-event-processor)
  → POST /api/tasks/pr-event-processor
  → リポジトリ削除/未接続・ユーザー不一致なら PR を failed にして 200
Cloud Tasks (asset-generator)
  → POST /api/tasks/asset-generator
  → PR が failed なら 200 でリトライ停止（カードは作らない）
  → LLM パイプライン失敗時は 5xx → リトライ
```

**重要**: Webhook は「リポジトリ未接続」や「タスクエンキュー失敗」でも **200** を返します。GitHub の Response が 200 だからといって、タスクが作成されたとは限りません。

---

## 2. 調査チェックリスト

### 2.1 GitHub Webhook の応答

1. 対象リポジトリ: **Settings** → **Webhooks** → 対象 Webhook → **Recent Deliveries**
2. 該当 PR のイベントで **Response** を確認:
   - **200**: 署名OK・リポジトリ検索まで到達。このあと「タスクが作られていない」可能性あり。
   - **401**: `GITHUB_WEBHOOK_SECRET` と GitHub の Secret が一致していない。
   - **500**: Cloud Run ログで `GITHUB_WEBHOOK_SECRET` 未設定やその他エラーを確認。

### 2.2 Firestore: PR イベントが保存されているか

1. GCP Console: **Firestore** → コレクション `pr_events`
2. 該当 PR の `prNumber` / `repositoryId` に一致するドキュメントがあるか確認。
3. **ない場合**:
   - Webhook で「リポジトリが接続されていない」と判断されている（`fullName` + `connectionStatus: connected` でヒットしていない）。
   - 接続は **Cloud Run にデプロイしたアプリ** の `/repositories` で行ったか確認。
   - Firestore の `repositories` に、そのリポジトリの `fullName` と `connectionStatus: 'connected'` があるか確認。
4. **ある場合**: `processingStatus` を確認:
   - `pending`: pr-event-processor がまだ動いていない、またはタスクが作成されていない。
   - `processing`: pr-event-processor は実行済み。asset-generator の実行待ち or 失敗。
   - `failed`: カードは作られない。`errorMessage` を確認（リポジトリ未接続・ユーザー不一致など）。
   - `completed`: 通常は `assetCardId` が入り、Inbox に表示される。表示されない場合は `asset_cards` を確認。

### 2.3 Cloud Tasks: タスクが作成・実行されているか

1. GCP Console: **Cloud Tasks** → キュー `pr-event-processing`（**リージョンに注意**）
2. キューを作ったリージョンと、Cloud Run の環境変数 `CLOUD_TASKS_LOCATION` が一致しているか確認。
   - **一致していないとタスクは別リージョンに作られるか、キューがなくてエンキュー失敗する。**
   - ドキュメントでは `asia-northeast1` を推奨。コードのデフォルトは `us-central1` のため、**必ず Cloud Run に `CLOUD_TASKS_LOCATION=asia-northeast1` を設定すること。**
3. タスク一覧で、該当時間帯に `pr-event-processor-*` / `asset-generator-*` が存在するか確認。
4. タスクが **ない**: Webhook 内のエンキューで失敗している。Cloud Run ログで `Failed to enqueue PR event processor task` を検索。
5. タスクが **ある** が失敗: タスク詳細の「失敗理由」と、Cloud Run のログ（下記）を照合。

### 2.4 Cloud Run ログで見るキーワード

Cloud Run のログで、該当時間帯に以下を検索してください。

| ログメッセージ | 意味 |
|----------------|------|
| `Repository not connected, ignoring webhook` | リポジトリが Firestore で connected ではない。接続リポジトリ・fullName を確認。 |
| `Failed to enqueue PR event processor task` | タスクの作成に失敗。`GOOGLE_CLOUD_PROJECT` / `CLOUD_TASKS_QUEUE_NAME` / `CLOUD_TASKS_LOCATION`、および権限を確認。 |
| `PR event processor started` | pr-event-processor が呼ばれた。 |
| `Repository not found` / `Repository not connected` (processor 内) | リポジトリ削除済み or 未接続。PR は `failed` になる。 |
| `PR event processed, asset-generator enqueued` | asset-generator タスクはエンキューされた。 |
| `Asset generator started` | asset-generator が呼ばれた。 |
| `PR event previously failed` / `not in processable state` | 既に failed の PR を再処理しようとした。カードは作らない。 |
| `AssetCard generated successfully` | 正常にカード作成済み。 |
| `Asset generator error` / `Extract step failed` / `Synthesize step failed` | LLM パイプラインまたは Vertex AI でエラー。 |
| `GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS environment variable is required` | **修正済み**: 現在のコードは Vertex AI SDK で ADC を使用。Cloud Run では **GEMINI_API_KEY は不要**。`GOOGLE_CLOUD_PROJECT` と `VERTEX_AI_LOCATION` が設定されていれば、デフォルトのサービスアカウントで Vertex AI にアクセスする。サービスアカウントに `roles/aiplatform.user` を付与すること。 |
| `PR event ingested` | Webhook で PR イベントを保存した直後。`eventType: 'opened'` は opened または reopened のどちらも同じ。 |
| `Unsupported PR event action: reopened` | **reopened 対応前のコード**が動いている。修正をコミット・デプロイしたか確認。 |

ログの取得例:

```bash
gcloud run services logs read worklog --region=asia-northeast1 --limit=200
```

---

## 3. よくある原因と対処

| 原因 | 対処 |
|------|------|
| リポジトリが「接続」されていない | Cloud Run のアプリで `/repositories` から接続。Firestore の `repositories` に `connectionStatus: 'connected'` と正しい `fullName` があるか確認。 |
| `CLOUD_TASKS_LOCATION` が未設定または誤り | Cloud Run の環境変数で `CLOUD_TASKS_LOCATION=asia-northeast1`（キューを作ったリージョン）を設定。 |
| タスクのキューが別リージョンにある | キューを `asia-northeast1` に作っているなら、Cloud Run も同じリージョンで `CLOUD_TASKS_LOCATION` を設定。 |
| `NEXTAUTH_URL` が誤っている | タスクが別 URL に飛ぶ。Cloud Run の実際の URL で `NEXTAUTH_URL` を設定。 |
| PR が既に `failed` になっている | 初回処理でエラーになった PR は再処理しない。新規 PR で再テストする。既存 PR は Firestore で `processingStatus` を `pending` に戻すか、別 PR で検証。 |
| Vertex AI / LLM でエラー | ログで `Extract step failed` 等を確認。Vertex AI API 有効化・モデル名・リージョン・クォータを確認。 |
| **asset-generator が 500 → PR が failed に** | 初回の asset-generator 実行で例外（例: 認証エラー）が出ると、PR イベントが `failed` に更新され、以降のリトライでは「PR event previously failed」で 200 が返りカードは作られない。**対処**: 認証・環境変数を修正したうえで**新規 PR** で再テストする。既存の failed の PR は再処理されない。 |
| **Vertex AI 404: Publisher Model ... was not found** | 指定した `VERTEX_AI_MODEL` がリージョンにないか、プロジェクトにアクセス権がない。**対処**: Cloud Run の環境変数で `VERTEX_AI_MODEL=gemini-2.5-flash` に変更（asia-northeast1 で利用可能）。または `VERTEX_AI_LOCATION=global` でグローバルエンドポイントを試す。変更後は**新規 PR**で再テスト。 |

### 3.1 「閉じる → 再度開く」(reopened) でカードが作られない場合

1. **GitHub Webhook の Response**  
   - **400** かつ body に `Unsupported PR event action: reopened` → **reopened 対応がデプロイされていない**。該当コミットを push し、Cloud Run を再デプロイする。
   - **200** → Webhook は受け付けている。以下で続きを確認。

2. **Firestore `pr_events`**  
   - 「再度開いた」時刻あたりに **新しいドキュメント**が 1 件増えているか確認（同じ `prNumber` で 2 件以上ある場合は、新しい方の `receivedAt` が reopen の時刻）。
   - **増えていない** → Webhook が 200 を返していても、`ingestPREvent` の前（リポジトリ未接続など）で処理が止まっているか、まだ古いコードで 400 になっている。Cloud Run のログで `PR event ingested` または `Unsupported PR event action: reopened` を検索。
   - **増えている** → そのドキュメントの `processingStatus` を確認。`pending` ならタスク未実行 or エンキュー失敗。`processing` / `failed` なら 2.4 のログキーワードで pr-event-processor / asset-generator のログを確認。

3. **Cloud Run ログ（reopen した時刻で絞る）**  
   - `PR event ingested` が出ているか → 出ていれば reopened 対応済みのコードが動いている。  
   - 続けて `PR event processor task enqueued` → タスクは作成されている。  
   - `PR event processor started` / `Asset generator started` / `AssetCard generated successfully` のどこで止まっているか確認。

---

## 4. 関連ドキュメント

- [VERIFICATION-GUIDE.md](./VERIFICATION-GUIDE.md) — 動作確認手順・トラブルシューティング表
- [WEBHOOK-CLOUD-TASKS-SETUP.md](./WEBHOOK-CLOUD-TASKS-SETUP.md) — Webhook と Cloud Tasks の設定
- [TROUBLESHOOTING-PRODUCTION-ERROR.md](./TROUBLESHOOTING-PRODUCTION-ERROR.md) — 本番エラー時のログ確認
