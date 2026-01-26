# Data Model: GitHub Career Asset Generator

**Created**: 2026-01-26  
**Purpose**: Define data entities, relationships, validation rules, and state transitions

## Entity Overview

The system uses Firestore (NoSQL document database) with the following collections:
- `users` - Authenticated GitHub users
- `repositories` - Connected GitHub repositories
- `pr-events` - Ingested Pull Request events
- `asset-cards` - Generated career assets
- `decision-logs` - User actions on AssetCards

All collections are scoped by `userId` for data isolation.

## Entities

### User

**Collection**: `users/{userId}`

**Description**: Represents an authenticated GitHub user with OAuth credentials and connected repositories.

**Fields**:
- `userId` (string, required): Unique identifier (Firestore document ID)
- `githubUserId` (string, required): GitHub user ID from OAuth
- `githubUsername` (string, required): GitHub username
- `githubEmail` (string, optional): GitHub email address
- `oauthToken` (string, encrypted, required): GitHub OAuth access token (encrypted)
- `oauthRefreshToken` (string, encrypted, optional): GitHub OAuth refresh token (encrypted)
- `oauthTokenExpiresAt` (timestamp, optional): Token expiration timestamp
- `connectedRepositoryIds` (string[], required): Array of connected repository document IDs
- `createdAt` (timestamp, required): Account creation timestamp
- `updatedAt` (timestamp, required): Last update timestamp

**Validation Rules**:
- `userId` must match authenticated user session
- `githubUserId` must be unique across all users
- `connectedRepositoryIds` must reference existing repository documents
- `oauthToken` must be encrypted before storage

**State Transitions**: None (user is created on first OAuth login)

**Relationships**:
- One-to-many with Repository (via `connectedRepositoryIds`)
- One-to-many with AssetCard (via `userId` in AssetCard)
- One-to-many with DecisionLog (via `userId` in DecisionLog)

---

### Repository

**Collection**: `repositories/{repositoryId}`

**Description**: Represents a connected GitHub repository that is monitored for PR events.

**Fields**:
- `repositoryId` (string, required): Unique identifier (Firestore document ID)
- `userId` (string, required): Owner user ID (foreign key to User)
- `githubRepoId` (number, required): GitHub repository ID
- `owner` (string, required): GitHub repository owner (username or organization)
- `name` (string, required): GitHub repository name
- `fullName` (string, required): Full repository name (owner/name)
- `isPrivate` (boolean, required): Whether repository is private
- `connectionStatus` (string, required): Connection status enum: "connected" | "disconnected" | "error"
- `webhookId` (number, optional): GitHub webhook ID if webhook is registered
- `webhookSecret` (string, encrypted, optional): Webhook secret for verification (encrypted)
- `lastSyncTimestamp` (timestamp, optional): Last PR event sync timestamp
- `connectedAt` (timestamp, required): Connection timestamp
- `disconnectedAt` (timestamp, optional): Disconnection timestamp

**Validation Rules**:
- `userId` must match authenticated user session
- `fullName` must be unique per user (same user cannot connect same repo twice)
- `connectionStatus` must be one of the enum values
- `webhookSecret` must be encrypted before storage

**State Transitions**:
- Initial: `connectionStatus = "connected"` (on user connection)
- `connected` → `disconnected` (on user disconnection)
- `connected` → `error` (on webhook setup failure or token expiration)
- `error` → `connected` (on successful reconnection)

**Relationships**:
- Many-to-one with User (via `userId`)
- One-to-many with PR Event (via `repositoryId` in PR Event)

**Indexes Required**:
- `userId` + `connectionStatus` (for querying user's connected repos)
- `userId` + `fullName` (for uniqueness check)

---

### PR Event

**Collection**: `pr-events/{prEventId}`

**Description**: Represents a detected Pull Request event from GitHub (create, update, or merge).

**Fields**:
- `prEventId` (string, required): Unique identifier (Firestore document ID)
- `userId` (string, required): Owner user ID (foreign key to User)
- `repositoryId` (string, required): Repository ID (foreign key to Repository)
- `prNumber` (number, required): GitHub PR number
- `eventType` (string, required): Event type enum: "opened" | "synchronize" | "closed" | "merged"
- `prTitle` (string, required): PR title from GitHub
- `prDescription` (string, optional): PR description/body
- `prAuthor` (string, required): PR author GitHub username
- `prUrl` (string, required): GitHub PR URL
- `diffContent` (string, optional): PR diff content (may be truncated for large diffs)
- `diffStats` (object, optional): Diff statistics
  - `filesChanged` (number)
  - `additions` (number)
  - `deletions` (number)
  - `totalLines` (number)
- `processingStatus` (string, required): Processing status enum: "pending" | "processing" | "completed" | "failed"
- `assetCardId` (string, optional): Generated AssetCard ID (if processing completed)
- `errorMessage` (string, optional): Error message if processing failed
- `retryCount` (number, required): Number of processing retry attempts
- `githubEventId` (string, required): GitHub webhook event ID (for deduplication)
- `receivedAt` (timestamp, required): Webhook reception timestamp
- `processedAt` (timestamp, optional): Processing completion timestamp

**Validation Rules**:
- `userId` must match authenticated user session
- `eventType` must be one of the enum values
- `processingStatus` must be one of the enum values
- `prNumber` + `repositoryId` + `eventType` must be unique (idempotency key)
- `retryCount` must be <= 3 (max retries)

**State Transitions**:
- Initial: `processingStatus = "pending"` (on webhook reception)
- `pending` → `processing` (when Cloud Task starts processing)
- `processing` → `completed` (on successful AssetCard generation)
- `processing` → `failed` (on processing failure after max retries)
- `failed` → `pending` (on manual retry, if implemented)

**Relationships**:
- Many-to-one with User (via `userId`)
- Many-to-one with Repository (via `repositoryId`)
- One-to-one with AssetCard (via `assetCardId`)

**Indexes Required**:
- `userId` + `processingStatus` (for querying user's pending events)
- `repositoryId` + `prNumber` + `eventType` (for idempotency check)
- `githubEventId` (for webhook deduplication)

---

### AssetCard

**Collection**: `asset-cards/{assetCardId}`

**Description**: Represents a structured career asset generated from PR data via LLM transformation.

**Fields**:
- `assetCardId` (string, required): Unique identifier (Firestore document ID)
- `userId` (string, required): Owner user ID (foreign key to User)
- `prEventId` (string, required): Source PR Event ID (foreign key to PR Event)
- `repositoryId` (string, required): Repository ID (foreign key to Repository)
- `status` (string, required): Status enum: "inbox" | "approved" | "edited" | "exported"
- `title` (string, required): Brief title (max 100 chars, validated)
- `description` (string, required): Detailed description (max 500 chars, validated)
- `impact` (string, required): Business/technical impact (max 300 chars, validated)
- `technologies` (string[], required): Technologies used (max 10 items, validated)
- `contributions` (string[], required): Specific contributions (max 5 items, validated)
- `metrics` (string, optional): Quantifiable metrics if available (max 200 chars)
- `schemaVersion` (string, required): Schema version for validation (e.g., "1.0.0")
- `generatedAt` (timestamp, required): LLM generation timestamp
- `approvedAt` (timestamp, optional): User approval timestamp
- `editedAt` (timestamp, optional): Last edit timestamp
- `editHistory` (array, optional): Edit history entries
  - `timestamp` (timestamp)
  - `field` (string): Field name that was edited
  - `oldValue` (string): Previous value
  - `newValue` (string): New value
- `exportedAt` (timestamp, optional): Last export timestamp
- `exportFormats` (string[], optional): Export formats used: "readme" | "resume"

**Validation Rules**:
- `userId` must match authenticated user session
- `status` must be one of the enum values
- All string fields must conform to schema constraints (length, format)
- `technologies` array must have <= 10 items
- `contributions` array must have <= 5 items
- `schemaVersion` must match current schema version

**State Transitions**:
- Initial: `status = "inbox"` (on LLM generation)
- `inbox` → `approved` (on user approval without edits)
- `inbox` → `edited` (on user edits)
- `approved` → `edited` (on subsequent edits)
- `approved` | `edited` → `exported` (on export, status remains but `exportedAt` updated)

**Relationships**:
- Many-to-one with User (via `userId`)
- One-to-one with PR Event (via `prEventId`)
- Many-to-one with Repository (via `repositoryId`)
- One-to-many with DecisionLog (via `assetCardId` in DecisionLog)

**Indexes Required**:
- `userId` + `status` (for querying user's inbox/library)
- `prEventId` (for one-to-one relationship check)
- `userId` + `generatedAt` (for sorting by most recent)

---

### Decision Log

**Collection**: `decision-logs/{decisionLogId}`

**Description**: Represents user actions (approve, reject, edit) on AssetCards for audit and analytics.

**Fields**:
- `decisionLogId` (string, required): Unique identifier (Firestore document ID)
- `userId` (string, required): User ID (foreign key to User)
- `assetCardId` (string, required): AssetCard ID (foreign key to AssetCard)
- `actionType` (string, required): Action type enum: "approve" | "reject" | "edit"
- `editedFields` (object, optional): Fields that were edited (if actionType = "edit")
  - `[fieldName]`: { `oldValue`: string, `newValue`: string }
- `timestamp` (timestamp, required): Action timestamp

**Validation Rules**:
- `userId` must match authenticated user session
- `actionType` must be one of the enum values
- `editedFields` must be present if `actionType = "edit"`

**State Transitions**: None (append-only log)

**Relationships**:
- Many-to-one with User (via `userId`)
- Many-to-one with AssetCard (via `assetCardId`)

**Indexes Required**:
- `userId` + `timestamp` (for querying user's decision history)
- `assetCardId` + `timestamp` (for querying asset's decision history)

---

## Data Isolation

All collections enforce user data isolation:

1. **Firestore Security Rules**: All queries must include `userId` filter matching authenticated user
2. **API Route Validation**: All API routes validate `userId` from session before database operations
3. **Collection Structure**: All document IDs are scoped by user context (implicit or explicit)

**Example Firestore Rule**:
```javascript
match /asset-cards/{assetCardId} {
  allow read, write: if request.auth != null && 
    resource.data.userId == request.auth.uid;
}
```

## Idempotency Strategy

### PR Event Deduplication

**Key**: `repositoryId` + `prNumber` + `eventType` + `githubEventId`

**Implementation**:
1. Cloud Tasks task name includes deduplication key (prevents duplicate tasks)
2. Firestore transaction checks for existing PR Event before creation
3. Idempotency window: 24 hours (GitHub webhook retry window)

### AssetCard Deduplication

**Key**: `prEventId` (one-to-one relationship)

**Implementation**:
1. Firestore transaction checks for existing AssetCard with same `prEventId`
2. If exists, return existing AssetCard instead of generating new one
3. Prevents duplicate generation from retried PR Event processing

## Schema Versioning

AssetCard schema is versioned to support future schema changes:

- Current version: `1.0.0`
- Schema validation checks `schemaVersion` field
- Future migrations can transform old schema versions to new ones
- Export templates can handle multiple schema versions

## Data Retention

- **Users**: Retained until account deletion
- **Repositories**: Retained until user disconnects (soft delete with `disconnectedAt`)
- **PR Events**: Retained for 90 days (configurable)
- **AssetCards**: Retained until user deletes (no automatic expiration)
- **Decision Logs**: Retained for 1 year (for analytics)
