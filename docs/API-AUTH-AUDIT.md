# API Auth & Firestore Rules Audit

**Purpose**: T056 — Document security posture; no cross-user data access.

## Firestore Rules

**File**: `config/firestore.rules`

| Collection     | Scope              | Read/Write Rule                                              | Create Rule                                            |
|----------------|--------------------|--------------------------------------------------------------|--------------------------------------------------------|
| users          | userId             | `isOwner(userId)`                                            | N/A (document ID = userId)                             |
| repositories   | userId             | `resource.data.userId == request.auth.uid`                   | `request.resource.data.userId == request.auth.uid`     |
| pr-events      | userId             | `resource.data.userId == request.auth.uid`                   | `request.resource.data.userId == request.auth.uid`     |
| asset-cards    | userId             | `resource.data.userId == request.auth.uid`                   | `request.resource.data.userId == request.auth.uid`     |
| decision-logs  | userId             | `resource.data.userId == request.auth.uid`                   | `request.resource.data.userId == request.auth.uid`     |

**Note**: Firestore rules apply when using the Firebase client SDK with user auth. Our app uses the Admin/server SDK from Next.js; the service account has elevated access. Rules act as a safety net for any future client-side Firestore usage.

## API Routes Auth

| Route                                  | Auth          | Ownership Validation                      |
|----------------------------------------|---------------|-------------------------------------------|
| GET /api/repositories                  | requireAuth   | Service filters by userId                 |
| POST /api/repositories/connect         | requireAuth   | N/A (create only)                         |
| DELETE /api/repositories/[id]          | requireAuth   | Service checks repo belongs to userId     |
| GET /api/assets/inbox                  | requireAuth   | listInbox filters by userId               |
| GET /api/assets/library                | requireAuth   | listLibrary filters by userId             |
| GET /api/assets/[id]                   | requireAuth   | getAssetCardById checks userId; 403 else  |
| POST /api/assets/[id]/approve          | requireAuth   | approveAssetCard checks ownership         |
| POST /api/assets/[id]/edit             | requireAuth   | editAssetCard checks ownership            |
| DELETE /api/assets/[id]                | requireAuth   | rejectAssetCard checks ownership          |
| POST /api/export                       | requireAuth   | runExport loads only user-owned cards     |
| POST /api/webhooks/github              | Signature     | No auth; validates X-Hub-Signature-256    |
| POST /api/tasks/pr-event-processor     | None          | Invoked by Cloud Tasks (internal)         |
| POST /api/tasks/asset-generator        | None          | Invoked by Cloud Tasks (internal)         |

All user-facing routes use `requireAuth`; services enforce ownership via `userId`. Webhook and task routes are intentionally unauthenticated (signature / Cloud Tasks).

## Conclusion

- ✅ All collections scoped by userId
- ✅ All relevant API routes use auth middleware and validate ownership
- ✅ No cross-user data access identified
