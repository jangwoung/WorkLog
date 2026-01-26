# Implementation Plan: GitHub Career Asset Generator

**Branch**: `001-github-asset-generator` | **Date**: 2026-01-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-github-asset-generator/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform GitHub Pull Request activity into structured career assets (AssetCards) through automated ingestion, LLM transformation, and user approval workflows. MVP focuses on backend-first development to validate core value proposition early. System uses Cloud Run (Next.js + Worker), Cloud Tasks for async processing, Firestore for data persistence, and Vertex AI Gemini for deterministic LLM transformations with fixed schemas.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: Next.js 14 (App Router), @google-cloud/firestore, @google-cloud/tasks, @google-cloud/aiplatform (Vertex AI), NextAuth.js (GitHub OAuth)  
**Storage**: Firestore (NoSQL document database)  
**Testing**: Jest, React Testing Library, Playwright (E2E)  
**Target Platform**: Google Cloud Run (serverless containers)  
**Project Type**: Web application (Next.js full-stack with background workers)  
**Performance Goals**:

- PR event processing: <5 minutes from event to AssetCard generation (async)
- UI response time: <200ms p95 for user interactions
- LLM transformation: <30 seconds per AssetCard (cost-aware processing)

**Constraints**:

- Deterministic LLM pipelines with fixed schemas (no autonomous agents)
- Idempotent PR event processing (no duplicates)
- Cost-aware diff processing (<$0.10 per AssetCard)
- User data isolation (99.9% security requirement)
- Async processing without blocking UI

**Scale/Scope**:

- MVP: 100-1000 users, 10-100 repositories per user
- PR diffs up to 10,000 lines
- 90% schema validation success rate on first LLM attempt

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Core Value**: Feature produces structured career assets (AssetCards) from GitHub PR activity. No learning/scheduling features included.

✅ **Role of AI**: LLM (Vertex AI Gemini) used for transformation only, with fixed schema validation. No scoring, grading, or ranking. Outputs are explainable and reproducible through deterministic pipelines.

✅ **Product Philosophy**: Automatic accumulation via async PR event processing. Product is passive - users work on GitHub, assets accumulate automatically. No manual input required for generation.

✅ **UX Principles**: Minimal user actions - approval/light editing over full creation. Inbox-style interface for pending assets. Export functionality requires minimal clicks.

✅ **Technical Constraints**: Deterministic pipelines using Cloud Tasks for async processing. Fixed schemas for AssetCard validation. No ADK or agent-based approaches in MVP.

✅ **Non-goals**: No learning plans, task scheduling, or curriculum management. No social features (peer review, public sharing). No enterprise-scale assumptions - MVP optimized for individual engineers.

**Status**: All principles compliant. No conflicts identified.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Frontend (Next.js App Router - UI components and pages)
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx       # Login page
│   └── callback/
│       └── page.tsx       # GitHub OAuth callback
├── (dashboard)/
│   ├── inbox/
│   │   └── page.tsx       # AssetCard inbox (pending review)
│   ├── library/
│   │   └── page.tsx       # Approved AssetCards library
│   ├── repositories/
│   │   └── page.tsx       # Repository connection management
│   └── export/
│       └── page.tsx       # Export functionality
├── api/                    # API routes (backend endpoints)
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts   # NextAuth.js API routes
│   ├── repositories/
│   │   ├── route.ts       # Repository CRUD (GET, POST)
│   │   └── [repositoryId]/
│   │       └── route.ts   # Repository operations (DELETE)
│   ├── assets/
│   │   ├── inbox/
│   │   │   └── route.ts   # Get inbox AssetCards
│   │   ├── library/
│   │   │   └── route.ts   # Get library AssetCards
│   │   └── [assetCardId]/
│   │       ├── route.ts   # Get AssetCard
│   │       ├── approve/
│   │       │   └── route.ts
│   │       └── edit/
│   │           └── route.ts
│   ├── webhooks/
│   │   └── github/
│   │       └── route.ts   # GitHub webhook receiver
│   └── export/
│       └── route.ts       # Export generation endpoint
├── components/             # Reusable UI components
│   ├── common/            # Common UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── layout/             # Layout components
│   │   └── Header.tsx
│   └── features/          # Feature-specific components
│       ├── AssetCard/
│       │   ├── AssetCardItem.tsx
│       │   ├── AssetCardDetail.tsx
│       │   └── AssetCardEditor.tsx
│       ├── Repository/
│       │   ├── RepositoryList.tsx
│       │   └── RepositoryCard.tsx
│       └── Export/
│           └── ExportDialog.tsx
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Authentication hook
│   ├── useAssetCards.ts    # AssetCard data fetching
│   ├── useRepositories.ts  # Repository management
│   └── useExport.ts        # Export functionality
├── context/                # Context API (global state)
│   └── AuthContext.tsx     # Authentication context
├── styles/                 # Global styles
│   └── globals.css
└── layout.tsx              # Root layout (redirects to inbox)

# Backend (shared between API routes and workers)
src/
├── infrastructure/         # Cloud service clients
│   ├── firestore/
│   │   ├── client.ts       # Firestore client
│   │   └── collections.ts  # Collection references
│   ├── cloud-tasks/
│   │   └── client.ts       # Cloud Tasks client
│   ├── vertex-ai/
│   │   └── client.ts       # Vertex AI Gemini client
│   └── github/
│       └── client.ts       # GitHub API client
├── controllers/            # API route handlers (business logic)
│   ├── auth.controller.ts  # Authentication logic
│   ├── repository.controller.ts
│   ├── asset-card.controller.ts
│   ├── pr-event.controller.ts
│   └── export.controller.ts
├── services/               # Business logic services
│   ├── auth/
│   │   └── auth.service.ts
│   ├── repository/
│   │   └── repository.service.ts
│   ├── pr-event/
│   │   └── pr-event.service.ts
│   ├── asset-card/
│   │   └── asset-card.service.ts
│   └── export/
│       └── export.service.ts
├── middleware/             # Express-style middleware (Next.js middleware)
│   ├── auth.middleware.ts  # Authentication middleware
│   ├── error.middleware.ts # Error handling
│   └── validation.middleware.ts
├── models/                 # Data models (TypeScript interfaces)
│   ├── user.model.ts
│   ├── repository.model.ts
│   ├── pr-event.model.ts
│   ├── asset-card.model.ts
│   └── decision-log.model.ts
├── schemas/                # Validation schemas
│   ├── asset-card-schema.ts  # Fixed schema for LLM validation
│   └── validation.schemas.ts  # Request validation schemas
├── types/                   # TypeScript types
│   ├── api.types.ts
│   ├── asset-card.types.ts
│   └── common.types.ts
└── utils/                  # Utility functions
    ├── diff-processor.ts     # Cost-aware diff processing
    ├── idempotency.ts        # Idempotent event handling
    └── logger.ts             # Logging utility

# Background workers (Cloud Run workers)
workers/
├── pr-event-processor/     # Processes PR events from Cloud Tasks
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── Dockerfile
└── asset-generator/         # LLM transformation worker
    ├── src/
    │   └── index.ts
    ├── package.json
    └── Dockerfile

# Configuration files
config/
└── firestore.rules.ts      # Firestore security rules

# Tests
tests/
├── contract/               # API contract tests
│   ├── auth.contract.test.ts
│   ├── repositories.contract.test.ts
│   └── assets.contract.test.ts
├── integration/            # Integration tests
│   ├── pr-event.integration.test.ts
│   └── asset-card.integration.test.ts
└── unit/                   # Unit tests
    ├── services/
    ├── utils/
    └── controllers/

# Root configuration
public/                     # Static assets
└── favicon.ico
.env.local                 # Environment variables (local)
.env.example              # Environment variables template
.gitignore
tsconfig.json
next.config.js
package.json
```

**Structure Decision**: Next.js App Router with clear separation between frontend (app/), backend (src/), and workers (workers/). Frontend uses components, hooks, and context for UI organization. Backend follows MVC-like pattern with controllers, services, and models. Infrastructure layer abstracts cloud services. Backend-first approach allows API routes to be developed and tested independently before UI implementation.

## Implementation Phases

This plan follows a backend-first, MVP-optimized approach with clear separation of concerns. Each phase builds upon the previous, enabling incremental validation of core value proposition.

### Phase 0: Research & Design ✅

**What is implemented**: Technical research, architecture decisions, data model design, API contracts, and quickstart guide.

**Why at this stage**: Foundation must be established before any code is written. Research resolves all technical unknowns. Data model and API contracts enable parallel development of backend and frontend. Quickstart ensures developers can start immediately.

**What becomes possible**:

- Clear technical direction with all decisions documented
- Data model ready for implementation
- API contracts enable contract testing
- Developers can set up local environment and start coding

**Deliverables**: `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`

---

### Phase 1: Infrastructure & Core Services

**What is implemented**:

- Infrastructure layer: Firestore client, Cloud Tasks client, Vertex AI client, GitHub API client
- Core services: Authentication service, Repository service, PR Event service (ingestion only)
- Data models: TypeScript interfaces matching Firestore schema
- AssetCard schema: Fixed JSON schema for LLM validation
- Basic API routes: Auth endpoints, Repository CRUD endpoints

**Why at this stage**: Infrastructure is the foundation - all other layers depend on it. Core services provide business logic that can be tested independently. Authentication and repository management are prerequisites for PR event processing. Backend-first approach validates core value without UI complexity.

**What becomes possible**:

- Users can authenticate via GitHub OAuth
- Users can connect/disconnect repositories
- System can receive and store PR events (webhook endpoint)
- API routes are testable via Postman/curl
- Foundation ready for PR event processing

**Dependencies**: Phase 0 complete

**Key Components**:

- `src/infrastructure/*` - All cloud service clients
- `src/services/auth/` - Authentication logic
- `src/services/repository/` - Repository management
- `src/services/pr-event/` - PR event ingestion (storage only)
- `src/models/*` - TypeScript data models
- `src/schemas/asset-card-schema.ts` - LLM output schema
- `app/api/auth/*` - NextAuth.js routes
- `app/api/repositories/*` - Repository API routes
- `app/api/webhooks/github` - Webhook receiver (enqueues Cloud Task)

---

### Phase 2: PR Event Processing & LLM Pipeline

**What is implemented**:

- PR Event processing service: Extracts PR context (title, description, diff)
- Diff processor utility: Cost-aware diff truncation and summarization
- Idempotency utility: Prevents duplicate processing
- LLM transformation worker: Vertex AI Gemini integration with schema validation
- Cloud Tasks integration: Async task enqueueing and processing
- AssetCard generation service: Orchestrates PR → AssetCard transformation

**Why at this stage**: This is the core value proposition - transforming PR events into AssetCards. Must be implemented after infrastructure and repository management. LLM pipeline requires careful implementation to meet cost and schema validation requirements. Async processing ensures UI remains responsive.

**What becomes possible**:

- PR events are automatically processed when received
- PR data is transformed into structured AssetCards via LLM
- AssetCards are stored in user's inbox (pending review)
- System handles large diffs cost-effectively
- Idempotent processing prevents duplicates
- Core value proposition is validated end-to-end

**Dependencies**: Phase 1 complete

**Key Components**:

- `src/services/pr-event/` - Complete PR event processing
- `src/services/asset-card/` - AssetCard generation orchestration
- `src/utils/diff-processor.ts` - Cost-aware diff processing
- `src/utils/idempotency.ts` - Idempotent event handling
- `workers/pr-event-processor/` - Cloud Tasks worker for PR processing
- `workers/asset-generator/` - Cloud Tasks worker for LLM transformation
- `app/api/webhooks/github` - Enhanced to process events

---

### Phase 3: Asset Management & User Actions

**What is implemented**:

- AssetCard service: Complete CRUD operations
- Decision log service: Tracks user actions (approve, edit, reject)
- AssetCard API routes: Inbox, library, approve, edit, delete endpoints
- State management: AssetCard status transitions (inbox → approved/edited)

**Why at this stage**: Users need to interact with generated AssetCards. Approval and editing workflows are core to the inbox-style UX. Must be implemented after AssetCards are being generated. Enables users to curate their career assets.

**What becomes possible**:

- Users can view pending AssetCards in inbox
- Users can approve AssetCards (moves to library)
- Users can edit AssetCards (moves to library with edited status)
- Users can view approved/edited AssetCards in library
- System tracks all user decisions for analytics
- Complete user workflow: generate → review → approve/edit

**Dependencies**: Phase 2 complete

**Key Components**:

- `src/services/asset-card/` - Complete AssetCard management
- `src/services/decision-log/` - Decision tracking
- `app/api/assets/*` - All AssetCard API routes
- State transition logic in services

---

### Phase 4: Export Functionality

**What is implemented**:

- Export service: Formats AssetCards to README and resume formats
- Export API route: Handles export requests
- Export templates: Markdown (README) and plain text (resume) formatters

**Why at this stage**: Export is the final step in the value chain - users need to use their assets externally. Can be implemented independently after AssetCard management. Completes the core user journey from GitHub activity to usable career assets.

**What becomes possible**:

- Users can export approved/edited AssetCards
- Users can export to README format (markdown)
- Users can export to resume format (bullet points)
- Users can copy or download exported content
- Complete end-to-end workflow: connect → generate → approve → export

**Dependencies**: Phase 3 complete

**Key Components**:

- `src/services/export/` - Export formatting logic
- `app/api/export/` - Export API route
- Export templates for README and resume formats

---

### Phase 5: UI Implementation

**What is implemented**:

- Authentication UI: GitHub OAuth login flow
- Repository management UI: Connect/disconnect repositories
- Inbox UI: List and review pending AssetCards
- Library UI: Browse approved/edited AssetCards
- AssetCard detail UI: View and edit AssetCard
- Export UI: Select assets and format, copy/download

**Why at this stage**: UI is implemented last to leverage stable API contracts. Backend-first approach ensures UI consumes well-tested APIs. Inbox-style design aligns with Constitution UX principles. UI can be developed in parallel with Phase 4 if resources allow.

**What becomes possible**:

- Complete user-facing application
- Users can interact with all features via web UI
- Inbox-style workflow for asset review
- Minimal user actions (approval/editing over creation)
- Production-ready MVP

**Dependencies**: Phases 1-4 complete (API routes must be stable)

**Key Components**:

- `app/(auth)/login/` - Login page
- `app/(dashboard)/repositories/` - Repository management
- `app/(dashboard)/inbox/` - AssetCard inbox
- `app/(dashboard)/library/` - AssetCard library
- `app/(dashboard)/export/` - Export interface
- React components for all UI elements

---

## Phase Dependencies

```text
Phase 0 (Research)
    ↓
Phase 1 (Infrastructure & Core Services)
    ↓
Phase 2 (PR Event Processing & LLM Pipeline)
    ↓
Phase 3 (Asset Management & User Actions)
    ↓
Phase 4 (Export Functionality)
    ↓
Phase 5 (UI Implementation)
```

**Parallel Opportunities**:

- Phase 4 and Phase 5 can be developed in parallel (UI consumes APIs)
- UI components can be developed in parallel once API contracts are stable

## MVP Scope Boundaries

**In Scope (Phases 1-5)**:

- GitHub OAuth authentication
- Repository connection/disconnection
- PR event ingestion (async)
- AssetCard generation via LLM
- Asset inbox and library views
- AssetCard approval and editing
- Export to README and resume formats

**Out of Scope (Future Phases)**:

- Learning management or scheduling
- Code generation or IDE integration
- Peer review or social sharing
- Automatic publishing
- Advanced filtering and search
- Bulk operations
- Custom export templates
- Analytics dashboard

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All design decisions align with Constitution principles.
