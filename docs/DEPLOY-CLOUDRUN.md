# WorkLog を Google Cloud Run にデプロイする

## 前提

- Google Cloud プロジェクトが作成済み（`GOOGLE_CLOUD_PROJECT`）
- gcloud CLI がインストール済み（`gcloud auth login` と `gcloud config set project YOUR_PROJECT_ID` が済んでいること）
- 必要な API が有効：Cloud Run, Container Registry (Artifact Registry), Cloud Build

## 1. 必要な API を有効化

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### ソースからビルドする場合の権限

#### 403: storage.objects.get が出るとき

`--source .` でデプロイする際、ビルド用サービスアカウントが GCS 上のソースを読めないと `Error 403: ... does not have storage.objects.get access` になります。次のロールを付与してください（`PROJECT_ID` と `PROJECT_NUMBER` は各自の値に置き換え。`PROJECT_NUMBER` は `gcloud projects describe PROJECT_ID --format='value(projectNumber)'` で確認可能）。

```bash
# デフォルト Compute 用サービスアカウント
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Cloud Build 用サービスアカウント（推奨）
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

#### Permission denied: artifactregistry.repositories.uploadArtifacts（push が失敗するとき）

`cloudbuild.yaml` でビルドしたイメージを Artifact Registry に push する際、デフォルトの Compute 用サービスアカウントに **Artifact Registry 書き込み** 権限を付与してください。

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

（条件を聞かれた場合は `2` = None を選択）

## 2. 環境変数・シークレットの準備

本番用の値を用意します。Cloud Run では次のいずれかで渡します。

- **環境変数**：`gcloud run deploy` の `--set-env-vars` または YAML / コンソール
- **Secret Manager**：機密は Secret Manager に登録し、Cloud Run でマウント（推奨）

必須の環境変数（`.env.example` 準拠）：

| 変数名 | 説明 |
|--------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth アプリの Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth アプリの Client Secret |
| `NEXTAUTH_URL` | **本番の URL**（例: `https://your-service-xxxxx.run.app`） |
| `NEXTAUTH_SECRET` | 本番用の秘密鍵（`openssl rand -base64 32` で生成） |
| `GOOGLE_CLOUD_PROJECT` | GCP プロジェクト ID |
| `GITHUB_WEBHOOK_SECRET` | Webhook 署名検証用（`openssl rand -hex 32` で生成） |
| `GITHUB_WEBHOOK_URL` | **本番の Webhook URL**（例: `https://your-service-xxxxx.run.app/api/webhooks/github`） |
| `FIRESTORE_DATABASE_ID` | `(default)` のままでよい場合が多い |
| `VERTEX_AI_LOCATION` | 例: `asia-northeast1` |
| `VERTEX_AI_MODEL` | 例: `gemini-2.0-flash-exp` |
| `CLOUD_TASKS_QUEUE_NAME` | 例: `pr-event-processing` |
| `CLOUD_TASKS_LOCATION` | 例: `asia-northeast1` |

**注意**: 本番では `GOOGLE_APPLICATION_CREDENTIALS` は不要です。Cloud Run のデフォルトサービスアカウントが使われます。Firestore / Cloud Tasks / Vertex AI へアクセスできるよう、そのサービスアカウントに権限を付与してください。

### 各変数の取り方と `--set-env-vars` の例

| 変数名 | どこで取得するか | 例（本番） |
|--------|------------------|------------|
| `GOOGLE_CLOUD_PROJECT` | GCP のプロジェクト ID | `worklog-adb04` |
| `GITHUB_CLIENT_ID` | GitHub → Settings → Developer settings → OAuth Apps → 対象アプリの Client ID | 例: `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | 上と同じ画面の「Generate a new client secret」または既存の Client secret | 秘密のためここには書かない |
| `NEXTAUTH_URL` | **デプロイ後に表示されるサービス URL**（初回は仮でよいが、ログインには必須） | `https://worklog-xxxxx-an.a.run.app` |
| `NEXTAUTH_SECRET` | ターミナルで `openssl rand -base64 32` を実行した出力（本番用に新規生成推奨） | 秘密のためここには書かない |
| `GITHUB_WEBHOOK_SECRET` | ターミナルで `openssl rand -hex 32` を実行した出力。Webhook 手動登録時も同じ値を使用 | 秘密のためここには書かない |
| `GITHUB_WEBHOOK_URL` | 上記 `NEXTAUTH_URL` が決まっていれば `{NEXTAUTH_URL}/api/webhooks/github` | `https://worklog-xxxxx-an.a.run.app/api/webhooks/github` |
| `FIRESTORE_DATABASE_ID` | そのままでよい場合が多い | `(default)` |
| `VERTEX_AI_LOCATION` | 利用するリージョン | `asia-northeast1` |
| `VERTEX_AI_MODEL` | 利用するモデル名 | `gemini-2.0-flash-exp` |
| `CLOUD_TASKS_QUEUE_NAME` | タスクキュー名 | `pr-event-processing` |
| `CLOUD_TASKS_LOCATION` | キューを置いたリージョン | `asia-northeast1` |

**`--set-env-vars` の書き方**: 複数あるときはカンマ区切りで 1 まとまりにする。値にカンマや `=` が含まれる場合はダブルクォートで囲む（シェル側も `"..."` で囲う）。

初回デプロイ時（URL 未確定）の例（プレースホルダーを実際の値に置き換える）:

```bash
--set-env-vars "GOOGLE_CLOUD_PROJECT=worklog-adb04,GITHUB_CLIENT_ID=あなたのClientID,GITHUB_CLIENT_SECRET=あなたのClientSecret,NEXTAUTH_SECRET=本番用32文字,NEXTAUTH_URL=https://仮のURL.run.app,GITHUB_WEBHOOK_SECRET=あなたのWebhookSecret,GITHUB_WEBHOOK_URL=https://仮のURL.run.app/api/webhooks/github,FIRESTORE_DATABASE_ID=(default),VERTEX_AI_LOCATION=asia-northeast1,VERTEX_AI_MODEL=gemini-2.0-flash-exp,CLOUD_TASKS_QUEUE_NAME=pr-event-processing,CLOUD_TASKS_LOCATION=asia-northeast1"
```

- 初回は `NEXTAUTH_URL` / `GITHUB_WEBHOOK_URL` を仮の URL にしてもビルドは通る。デプロイ後に表示された URL を控え、再デプロイで差し替える。
- ローカルの `.env.local` に既にある **Client ID / Client secret / Webhook secret** は、本番でも同じ OAuth アプリ・同じ Webhook  Secret を使うならそのまま流用してよい。本番専用の値にしたい場合は、上記の方法で新規生成する。

## 3. デプロイコマンド（ソースからビルド）

プロジェクトルートで実行します。初回はサービス名とリージョンを指定します。

```bash
export REGION=asia-northeast1
export SERVICE_NAME=worklog

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "NEXTAUTH_URL=https://${SERVICE_NAME}-XXXXX.run.app" \
  --set-env-vars "GITHUB_WEBHOOK_URL=https://${SERVICE_NAME}-XXXXX.run.app/api/webhooks/github"
```

初回は URL が決まっていないため、次のように **まず URL なしでデプロイし、表示された URL を控えてから** 再デプロイで `NEXTAUTH_URL` と `GITHUB_WEBHOOK_URL` を設定する方法が確実です。

### 初回デプロイ（URL 未確定）

```bash
gcloud run deploy worklog \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=your-project-id,GITHUB_CLIENT_ID=xxx,GITHUB_CLIENT_SECRET=xxx,NEXTAUTH_SECRET=xxx,GITHUB_WEBHOOK_SECRET=xxx,FIRESTORE_DATABASE_ID=(default),VERTEX_AI_LOCATION=asia-northeast1,VERTEX_AI_MODEL=gemini-2.0-flash-exp,CLOUD_TASKS_QUEUE_NAME=pr-event-processing,CLOUD_TASKS_LOCATION=asia-northeast1"
```

デプロイ後、表示される **サービス URL**（例: `https://worklog-xxxxx-an.a.run.app`）を控えます。

### 本番 URL を設定して再デプロイ

```bash
export URL=https://worklog-xxxxx-an.a.run.app  # 上で控えた URL

gcloud run deploy worklog \
  --source . \
  --region asia-northeast1 \
  --set-env-vars "NEXTAUTH_URL=${URL},GITHUB_WEBHOOK_URL=${URL}/api/webhooks/github"
```

残りの環境変数は初回で渡している前提です。足りなければ `--set-env-vars` に追加するか、コンソールの「変数とシークレット」で追加してください。

### 3.1 ビルドが失敗する場合（Build failed; check build logs）

`gcloud run deploy --source .` で「Build failed」とだけ出て終わるときは、**Cloud Build のログ**で原因を確認してください。

- 失敗したビルドのログ URL がターミナルに出ます（`Logs are available at [https://console.cloud.google.com/cloud-build/...]`）。
- ブラウザでその URL を開くか、コンソールの **Cloud Build → 履歴** から該当ビルドを開き、どのステップで落ちたかを見ます。

**Next.js のビルドでメモリ不足**になりがちな場合は、リポジトリにある **`cloudbuild.yaml`** を使って、メモリの多いマシンでビルドしてからデプロイします。

```bash
# 1) Cloud Build でイメージだけビルド（E2_HIGHCPU_8 使用）
gcloud builds submit --config=cloudbuild.yaml .

# 2) ビルドしたイメージを Cloud Run にデプロイ（環境変数は適宜付与）
export PROJECT_ID=$(gcloud config get-value project)
export REGION=asia-northeast1
export IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/worklog:latest

gcloud run deploy worklog \
  --image $IMAGE \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=...,GITHUB_CLIENT_ID=...,..."
```

`cloudbuild.yaml` では `options.machineType: 'E2_HIGHCPU_8'` を指定しているため、デフォルトよりメモリを多く使ってビルドされます。

## 4. GitHub OAuth アプリの設定

本番のコールバック URL を GitHub に登録します。

1. GitHub → Settings → Developer settings → OAuth Apps → 対象アプリ
2. **Authorization callback URL** に  
   `https://your-service-xxxxx.run.app/api/auth/callback/github`  
   を追加（またはローカル用を本番用に差し替え）

## 5. ローカルで Docker ビルドしてからデプロイする場合

Cloud Build ではなく、手元でイメージをビルドして Artifact Registry に push する場合の例です。

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=asia-northeast1
export IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/worklog

docker build -t $IMAGE .
docker push $IMAGE

gcloud run deploy worklog --image $IMAGE --region $REGION --allow-unauthenticated
```

環境変数は上と同様に `--set-env-vars` またはコンソールで設定します。

## 6. Webhook について

- デプロイ後、`GITHUB_WEBHOOK_URL` を本番 URL にすることで、リポジトリ接続時に Webhook が自動作成されます。
- GitHub の Webhook 設定で「Payload URL」に同じ URL を手動登録する場合は、Content type: `application/json`、イベント: **Pull requests** のみにしてください。

## 7. 認証を必須にしたい場合

`--allow-unauthenticated` を付けないと、Cloud Run が IAM でガードされます。その場合は「ログインしていないユーザーは 403」にするには、NextAuth の認証のうえでアプリ側で 401/403 を返す実装のまま、Cloud Run は「全員に公開」が一般的です。Cloud Run の認証だけで守る場合は `--no-allow-unauthenticated` とし、Invoker ロールを付与したいユーザー／サービスにだけ付けてください。
