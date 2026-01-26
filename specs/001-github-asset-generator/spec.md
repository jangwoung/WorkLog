# Feature Specification: GitHub Career Asset Generator

**Feature Branch**: `001-github-asset-generator`  
**Created**: 2026-01-26  
**Status**: Draft  
**Input**: User description: "Create a baseline specification for GitHub Career Asset Generator product"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - GitHub Authentication and Repository Connection (Priority: P1)

An engineer wants to connect their GitHub account to start generating career assets from their development activity. They authenticate via GitHub OAuth and select which repositories to monitor for Pull Request events.

**Why this priority**: Authentication and repository connection form the foundation for all subsequent features. Without this, no PR events can be ingested and no assets can be generated. This is the entry point that enables the entire product workflow.

**Independent Test**: Can be fully tested by authenticating with GitHub OAuth, connecting at least one repository, and verifying the connection status. This delivers the ability to establish the data source for asset generation.

**Acceptance Scenarios**:

1. **Given** a user visits the application for the first time, **When** they click "Connect GitHub", **Then** they are redirected to GitHub OAuth authorization page
2. **Given** a user completes GitHub OAuth authorization, **When** they grant repository access permissions, **Then** they are redirected back to the application with an authenticated session
3. **Given** an authenticated user, **When** they navigate to repository settings, **Then** they see a list of their accessible GitHub repositories
4. **Given** an authenticated user viewing their repository list, **When** they select one or more repositories to connect, **Then** those repositories are marked as active and PR events will be monitored
5. **Given** a user has connected repositories, **When** they view their repository settings, **Then** they can see which repositories are currently connected and can disconnect them

---

### User Story 2 - Automatic PR Event Ingestion and AssetCard Generation (Priority: P2)

An engineer has connected their repositories. When they create or merge a Pull Request on GitHub, the system automatically detects the PR event, processes the PR context and diff, and generates a structured AssetCard using LLM transformation.

**Why this priority**: This is the core value proposition - automatic transformation of GitHub activity into structured career assets. Without this, users would need to manually create assets, which conflicts with the "automatic accumulation" philosophy. This story delivers the primary product output.

**Independent Test**: Can be fully tested by creating a test PR on a connected repository, verifying the PR event is detected, and confirming an AssetCard is generated with structured content. This delivers automatic asset creation without user intervention.

**Acceptance Scenarios**:

1. **Given** a user has connected at least one repository, **When** a Pull Request is created or merged in that repository, **Then** the system detects the PR event asynchronously
2. **Given** a PR event is detected, **When** the system processes the PR context (title, description, comments) and diff, **Then** the PR data is stored for processing
3. **Given** PR data is ready for processing, **When** the system invokes the LLM transformation pipeline, **Then** an AssetCard is generated with structured fields conforming to a fixed schema
4. **Given** an AssetCard is generated, **When** the system validates it against the schema, **Then** the AssetCard is stored in the user's library (inbox) if valid, or flagged for review if invalid
5. **Given** multiple PR events occur, **When** the system processes them, **Then** each PR generates a separate AssetCard (idempotent processing ensures no duplicates)

---

### User Story 3 - Asset Review, Editing, and Export (Priority: P3)

An engineer has generated AssetCards from their GitHub activity. They review generated assets in an inbox-style interface, approve or lightly edit them, and export approved assets to formats like README or resume bullet points.

**Why this priority**: While automatic generation provides value, users need control to approve and refine assets before using them in evaluations. Export functionality enables the final use case - incorporating assets into resumes, portfolios, or interviews. This completes the value chain from GitHub activity to usable career assets.

**Independent Test**: Can be fully tested by viewing generated AssetCards in an inbox, approving one asset, editing another, and exporting approved assets to a text format. This delivers user control and the ability to use assets in external contexts.

**Acceptance Scenarios**:

1. **Given** a user has generated AssetCards, **When** they navigate to the asset inbox, **Then** they see a list of pending assets requiring review, ordered by most recent
2. **Given** a user views an AssetCard in the inbox, **When** they review the generated content, **Then** they can see the structured fields (title, description, impact, technologies, etc.) in an editable format
3. **Given** a user reviews an AssetCard, **When** they approve it without changes, **Then** the asset moves from inbox to library and is marked as approved
4. **Given** a user reviews an AssetCard, **When** they make light edits to any field, **Then** the changes are saved and the asset moves to library with edited status
5. **Given** a user has approved assets in their library, **When** they select one or more assets and choose an export format (README, resume bullets), **Then** the assets are formatted according to the selected template and provided for download or copy
6. **Given** a user exports assets, **When** they view the exported content, **Then** it is formatted appropriately for the target context (markdown for README, concise bullets for resume)

---

### Edge Cases

- What happens when a user disconnects a repository that has pending PR events being processed?
- How does the system handle PR events from repositories the user no longer has access to?
- What happens when LLM transformation fails or returns invalid schema data?
- How does the system handle duplicate PR events (webhook retries, manual triggers)?
- What happens when a user exports assets but the export format template fails to render?
- How does the system handle very large PR diffs that exceed processing limits?
- What happens when a user's GitHub OAuth token expires or is revoked?
- How does the system handle concurrent PR events for the same repository?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users via GitHub OAuth with appropriate repository access scopes
- **FR-002**: System MUST allow users to connect and disconnect GitHub repositories for PR event monitoring
- **FR-003**: System MUST detect Pull Request events (create, update, merge) from connected repositories asynchronously
- **FR-004**: System MUST ingest PR context including title, description, comments, and diff content
- **FR-005**: System MUST transform PR data into structured AssetCards using LLM with fixed schema validation
- **FR-006**: System MUST ensure AssetCard generation is idempotent (same PR event produces same AssetCard, no duplicates)
- **FR-007**: System MUST provide an inbox-style interface showing pending AssetCards requiring user review
- **FR-008**: System MUST allow users to approve AssetCards without modification
- **FR-009**: System MUST allow users to edit AssetCard fields (title, description, impact, technologies, etc.)
- **FR-010**: System MUST maintain a library view of approved and edited AssetCards
- **FR-011**: System MUST export approved AssetCards to README format (markdown)
- **FR-012**: System MUST export approved AssetCards to resume bullet point format
- **FR-013**: System MUST maintain user data isolation (users can only access their own assets)
- **FR-014**: System MUST process PR events asynchronously without blocking user interactions
- **FR-015**: System MUST validate all LLM outputs against fixed schemas before storing AssetCards
- **FR-016**: System MUST implement cost-aware diff processing (optimize token usage for large diffs)
- **FR-017**: System MUST log user decisions (approve/reject/edit) for AssetCards

### Key Entities *(include if feature involves data)*

- **User**: Represents an authenticated GitHub user. Key attributes: GitHub user ID, OAuth token, connected repositories, authentication status
- **Repository**: Represents a connected GitHub repository. Key attributes: repository ID, owner, name, connection status, last sync timestamp
- **PR Event**: Represents a detected Pull Request event from GitHub. Key attributes: PR number, repository, event type (create/update/merge), PR context (title, description, diff), timestamp, processing status
- **AssetCard**: Represents a structured career asset generated from PR data. Key attributes: unique ID, source PR reference, structured fields (title, description, impact, technologies, contributions), generation timestamp, approval status, edit history
- **Decision Log**: Represents user actions on AssetCards. Key attributes: AssetCard reference, action type (approve/reject/edit), timestamp, edited fields (if applicable)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete GitHub OAuth authentication and connect their first repository within 2 minutes
- **SC-002**: System processes PR events and generates AssetCards within 5 minutes of PR creation/merge (async processing)
- **SC-003**: 90% of generated AssetCards pass schema validation on first LLM generation attempt
- **SC-004**: Users can review and approve a single AssetCard in under 30 seconds
- **SC-005**: Users can export 10 approved AssetCards to their preferred format in under 1 minute
- **SC-006**: System maintains 99.9% data isolation (users cannot access other users' assets)
- **SC-007**: AssetCard generation is idempotent - duplicate PR events result in zero duplicate AssetCards
- **SC-008**: System handles PR diffs up to 10,000 lines without processing failures
- **SC-009**: 95% of users successfully complete the full workflow (connect → generate → approve → export) on first attempt
- **SC-010**: LLM transformation costs remain under $0.10 per AssetCard generated (cost-aware processing)
