# Quickstart Validation Checklist

**Purpose**: T055 — Verify end-to-end flow per quickstart.md  
**When**: After completing Phase 0–5; before declaring MVP complete

## Prerequisites

- [ ] GCP project created; required APIs enabled (Cloud Run, Firestore, Cloud Tasks, Vertex AI)
- [ ] Firestore database created (Native mode)
- [ ] GitHub OAuth App configured (Client ID, Client Secret, callback URL)
- [ ] Cloud Tasks queue created (`pr-event-processing`)
- [ ] Service account with `datastore.user`, `aiplatform.user`, `cloudtasks.enqueuer`
- [ ] `.env.local` populated per quickstart (or Cloud Run env vars for production)

## Validation Steps

### 1. Authentication

- [ ] `npm run dev` starts the app
- [ ] Navigate to `http://localhost:3000` (or production URL)
- [ ] Click "Connect GitHub"
- [ ] Complete GitHub OAuth; redirect back to app
- [ ] Session persists (e.g. header shows sign-out option)

### 2. Repository Connection

- [ ] Navigate to `/repositories`
- [ ] List of available repos loads
- [ ] Click "Connect Repository" and connect at least one repo
- [ ] Connected repo appears with status "connected"
- [ ] `GET /api/repositories` returns the connected repo (curl or browser devtools)

### 3. Webhook → AssetCard Flow (requires public URL)

- [ ] Webhook configured on connected repo (Payload URL = app URL + `/api/webhooks/github`)
- [ ] Create or update a PR on the connected repo
- [ ] GitHub Webhook delivery returns 200 (check Recent Deliveries)
- [ ] Cloud Tasks queue shows enqueued tasks
- [ ] Within a few minutes, Inbox (`/inbox`) shows new AssetCard (status: inbox or flagged)

### 4. Inbox & Asset Management

- [ ] Navigate to `/inbox`
- [ ] Pending AssetCards (inbox + flagged) display
- [ ] Flagged items show validation errors badge (if any)
- [ ] Approve one AssetCard → it moves to Library
- [ ] Edit one AssetCard → changes persist; it moves to Library

### 5. Library

- [ ] Navigate to `/library`
- [ ] Approved/edited AssetCards display (no FAILED_PRECONDITION; Firestore index created if needed)

### 6. Export

- [ ] Navigate to `/export`
- [ ] Select AssetCards from library
- [ ] Choose format: README or Resume
- [ ] Copy or download returns correctly formatted content

## Success Criteria

- All checkboxes above pass
- No 401/403/500 errors during normal flow
- AssetCard generation completes within ~5 minutes of PR event

## Notes

- For local dev, Webhook step requires ngrok or similar (GitHub cannot reach localhost)
- Firestore Library query requires composite index; create via link in error message if needed
- See [DEPLOY-CLOUDRUN.md](./DEPLOY-CLOUDRUN.md) and [WEBHOOK-CLOUD-TASKS-SETUP.md](./WEBHOOK-CLOUD-TASKS-SETUP.md) for production setup
