## 1. Database Prerequisite

- [x] 1.1 Deliver PostgreSQL migration SQL for QA tables, indexes, constraints, and `pgvector` extension under this change directory
- [x] 1.2 Wait for the user to manually apply the SQL migration in PostgreSQL and confirm completion
- [x] 1.3 Update `packages/db` Drizzle schema to match the manually applied migration exactly, without changing the SQL contract implicitly

## 2. Infrastructure And Configuration

- [x] 2.1 Extend Docker Compose with an object storage service and required persistent volumes
- [x] 2.2 Add validated server env variables for object storage and official provider API credentials
- [x] 2.3 Introduce backend configuration for the supported answer-model allowlist and default model

## 3. Persistent QA Backend

- [x] 3.1 Replace in-memory document procedures with PostgreSQL-backed repositories and user-scoped authorization checks
- [x] 3.2 Implement upload registration, object storage persistence, and ingestion job creation
- [x] 3.3 Implement a background ingestion worker that parses files, chunks text, generates embeddings, and writes document chunks
- [x] 3.4 Replace mock conversation and message storage with PostgreSQL-backed persistence
- [x] 3.5 Replace mock answer generation with query embedding, vector retrieval, citation assembly, and official LLM API generation

## 4. Frontend QA Experience

- [x] 4.1 Update the documents page and upload flow to use the real upload and document-status APIs
- [x] 4.2 Update the chat experience to read user-scoped conversations and real cited answers
- [x] 4.3 Simplify the settings page to model selection only and remove advanced provider fields

## 5. Validation

- [x] 5.1 Verify user isolation across document list, detail, delete, and retrieval flows
- [x] 5.2 Verify ingestion status transitions for success and failure cases
- [x] 5.3 Verify model preference persistence and answer generation with the selected supported model
- [x] 5.4 Run project checks and targeted runtime validation after implementation
