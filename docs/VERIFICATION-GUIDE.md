# WorkLog 動作確認手順

**Purpose**: 実装済み機能の動作確認を一覧化したガイド

---

## 1. 事前準備

### 1.1 共通の前提

- [ ] Node.js 20.x 以上
- [ ] GCP プロジェクト作成済み
- [ ] 必要な API 有効化: Cloud Run, Firestore, Cloud Tasks, Vertex AI
- [ ] Firestore データベース作成済み（Native モード）
- [ ] GitHub OAuth App 作成済み（Client ID, Client Secret, Callback URL）
- [ ] Cloud Tasks キュー作成済み（`pr-event-processing`）
- [ ] サービスアカウントに `datastore.user`, `aiplatform.user`, `cloudtasks.enqueuer` を付与

### 1.2 環境変数

- **ローカル**: `.env.local` を `.env.example` を参考に設定
- **Cloud Run**: `docs/DEPLOY-CLOUDRUN.md` の手順で環境変数を設定  
  ※ `GITHUB_WEBHOOK_SECRET` のタイポ（`GITHUB_WEBHOOK_SECRE`）に注意

---

## 2. ローカルでの確認（Webhook なし）

GitHub は localhost に届かないため、Webhook → AssetCard の流れはスキップ。

### 2.1 起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

### 2.2 認証

- [ ] 「Connect GitHub」をクリック
- [ ] GitHub 認可 → アプリにリダイレクト
- [ ] ヘッダーにサインアウト表示

### 2.3 リポジトリ

- [ ] `/repositories` に移動
- [ ] 「Connect Repository」で 1 件接続
- [ ] 接続済みリポジトリが一覧に表示

### 2.4 Inbox

- [ ] `/inbox` に移動
- [ ] 空の場合は「No assets」等の表示を確認（エラーでなければ OK）

### 2.5 Library

- [ ] `/library` に移動
- [ ] エラーが出る場合: Firestore 複合インデックスが未作成の可能性  
  → エラーメッセージ内のリンクからインデックスを作成

### 2.6 Export

- [ ] `/export` に移動
- [ ] Library にデータがあれば選択 → README / Resume でコピー or ダウンロード可能か確認

### 2.7 API 単体確認（任意）

```bash
# ログイン後に Cookie を取得して実行
curl http://localhost:3000/api/repositories -H "Cookie: next-auth.session-token=..."
curl http://localhost:3000/api/assets/inbox -H "Cookie: next-auth.session-token=..."
curl http://localhost:3000/api/assets/library -H "Cookie: next-auth.session-token=..."
```

---

## 3. Cloud Run での確認（フルフロー）

Webhook → AssetCard まで含めた一連の流れを確認する場合。

### 3.1 デプロイ

- [ ] `docs/DEPLOY-CLOUDRUN.md` に従い Cloud Run へデプロイ
- [ ] サービス URL を控える（例: `https://worklog-xxxxx-an.a.run.app`）
- [ ] `NEXTAUTH_URL` を実際の URL で更新

### 3.2 GitHub Webhook 設定

- [ ] 接続対象リポジトリの **Settings** → **Webhooks** → **Add webhook**
- [ ] **Payload URL**: `https://サービスURL.run.app/api/webhooks/github`
- [ ] **Content type**: `application/json`
- [ ] **Secret**: Cloud Run の `GITHUB_WEBHOOK_SECRET` と同じ値
- [ ] **Events**: `Pull requests` のみ

詳細は `docs/WEBHOOK-CLOUD-TASKS-SETUP.md` を参照。

### 3.3 認証・リポジトリ

- [ ] Cloud Run の URL にアクセス
- [ ] GitHub でログイン
- [ ] `/repositories` で 1 件リポジトリを接続

### 3.4 Webhook → AssetCard フロー

- [ ] 接続済みリポジトリで PR をオープン（または更新）
- [ ] GitHub: **Webhooks** → **Recent Deliveries** で最新リクエストの **Response** が `200` か確認
- [ ] GCP Console: **Cloud Tasks** で `pr-event-processing` キューにタスクが作成されているか確認
- [ ] 数分以内に `/inbox` に新しい AssetCard が表示されるか確認

### 3.5 Inbox ～ Export

- [ ] `/inbox` で AssetCard を Approve / Edit
- [ ] `/library` で承認・編集済みが表示される
- [ ] `/export` で README / Resume をコピー or ダウンロード

---

## 4. 確認できる範囲の早見表

| 項目 | ローカル | Cloud Run |
|------|----------|-----------|
| 認証 | ✅ | ✅ |
| リポジトリ接続 | ✅ | ✅ |
| Inbox 表示 | ✅（データがあれば） | ✅ |
| Library 表示 | ✅（インデックス作成後） | ✅ |
| 承認・編集 | ✅ | ✅ |
| Export | ✅ | ✅ |
| Webhook 受信 | ❌（ngrok 等が必要） | ✅ |
| PR → AssetCard 自動生成 | ❌ | ✅ |

---

## 5. トラブルシューティング

| 現象 | 確認ポイント |
|------|--------------|
| ログインできない | OAuth Callback URL が正しいか、`NEXTAUTH_SECRET` が設定されているか |
| Webhook が 401 | `GITHUB_WEBHOOK_SECRET` と GitHub の Secret が一致しているか |
| Webhook が 500 | Cloud Run ログで `GITHUB_WEBHOOK_SECRET` 未設定・タイポを確認 |
| Library で FAILED_PRECONDITION | Firestore 複合インデックス未作成。エラー内リンクから作成 |
| AssetCard が生成されない | [WEBHOOK-ASSETCARD-INVESTIGATION.md](./WEBHOOK-ASSETCARD-INVESTIGATION.md) の調査チェックリストに従い、Webhook→Firestore→Cloud Tasks→ログを順に確認 |
| タスクが作成されない | `CLOUD_TASKS_QUEUE_NAME`, `CLOUD_TASKS_LOCATION`, `cloudtasks.enqueuer` 権限を確認 |
| 「PR event is not in processable state: failed」 | 初回の asset-generator 実行でエラー済み。ログで「Extract step failed」「Synthesize step failed」等を検索し Vertex AI エラー等の原因を特定。修正後、新規 PR で再テスト。既に failed の PR は再処理しない |

### 5.1 PR イベントの status 遷移

- `pending` → `processing`（pr-event-processor で diff 取得後）→ `completed`（asset-generator 成功時）または `failed`（エラー時）
- `failed` の PR イベントは Cloud Tasks のリトライで再実行されても 200 を返してリトライを止める（無限リトライ防止）

---

## 6. 関連ドキュメント

- [DEPLOY-CLOUDRUN.md](./DEPLOY-CLOUDRUN.md) — Cloud Run デプロイ
- [WEBHOOK-CLOUD-TASKS-SETUP.md](./WEBHOOK-CLOUD-TASKS-SETUP.md) — Webhook と Cloud Tasks の設定
- [QUICKSTART-VALIDATION-CHECKLIST.md](./QUICKSTART-VALIDATION-CHECKLIST.md) — T055 検証チェックリスト
