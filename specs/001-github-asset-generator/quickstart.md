# Quickstart Guide: GitHub Career Asset Generator

**Created**: 2026-01-26  
**Purpose**: Get the MVP up and running for development and testing

## Prerequisites

- Node.js 20.x or later
- npm or yarn package manager
- Google Cloud account with billing enabled
- GitHub account with OAuth app credentials
- Google Cloud SDK (`gcloud`) installed and configured

## Initial Setup

### 1. Google Cloud Project Setup

```bash
# Create a new GCP project (or use existing)
gcloud projects create worklog-mvp --name="WorkLog MVP"

# Set as default project
gcloud config set project worklog-mvp

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudtasks.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Firestore Database Setup

```bash
# Create Firestore database (Native mode)
gcloud firestore databases create --location=us-central1

# Note: Firestore can only be created once per project
```

### 3. GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: WorkLog MVP
   - **Homepage URL**: `http://localhost:3000` (development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Save and note the **Client ID** and **Client Secret**

### 4. Vertex AI Setup

```bash
# Enable Vertex AI API (already done above)
# No additional setup required - API is ready to use
```

### 5. Environment Variables

Create `.env.local` in project root:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Google Cloud
GOOGLE_CLOUD_PROJECT=worklog-mvp
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Firestore
FIRESTORE_DATABASE_ID=(default)

# Vertex AI
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-1.5-pro

# Cloud Tasks
CLOUD_TASKS_QUEUE_NAME=pr-event-processing
CLOUD_TASKS_LOCATION=us-central1

# Webhook Secret (for GitHub webhook verification)
GITHUB_WEBHOOK_SECRET=generate_with_openssl_rand_hex_32
```

**Generate secrets**:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate GITHUB_WEBHOOK_SECRET
openssl rand -hex 32
```

### 6. Service Account Setup

```bash
# Create service account
gcloud iam service-accounts create worklog-service \
  --display-name="WorkLog Service Account"

# Grant required permissions
gcloud projects add-iam-policy-binding worklog-mvp \
  --member="serviceAccount:worklog-service@worklog-mvp.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding worklog-mvp \
  --member="serviceAccount:worklog-service@worklog-mvp.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding worklog-mvp \
  --member="serviceAccount:worklog-service@worklog-mvp.iam.gserviceaccount.com" \
  --role="roles/cloudtasks.enqueuer"

# Create and download key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=worklog-service@worklog-mvp.iam.gserviceaccount.com
```

### 7. Cloud Tasks Queue Setup

```bash
# Create Cloud Tasks queue
gcloud tasks queues create pr-event-processing \
  --location=us-central1
```

## Local Development

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Application will be available at `http://localhost:3000`

### 3. Test Authentication Flow

1. Navigate to `http://localhost:3000`
2. Click "Connect GitHub"
3. Authorize the application
4. You should be redirected back and see your repositories

### 4. Test Repository Connection

1. Navigate to `/repositories`
2. Click "Connect Repository"
3. Select a repository from the list
4. Repository should appear as "connected"

### 5. Test PR Event Processing (Manual)

For local testing, you can manually trigger PR event processing:

```bash
# Use curl or Postman to send a test webhook payload
curl -X POST http://localhost:3000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: test-delivery-id" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d @test-pr-event.json
```

**Note**: For local development, you may need to:
- Use ngrok or similar to expose localhost for GitHub webhooks
- Or manually trigger processing via API endpoint (if implemented)

## Project Structure

```
.
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   └── api/               # API routes
├── src/
│   ├── infrastructure/   # Cloud service clients
│   ├── services/         # Business logic
│   ├── models/           # Data models
│   ├── schemas/          # Validation schemas
│   └── utils/            # Utility functions
├── workers/               # Background workers
├── tests/                 # Test files
└── .env.local            # Environment variables
```

## Development Workflow

### Backend-First Approach

1. **Start with Infrastructure**: Set up Firestore, Cloud Tasks, Vertex AI clients
2. **Implement Services**: Build business logic (auth, repository, PR event, asset-card)
3. **Create API Routes**: Expose services via REST API
4. **Test APIs**: Use Postman/curl to test endpoints
5. **Build UI**: Implement frontend consuming APIs

### Testing Strategy

1. **Unit Tests**: Test individual services and utilities
   ```bash
   npm run test:unit
   ```

2. **Integration Tests**: Test API routes with test database
   ```bash
   npm run test:integration
   ```

3. **E2E Tests**: Test complete user flows
   ```bash
   npm run test:e2e
   ```

## Common Tasks

### Connect a Repository

```bash
curl -X POST http://localhost:3000/api/repositories/connect \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{"owner": "your-username", "name": "your-repo"}'
```

### List AssetCards in Inbox

```bash
curl http://localhost:3000/api/assets/inbox \
  -H "Cookie: next-auth.session-token=..."
```

### Approve an AssetCard

```bash
curl -X POST http://localhost:3000/api/assets/{assetCardId}/approve \
  -H "Cookie: next-auth.session-token=..."
```

### Export AssetCards

```bash
curl -X POST http://localhost:3000/api/export \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "assetCardIds": ["id1", "id2"],
    "format": "resume"
  }'
```

## Troubleshooting

### Firestore Permission Errors

- Ensure service account has `roles/datastore.user` role
- Check `GOOGLE_APPLICATION_CREDENTIALS` points to correct key file

### GitHub OAuth Errors

- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Check callback URL matches GitHub OAuth app settings
- Ensure `NEXTAUTH_SECRET` is set

### Cloud Tasks Errors

- Verify queue exists: `gcloud tasks queues describe pr-event-processing --location=us-central1`
- Check service account has `roles/cloudtasks.enqueuer` role

### Vertex AI Errors

- Ensure Vertex AI API is enabled
- Check service account has `roles/aiplatform.user` role
- Verify `VERTEX_AI_LOCATION` matches enabled region

## Next Steps

1. Implement Phase 1: Infrastructure setup
2. Implement Phase 2: Backend services
3. Implement Phase 3: API routes
4. Implement Phase 4: LLM pipeline worker
5. Implement Phase 5: UI components

See `plan.md` for detailed implementation phases.
