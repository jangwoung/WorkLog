# 環境変数付きデプロイ例

**注意**: このファイルには秘密情報を書かず、手元の値で `--set-env-vars` を組み立ててください。

## デプロイコマンド（値は各自で置き換え）

プロジェクトルートで実行:

```bash
gcloud run deploy worklog \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "NEXTAUTH_SECRET=あなたの値,NEXTAUTH_URL=https://worklog-469883860187.asia-northeast1.run.app,GITHUB_CLIENT_ID=あなたの値,GITHUB_CLIENT_SECRET=あなたの値,GOOGLE_CLOUD_PROJECT=worklog-adb04,GITHUB_WEBHOOK_SECRET=あなたの値,FIRESTORE_DATABASE_ID=(default),VERTEX_AI_LOCATION=asia-northeast1,VERTEX_AI_MODEL=gemini-2.5-flash,CLOUD_TASKS_QUEUE_NAME=pr-event-processing,CLOUD_TASKS_LOCATION=asia-northeast1"
```

- 値にカンマや `=` が含まれる場合は、全体をシングルクォートで囲むか、Cloud Run コンソールの「変数とシークレット」で設定してください。
- `NEXTAUTH_URL` は末尾スラッシュなし（`https://worklog-469883860187.asia-northeast1.run.app`）を推奨。
- Vertex AI で 404 が出る場合は `VERTEX_AI_MODEL=gemini-2.5-flash` を試してください（`-001` なし）。

## 環境変数のみ更新する場合（ビルドなし）

イメージはそのまま、環境変数だけ差し替える場合:

```bash
gcloud run services update worklog \
  --region asia-northeast1 \
  --set-env-vars "KEY1=val1,KEY2=val2,..."
```
