# 本番での「Server Components render」エラーの切り分け

ブラウザに次のように出るときは、**サーバー側で例外**が出ており、本番ビルドでは文言が隠れます。

```
Error: An error occurred in the Server Components render. The specific message is omitted in production builds...
```

## 1. 実エラーを確認する（Cloud Run のログ）

次のどちらかで、コンテナの stderr / ログを確認します。

### コンソールで見る

1. [Cloud Run](https://console.cloud.google.com/run) を開く
2. サービス **worklog** をクリック
3. 上タブの **「ログ」** を開く（または **「オブザーバビリティ」→「ログ」**）
4. エラーが出た時刻付近の行を確認する（`Error` / `Exception` / `throw` など）

### gcloud で見る

```bash
gcloud run services logs read worklog --region=asia-northeast1 --limit=100
```

ここに出ている **スタックトレースやメッセージ** が本当の原因です。

---

## 2. よくある原因と確認事項

### A. NEXTAUTH_URL が本番 URL と一致していない

- **必須**: Cloud Run の「サービス URL」と完全一致させる。
- 例: `https://worklog-469883860187.asia-northeast1.run.app`
- **不可**: `http://`、末尾の `/`、`worklog-dummy.run.app` などの仮 URL。

**確認・修正**（本番 URL に合わせて実行）:

```bash
gcloud run services update worklog --region=asia-northeast1 \
  --set-env-vars "NEXTAUTH_URL=https://worklog-469883860187.asia-northeast1.run.app,GITHUB_WEBHOOK_URL=https://worklog-469883860187.asia-northeast1.run.app/api/webhooks/github"
```

既存の他の環境変数は上書きされないため、必要なら `--update-env-vars` でまとめて揃えてください。

### B. 必須の環境変数が足りない

次のどれかが未設定だと、`getServerSession(authOptions)` や NextAuth で落ちることがあります。

| 変数名 | 役割 |
|--------|------|
| `NEXTAUTH_URL` | 本番のサービス URL（上記と同一） |
| `NEXTAUTH_SECRET` | セッション署名用（空だと不具合の元） |
| `GITHUB_CLIENT_ID` | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `GOOGLE_CLOUD_PROJECT` | Firestore 等のプロジェクト ID |

Cloud Run の **「変数とシークレット」** で、上記がすべて設定されているか確認してください。

### C. Cloud Run のサービスアカウントに Firestore 権限がない

ログインやコールバックで Firestore を触るため、**Cloud Run が使うサービスアカウント**（デフォルトなら `PROJECT_NUMBER-compute@developer.gserviceaccount.com`）に権限が必要です。

**確認**:

```bash
gcloud projects get-iam-policy worklog-adb04 \
  --flatten="bindings[].members" \
  --filter="bindings.members:469883860187-compute@developer.gserviceaccount.com" \
  --format="table(bindings.role)"
```

**付与**（まだ付いていなければ）:

```bash
gcloud projects add-iam-policy-binding worklog-adb04 \
  --member="serviceAccount:469883860187-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

（条件を聞かれた場合は `2` = None）

---

## 3. 切り分けの手順

1. **ログで実エラーを確認する**（上記「1. 実エラーを確認する」）
2. **NEXTAUTH_URL を本番 URL に合わせる**（「2. A」）
3. **必須の環境変数がすべて設定されているか確認する**（「2. B」）
4. ログに Firestore / 権限系のメッセージがあれば、**サービスアカウントのロールを確認・付与する**（「2. C」）

多くの場合は **NEXTAUTH_URL の不一致** か **環境変数の未設定** で、ログにその旨が出ます。まずログを開き、表示されているメッセージに合わせて上から順に確認すると原因を絞り込みやすくなります。
