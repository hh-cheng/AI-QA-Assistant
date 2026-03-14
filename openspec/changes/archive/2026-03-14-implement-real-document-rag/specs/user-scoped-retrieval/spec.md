## ADDED Requirements

### Requirement: Users can only access their own documents
The system SHALL restrict document listing, document detail retrieval, and document deletion so an authenticated user can access only documents owned by that same user.

#### Scenario: Document list is user-scoped
- **WHEN** an authenticated user requests their document list
- **THEN** the system returns only documents whose `user_id` matches the authenticated user

#### Scenario: Cross-user document access is blocked
- **WHEN** an authenticated user requests a document owned by another user
- **THEN** the system denies access and SHALL NOT return the document metadata or content

### Requirement: Retrieval scope is user-scoped
The system SHALL apply the authenticated user's identifier as a mandatory filter during vector search and citation assembly.

#### Scenario: Vector search excludes other users' chunks
- **WHEN** an authenticated user asks a question
- **THEN** the retrieval query searches only chunk rows owned by that user even if similar chunks exist for other users

### Requirement: Conversations and messages are user-owned
The system SHALL persist conversations and messages with user ownership and SHALL restrict conversation listing and retrieval to the authenticated user.

#### Scenario: Conversation list is isolated
- **WHEN** an authenticated user requests their conversations
- **THEN** the system returns only conversations owned by that user

#### Scenario: User-scoped citations
- **WHEN** the system returns an answer with citations
- **THEN** every cited source references a document owned by the authenticated user
