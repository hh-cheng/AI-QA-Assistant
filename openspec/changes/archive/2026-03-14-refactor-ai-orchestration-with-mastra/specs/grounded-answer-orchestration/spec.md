## ADDED Requirements

### Requirement: Grounded question answering uses Mastra orchestration
The system SHALL orchestrate question answering through a dedicated Mastra workflow that performs deterministic retrieval steps before invoking generation.

#### Scenario: Answer workflow processes a user question
- **WHEN** an authenticated user sends a question in a conversation
- **THEN** the system executes an answer workflow that persists the user message, embeds the question, retrieves relevant chunks within the user's allowed scope, generates a grounded answer, stores the assistant message, and updates the conversation metadata

### Requirement: OpenAI answer generation uses the official SDK
The system SHALL use the OpenAI official SDK for OpenAI-backed answer generation and SHALL NOT issue direct raw HTTP requests to OpenAI from answer orchestration code.

#### Scenario: OpenAI-backed answer is generated
- **WHEN** the selected answer model is an OpenAI model
- **THEN** the system routes generation through the shared OpenAI SDK service rather than a direct HTTP request

### Requirement: OpenAI responses use the SDK Responses API as the primary path
The system SHALL use the shared OpenAI SDK Responses API path as the primary implementation for OpenAI-backed answer generation.

#### Scenario: OpenAI model is selected for answer generation
- **WHEN** the selected answer model is an OpenAI model
- **THEN** the answer workflow uses the shared SDK `responses.create(...)` path as its primary implementation

### Requirement: Retrieval and persistence stay outside the agent
The system SHALL keep retrieval, scope filtering, citation assembly, and message persistence in deterministic workflow steps rather than inside agent-owned retrieval or persistence logic.

#### Scenario: Answer agent is invoked
- **WHEN** the workflow invokes the answer agent
- **THEN** retrieval has already been completed, scope has already been resolved, and the agent receives grounded context rather than performing retrieval or persistence itself

### Requirement: Retrieval remains deterministic and user-scoped
The system SHALL keep document filtering, user isolation, and citation assembly in deterministic workflow steps rather than delegating them to an agent.

#### Scenario: Single-document scope is respected
- **WHEN** a user chooses one document as the active chat scope
- **THEN** the answer workflow retrieves chunks only from that document and only from resources owned by the authenticated user

#### Scenario: Grounded sources are returned with the answer
- **WHEN** the answer workflow stores the assistant message
- **THEN** the system persists a deduplicated set of source references derived from retrieved chunks
