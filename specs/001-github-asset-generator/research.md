# Research: GitHub Career Asset Generator

**Created**: 2026-01-26  
**Purpose**: Document technical decisions and rationale for MVP implementation

## Technology Stack Decisions

### Decision: Next.js 14 App Router for Full-Stack Application

**Rationale**: 
- Unified framework for API routes and UI reduces complexity
- Server-side rendering improves initial load performance
- Built-in API routes eliminate need for separate backend service
- TypeScript support ensures type safety across stack
- App Router provides modern React patterns and better data fetching

**Alternatives considered**:
- Separate Express.js backend + React frontend: Rejected due to increased deployment complexity and operational overhead
- Remix: Rejected due to smaller ecosystem and team familiarity with Next.js
- SvelteKit: Rejected due to team expertise in React ecosystem

### Decision: Cloud Run for Serverless Deployment

**Rationale**:
- Automatic scaling handles variable PR event volumes
- Pay-per-use pricing aligns with MVP cost constraints
- Supports both Next.js app and background workers in same platform
- Built-in HTTPS and load balancing
- Container-based deployment provides flexibility

**Alternatives considered**:
- App Engine: Rejected due to less flexibility and higher vendor lock-in
- Cloud Functions: Rejected due to execution time limits (9 minutes) insufficient for LLM processing
- GKE: Rejected due to operational complexity and over-engineering for MVP

### Decision: Cloud Tasks for Async PR Event Processing

**Rationale**:
- Decouples webhook reception from processing
- Provides retry mechanism for failed processing
- Enables idempotent processing through task deduplication
- Scales independently from main application
- Cost-effective for background job processing

**Alternatives considered**:
- Pub/Sub: Rejected due to complexity and potential message ordering issues
- Direct function calls: Rejected due to blocking behavior and lack of retry mechanism
- Cloud Scheduler: Rejected due to polling-based approach, not event-driven

### Decision: Firestore for Data Persistence

**Rationale**:
- NoSQL structure fits document-based entities (User, Repository, PR Event, AssetCard)
- Real-time capabilities enable future live updates
- Automatic scaling without database management
- Strong consistency for user data isolation requirements
- Native integration with Cloud Run and Cloud Functions

**Alternatives considered**:
- PostgreSQL (Cloud SQL): Rejected due to operational overhead and over-engineering for document-based data
- Cloud Storage: Rejected due to lack of query capabilities
- MongoDB Atlas: Rejected due to additional vendor dependency and cost

### Decision: Vertex AI Gemini for LLM Transformation

**Rationale**:
- Deterministic API enables fixed schema validation
- Cost-effective compared to GPT-4
- Strong performance on structured output tasks
- Native Google Cloud integration reduces latency
- Supports function calling for schema enforcement

**Alternatives considered**:
- OpenAI GPT-4: Rejected due to higher costs and external API dependency
- Anthropic Claude: Rejected due to external API dependency and latency concerns
- Local LLM models: Rejected due to infrastructure complexity and lower quality

### Decision: NextAuth.js for GitHub OAuth

**Rationale**:
- Built-in GitHub OAuth provider
- Secure session management
- TypeScript support
- Next.js integration
- Handles token refresh automatically

**Alternatives considered**:
- Custom OAuth implementation: Rejected due to security risks and maintenance burden
- Auth0: Rejected due to cost and over-engineering for single OAuth provider
- Firebase Auth: Rejected due to limited GitHub OAuth customization

## Architecture Patterns

### Decision: Deterministic LLM Pipeline (No ADK/Agents)

**Rationale**:
- Aligns with Constitution Principle V (Technical Constraints)
- Fixed schemas ensure reproducible outputs
- Easier debugging and validation
- Lower complexity than agent-based approaches
- Cost predictability

**Implementation approach**:
- Structured output using Vertex AI function calling
- JSON schema validation before storage
- Retry with same prompt on validation failure (max 2 retries)
- Log all LLM inputs/outputs for explainability

### Decision: Idempotent PR Event Processing

**Rationale**:
- Prevents duplicate AssetCards from webhook retries
- Ensures data consistency
- Required by FR-006 and SC-007

**Implementation approach**:
- Use PR number + repository ID + event type as deduplication key
- Cloud Tasks task deduplication (same task name = same task)
- Firestore transaction checks for existing AssetCard before creation
- Idempotency window: 24 hours (GitHub webhook retry window)

### Decision: Cost-Aware Diff Processing

**Rationale**:
- Large PR diffs can exceed token limits and increase costs
- Required by FR-016 and SC-010 (<$0.10 per AssetCard)

**Implementation approach**:
- Truncate diffs to first 5,000 lines for initial processing
- Summarize remaining lines if diff exceeds limit
- Use diff statistics (files changed, additions, deletions) as context
- Cache processed diffs to avoid reprocessing

### Decision: Backend-First Development Approach

**Rationale**:
- Validates core value proposition (PR → AssetCard transformation) early
- API-first design enables parallel UI development
- Easier testing of business logic without UI dependencies
- Faster iteration on LLM pipeline

**Implementation sequence**:
1. Infrastructure setup (Firestore, Cloud Tasks, Vertex AI)
2. Backend services (auth, repository, PR event, asset-card)
3. API routes (testable via Postman/curl)
4. LLM pipeline worker
5. UI implementation (consumes APIs)

## Schema Design Decisions

### Decision: Fixed AssetCard Schema

**Rationale**:
- Enables schema validation (FR-015)
- Ensures consistent output structure
- Supports export formatting

**Schema structure**:
```typescript
{
  title: string;           // Brief title (max 100 chars)
  description: string;     // Detailed description (max 500 chars)
  impact: string;          // Business/technical impact (max 300 chars)
  technologies: string[];  // Technologies used (max 10 items)
  contributions: string[]; // Specific contributions (max 5 items)
  metrics?: string;        // Quantifiable metrics if available
}
```

### Decision: Separate Inbox and Library States

**Rationale**:
- Supports inbox-style UX (Constitution Principle IV)
- Clear separation between pending and approved assets
- Enables filtering and search

**State transitions**:
- Generated → Inbox (pending review)
- Inbox → Library (approved or edited)
- Library → Exported (track export history)

## Security Decisions

### Decision: User Data Isolation via Firestore Security Rules

**Rationale**:
- Required by FR-013 and SC-006 (99.9% isolation)
- Firestore rules provide application-level security
- Prevents unauthorized access even if API is compromised

**Implementation approach**:
- All collections scoped by userId
- Firestore rules enforce userId matching authenticated user
- API routes validate userId from session
- No cross-user queries allowed

### Decision: OAuth Token Storage in Firestore (Encrypted)

**Rationale**:
- Required for GitHub API calls (PR data, webhook setup)
- Firestore encryption at rest
- Application-level encryption for sensitive fields

**Implementation approach**:
- Store tokens in User document
- Encrypt tokens before storage using Google Cloud KMS
- Token refresh handled automatically by NextAuth.js

## Performance Decisions

### Decision: Async Processing with Cloud Tasks

**Rationale**:
- Required by FR-014 (non-blocking)
- Enables SC-002 (5-minute processing SLA)
- Prevents UI blocking during LLM processing

**Implementation approach**:
- Webhook receives PR event → enqueues Cloud Task immediately
- Cloud Task triggers worker → processes PR → generates AssetCard
- Worker updates Firestore → UI polls or uses real-time listeners

### Decision: Batch Export Processing

**Rationale**:
- Supports SC-005 (export 10 assets in <1 minute)
- Reduces API calls for multiple asset exports

**Implementation approach**:
- Single API call accepts multiple AssetCard IDs
- Server-side formatting and aggregation
- Returns formatted content as downloadable file or clipboard-ready text

## Testing Strategy

### Decision: Contract Tests for API Routes

**Rationale**:
- Ensures API stability as UI evolves
- Validates schema compliance
- Catches breaking changes early

### Decision: Integration Tests for LLM Pipeline

**Rationale**:
- Validates end-to-end PR → AssetCard flow
- Tests schema validation
- Ensures idempotency

### Decision: E2E Tests for Critical User Flows

**Rationale**:
- Validates complete user journeys
- Tests OAuth flow
- Validates export functionality

## Deployment Strategy

### Decision: Single Cloud Run Service for MVP

**Rationale**:
- Simplifies deployment and monitoring
- Reduces operational overhead
- Sufficient for MVP scale

**Future consideration**: Split into separate services (API, workers) if scaling requires it

### Decision: Environment-Based Configuration

**Rationale**:
- Enables development/staging/production separation
- Secure secret management via Google Secret Manager
- Easy configuration updates without code changes

## Open Questions Resolved

### Q: How to handle GitHub webhook authentication?

**A**: Use GitHub webhook secret verification. Store secrets in Google Secret Manager. Verify HMAC signature on webhook payload.

### Q: How to handle OAuth token expiration?

**A**: NextAuth.js handles automatic token refresh. Store refresh token securely. Fallback: prompt user to re-authenticate if refresh fails.

### Q: How to handle very large PR diffs?

**A**: Truncate to 5,000 lines, summarize remainder. Use diff statistics as additional context. Log when truncation occurs for monitoring.

### Q: How to ensure idempotency across webhook retries?

**A**: Use Cloud Tasks task deduplication (task name = PR number + repo + event type). Additional Firestore transaction check before AssetCard creation.

### Q: How to validate LLM outputs against schema?

**A**: Use Vertex AI function calling with JSON schema. Validate response structure before storage. Retry with same prompt if validation fails (max 2 retries).
