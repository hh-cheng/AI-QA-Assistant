## ADDED Requirements

### Requirement: Document ingestion AI orchestration uses Mastra workflows
The system SHALL orchestrate document ingestion through a dedicated Mastra workflow instead of a single ad hoc backend function.

#### Scenario: Ingestion workflow runs for a queued document
- **WHEN** a pending ingestion job is selected for processing
- **THEN** the system executes a document-ingestion workflow that loads the document, reads the source object, extracts text, chunks content, creates embeddings, persists chunks, and updates ingestion state

#### Scenario: Workflow failure updates persistent state
- **WHEN** any ingestion workflow step fails
- **THEN** the system marks the related ingestion job as failed and records a document-level error message that the UI can surface

### Requirement: OpenAI embeddings are requested through the official SDK
The system SHALL use the OpenAI official SDK for document chunk embeddings and SHALL NOT issue direct raw HTTP requests to OpenAI from ingestion orchestration code.

#### Scenario: Chunk embedding batch is created
- **WHEN** a workflow step needs embeddings for one or more chunks
- **THEN** the system calls the shared OpenAI SDK service to create embeddings and receives vectors in the configured embedding dimensions

### Requirement: Existing storage and indexing contracts remain stable
The system SHALL continue to store uploaded binaries in object storage and searchable chunks in PostgreSQL with pgvector-backed embeddings while migrating orchestration to Mastra.

#### Scenario: Workflow persists chunk outputs
- **WHEN** ingestion finishes successfully
- **THEN** the system writes chunk text, chunk order, optional page metadata, and embeddings to the existing searchable chunk store and marks the document as ready
