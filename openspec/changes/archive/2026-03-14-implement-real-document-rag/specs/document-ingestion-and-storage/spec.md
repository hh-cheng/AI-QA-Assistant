## ADDED Requirements

### Requirement: Authenticated users can upload supported documents for ingestion
The system SHALL allow an authenticated user to register an upload for `TXT`, `MD`, `PDF`, and `DOCX` documents, persist document metadata, and associate the document with that user before ingestion begins.

#### Scenario: Upload registration succeeds
- **WHEN** an authenticated user submits a supported file for upload
- **THEN** the system creates a document record with the authenticated user's identifier, a `processing` or `pending` ingestion status, and a storage key for the uploaded object

#### Scenario: Unsupported file type is rejected
- **WHEN** an authenticated user submits a file outside the supported set
- **THEN** the system rejects the upload request and SHALL NOT create a document record

### Requirement: Uploaded source files are stored outside PostgreSQL
The system SHALL store uploaded document binaries in a Docker-managed object storage service and SHALL store only metadata and storage references in PostgreSQL.

#### Scenario: Source file metadata is persisted
- **WHEN** an upload is accepted
- **THEN** the document record stores the original filename, file size, media type, and object storage key without storing the full file body in PostgreSQL

### Requirement: Document ingestion runs asynchronously
The system SHALL process document parsing, chunking, embedding generation, and searchable chunk persistence outside the upload request path.

#### Scenario: Ingestion job is queued
- **WHEN** an upload completes successfully
- **THEN** the system creates an ingestion job linked to the document and returns control to the user without waiting for embeddings to finish

#### Scenario: Ingestion failure is visible
- **WHEN** parsing, chunking, or embedding generation fails
- **THEN** the system marks the document as failed and records an error message that can be surfaced to the user

### Requirement: Searchable chunks are persisted with citations
The system SHALL persist parsed chunks and their embeddings in PostgreSQL so they can be used for later vector retrieval and answer citations.

#### Scenario: Chunk persistence succeeds
- **WHEN** ingestion finishes successfully
- **THEN** the system stores chunk text, chunk ordering metadata, optional page metadata, and embeddings for the document and marks the document as ready
