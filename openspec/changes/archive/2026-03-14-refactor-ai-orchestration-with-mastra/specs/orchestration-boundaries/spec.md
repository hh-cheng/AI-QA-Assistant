## ADDED Requirements

### Requirement: AI orchestration is isolated behind a dedicated package
The system SHALL isolate AI orchestration behind a dedicated `packages/ai` package.

#### Scenario: Responsibilities are split by package
- **WHEN** the orchestration refactor is implemented
- **THEN** `packages/ai` hosts Mastra workflows, agents, and OpenAI SDK wiring, `packages/api` provides repository, storage, and retrieval implementations, and `apps/server` only triggers orchestration and exposes transport endpoints

### Requirement: Workflows depend on abstract services
The system SHALL implement workflow dependencies through injected repository and gateway interfaces instead of direct route or storage implementation details.

#### Scenario: Workflow requires backend capabilities
- **WHEN** a workflow needs persistence, retrieval, or object storage access
- **THEN** it uses injected repository or gateway interfaces rather than direct SQL, direct route context, or direct transport objects

### Requirement: Existing public QA API contracts remain stable during migration
The system SHALL preserve the existing public upload and chat contracts during phase one of the orchestration migration.

#### Scenario: Frontend migration is backend-transparent
- **WHEN** backend orchestration is replaced
- **THEN** the existing documents and chat UI continue to call the same public contracts without mandatory protocol changes

#### Scenario: Upload route contract is preserved
- **WHEN** `POST /qa/documents/upload` is served after the orchestration migration
- **THEN** its request and response shape remain unchanged in phase one

#### Scenario: Chat mutation contract is preserved
- **WHEN** `trpc.qa.chat.sendMessage` is served after the orchestration migration
- **THEN** its input and output shape remain unchanged in phase one
