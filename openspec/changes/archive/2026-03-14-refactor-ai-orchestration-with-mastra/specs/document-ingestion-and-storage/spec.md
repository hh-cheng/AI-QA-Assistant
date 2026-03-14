## MODIFIED Requirements

### Requirement: Document ingestion runs asynchronously
The system SHALL process document parsing, chunking, embedding generation, and searchable chunk persistence outside the upload request path, and this orchestration SHALL execute through a Mastra workflow.

#### Scenario: Ingestion job is queued
- **WHEN** an upload completes successfully
- **THEN** the system creates an ingestion job linked to the document and returns control to the user without waiting for embeddings to finish

#### Scenario: Queued ingestion is orchestrated through Mastra
- **WHEN** the background runner begins processing a pending ingestion job
- **THEN** the system invokes the document-ingestion workflow rather than directly performing the full ingestion sequence inside a single backend procedure
