# API Contracts: GitHub Career Asset Generator

**Created**: 2026-01-26  
**Purpose**: Define REST API endpoints, request/response schemas, and error handling

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://[domain]/api`

## Authentication

All API endpoints (except `/auth/*`) require authentication via NextAuth.js session cookie.

**Headers**:
```
Cookie: next-auth.session-token=[session-token]
```

## API Endpoints

### Authentication

#### GET /api/auth/signin

GitHub OAuth sign-in initiation.

**Request**: None (redirects to GitHub OAuth)

**Response**: 302 Redirect to GitHub OAuth authorization URL

**Errors**: None

---

#### GET /api/auth/callback/github

GitHub OAuth callback handler.

**Request Query Parameters**:
- `code` (string, required): OAuth authorization code
- `state` (string, required): CSRF protection state

**Response**: 302 Redirect to application dashboard

**Errors**:
- `400 Bad Request`: Invalid OAuth code or state
- `401 Unauthorized`: OAuth authorization failed

---

#### POST /api/auth/signout

Sign out current user.

**Request**: None

**Response**: 
```json
{
  "success": true
}
```

**Errors**: None

---

### Repositories

#### GET /api/repositories

List user's connected repositories.

**Request**: None

**Response**:
```json
{
  "repositories": [
    {
      "repositoryId": "string",
      "githubRepoId": 123456,
      "owner": "string",
      "name": "string",
      "fullName": "string",
      "isPrivate": boolean,
      "connectionStatus": "connected" | "disconnected" | "error",
      "connectedAt": "2026-01-26T00:00:00Z",
      "lastSyncTimestamp": "2026-01-26T00:00:00Z" | null
    }
  ]
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated

---

#### POST /api/repositories/connect

Connect a GitHub repository for PR event monitoring.

**Request Body**:
```json
{
  "owner": "string",
  "name": "string"
}
```

**Response**:
```json
{
  "repositoryId": "string",
  "githubRepoId": 123456,
  "fullName": "string",
  "connectionStatus": "connected",
  "webhookId": 123456,
  "connectedAt": "2026-01-26T00:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid repository name or already connected
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't have access to repository
- `500 Internal Server Error`: Webhook setup failed

---

#### DELETE /api/repositories/:repositoryId

Disconnect a repository and stop monitoring PR events.

**Request**: None (repositoryId in URL path)

**Response**:
```json
{
  "success": true,
  "repositoryId": "string",
  "disconnectedAt": "2026-01-26T00:00:00Z"
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Repository doesn't belong to user
- `404 Not Found`: Repository not found

---

### Asset Cards

#### GET /api/assets/inbox

Get pending AssetCards requiring user review (inbox).

**Request Query Parameters**:
- `limit` (number, optional): Maximum number of results (default: 20, max: 100)
- `cursor` (string, optional): Pagination cursor

**Response**:
```json
{
  "assetCards": [
    {
      "assetCardId": "string",
      "prEventId": "string",
      "repositoryId": "string",
      "repositoryName": "string",
      "prNumber": 123,
      "prTitle": "string",
      "status": "inbox",
      "title": "string",
      "description": "string",
      "impact": "string",
      "technologies": ["string"],
      "contributions": ["string"],
      "metrics": "string" | null,
      "generatedAt": "2026-01-26T00:00:00Z"
    }
  ],
  "nextCursor": "string" | null,
  "hasMore": boolean
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated

---

#### GET /api/assets/library

Get approved/edited AssetCards (library).

**Request Query Parameters**:
- `limit` (number, optional): Maximum number of results (default: 20, max: 100)
- `cursor` (string, optional): Pagination cursor
- `status` (string, optional): Filter by status: "approved" | "edited" | "exported"

**Response**:
```json
{
  "assetCards": [
    {
      "assetCardId": "string",
      "prEventId": "string",
      "repositoryId": "string",
      "repositoryName": "string",
      "prNumber": 123,
      "prTitle": "string",
      "status": "approved" | "edited" | "exported",
      "title": "string",
      "description": "string",
      "impact": "string",
      "technologies": ["string"],
      "contributions": ["string"],
      "metrics": "string" | null,
      "generatedAt": "2026-01-26T00:00:00Z",
      "approvedAt": "2026-01-26T00:00:00Z" | null,
      "editedAt": "2026-01-26T00:00:00Z" | null,
      "exportedAt": "2026-01-26T00:00:00Z" | null
    }
  ],
  "nextCursor": "string" | null,
  "hasMore": boolean
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated

---

#### GET /api/assets/:assetCardId

Get a specific AssetCard by ID.

**Request**: None (assetCardId in URL path)

**Response**:
```json
{
  "assetCardId": "string",
  "prEventId": "string",
  "repositoryId": "string",
  "repositoryName": "string",
  "prNumber": 123,
  "prTitle": "string",
  "prUrl": "string",
  "status": "inbox" | "approved" | "edited" | "exported",
  "title": "string",
  "description": "string",
  "impact": "string",
  "technologies": ["string"],
  "contributions": ["string"],
  "metrics": "string" | null,
  "generatedAt": "2026-01-26T00:00:00Z",
  "approvedAt": "2026-01-26T00:00:00Z" | null,
  "editedAt": "2026-01-26T00:00:00Z" | null,
  "editHistory": [
    {
      "timestamp": "2026-01-26T00:00:00Z",
      "field": "string",
      "oldValue": "string",
      "newValue": "string"
    }
  ] | null
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: AssetCard doesn't belong to user
- `404 Not Found`: AssetCard not found

---

#### POST /api/assets/:assetCardId/approve

Approve an AssetCard (moves from inbox to library).

**Request**: None (assetCardId in URL path)

**Response**:
```json
{
  "assetCardId": "string",
  "status": "approved",
  "approvedAt": "2026-01-26T00:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: AssetCard is not in inbox status
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: AssetCard doesn't belong to user
- `404 Not Found`: AssetCard not found

---

#### POST /api/assets/:assetCardId/edit

Edit an AssetCard (moves from inbox to library with edited status).

**Request Body**:
```json
{
  "title": "string" | null,
  "description": "string" | null,
  "impact": "string" | null,
  "technologies": ["string"] | null,
  "contributions": ["string"] | null,
  "metrics": "string" | null
}
```

**Validation**:
- All fields are optional (only provided fields are updated)
- `title`: max 100 chars
- `description`: max 500 chars
- `impact`: max 300 chars
- `technologies`: max 10 items
- `contributions`: max 5 items
- `metrics`: max 200 chars

**Response**:
```json
{
  "assetCardId": "string",
  "status": "edited",
  "editedAt": "2026-01-26T00:00:00Z",
  "editHistory": [
    {
      "timestamp": "2026-01-26T00:00:00Z",
      "field": "title",
      "oldValue": "Old title",
      "newValue": "New title"
    }
  ]
}
```

**Errors**:
- `400 Bad Request`: Invalid field values or validation failed
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: AssetCard doesn't belong to user
- `404 Not Found`: AssetCard not found

---

#### DELETE /api/assets/:assetCardId

Delete an AssetCard (reject/remove from library).

**Request**: None (assetCardId in URL path)

**Response**:
```json
{
  "success": true,
  "assetCardId": "string"
}
```

**Errors**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: AssetCard doesn't belong to user
- `404 Not Found`: AssetCard not found

---

### Export

#### POST /api/export

Export approved/edited AssetCards to specified format.

**Request Body**:
```json
{
  "assetCardIds": ["string"],
  "format": "readme" | "resume"
}
```

**Validation**:
- `assetCardIds`: array of 1-50 AssetCard IDs
- `format`: must be "readme" or "resume"

**Response**:
```json
{
  "format": "readme" | "resume",
  "content": "string",
  "exportedAssetCardIds": ["string"],
  "exportedAt": "2026-01-26T00:00:00Z"
}
```

**Content Format**:
- `readme`: Markdown format with AssetCards as sections
- `resume`: Plain text bullet points, one per AssetCard

**Errors**:
- `400 Bad Request`: Invalid format or assetCardIds, or assets not approved/edited
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: One or more AssetCards don't belong to user
- `404 Not Found`: One or more AssetCards not found

---

### Webhooks

#### POST /api/webhooks/github

GitHub webhook receiver for PR events.

**Request Headers**:
```
X-GitHub-Event: pull_request
X-GitHub-Delivery: [unique-id]
X-Hub-Signature-256: [HMAC-SHA256-signature]
```

**Request Body**: GitHub webhook payload (see GitHub API documentation)

**Response**:
```json
{
  "received": true,
  "prEventId": "string" | null
}
```

**Errors**:
- `400 Bad Request`: Invalid webhook signature or payload
- `401 Unauthorized`: Webhook secret verification failed
- `404 Not Found`: Repository not connected or not found

**Note**: This endpoint enqueues Cloud Task for async processing. Response is immediate.

---

## Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional error details
  }
}
```

**Common Error Codes**:
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Authenticated but not authorized
- `NOT_FOUND`: Resource not found
- `BAD_REQUEST`: Invalid request parameters
- `VALIDATION_ERROR`: Request validation failed
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- Authentication endpoints: 10 requests/minute per IP
- Repository endpoints: 30 requests/minute per user
- Asset Card endpoints: 60 requests/minute per user
- Export endpoint: 10 requests/minute per user
- Webhook endpoint: No rate limit (GitHub controlled)

## Pagination

Endpoints returning lists support cursor-based pagination:

- `limit`: Number of results per page (default: 20, max: 100)
- `cursor`: Opaque cursor string from previous response
- Response includes `nextCursor` and `hasMore` fields

## Versioning

API versioning via URL path prefix (future):
- Current: `/api/*` (v1, implicit)
- Future: `/api/v2/*` (when breaking changes required)
