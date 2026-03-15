## ADDED Requirements

### Requirement: QA answer generation resolves models through a shared provider abstraction
The system SHALL resolve each configured QA answer model through a shared provider abstraction instead of embedding provider-specific request logic directly in QA business services.

#### Scenario: OpenAI model is resolved for answer generation
- **WHEN** an authenticated user has selected a supported OpenAI QA answer model
- **THEN** the backend resolves that `provider:model` identifier through the shared provider registry
- **AND** the backend uses the resolved chat provider to generate the grounded answer

#### Scenario: DeepSeek model is resolved for answer generation
- **WHEN** an authenticated user has selected a supported DeepSeek QA answer model
- **THEN** the backend resolves that `provider:model` identifier through the shared provider registry
- **AND** the backend uses the resolved DeepSeek chat provider to generate the grounded answer

#### Scenario: Unsupported provider model is rejected
- **WHEN** an authenticated user or backend flow attempts to use a model that is not in the configured allowlist
- **THEN** the system rejects the request
- **AND** the backend SHALL NOT attempt a provider API call

### Requirement: Embeddings remain on the dedicated OpenAI-backed embedding provider
The system SHALL continue to generate ingestion and retrieval embeddings through the dedicated OpenAI-backed embedding provider, regardless of which supported chat model is selected for answer generation.

#### Scenario: Selected chat model is DeepSeek
- **WHEN** an authenticated user selects a DeepSeek answer model and sends a QA message
- **THEN** the backend generates the retrieval embedding through the OpenAI-backed embedding provider
- **AND** the backend generates the final answer through the resolved DeepSeek chat provider

#### Scenario: Document ingestion runs while a non-OpenAI answer model is selected
- **WHEN** a document ingestion job generates chunk embeddings
- **THEN** the ingestion workflow uses the OpenAI-backed embedding provider
- **AND** the selected answer model preference does not change the embedding backend
