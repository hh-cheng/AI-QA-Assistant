## Why

The current QA experience is backed by module-level mock data, so uploads, document search, chat history, and provider settings are lost on restart and are not actually grounded in user documents. The project already has real authentication and a `pgvector`-enabled PostgreSQL container, so this is the right time to replace the mock layer with a production-shaped document ingestion and retrieval flow.

## What Changes

- Replace in-memory QA documents, conversations, and settings with PostgreSQL-backed persistence.
- Add a Docker-managed object storage service for uploaded source files and store only metadata in PostgreSQL.
- Add an asynchronous ingestion pipeline that parses uploaded files, chunks content, generates embeddings, and stores vectors in PostgreSQL for retrieval.
- Add user-scoped document ownership and enforce that all document, chunk, conversation, and message queries are filtered by the authenticated user.
- Replace mock chat generation with a real RAG flow: query embedding, vector retrieval, citation assembly, and final answer generation through official LLM APIs.
- Simplify QA settings so users can choose an allowed LLM only; remove user-editable temperature, timeout, base URL, and API key fields.
- Define a migration-first rollout: deliver PostgreSQL migration SQL to the user for manual execution before any application code change is implemented.

## Capabilities

### New Capabilities
- `document-ingestion-and-storage`: Upload user documents to Docker-managed object storage, persist metadata, and process them into searchable chunks.
- `user-scoped-retrieval`: Restrict document listing, retrieval, deletion, chat context selection, and vector search results to the authenticated user.
- `llm-model-selection`: Let each user choose a supported LLM for answers while the server keeps provider credentials and advanced parameters under backend control.

### Modified Capabilities
- None.

## Impact

- Affected backend modules: `packages/api`, `packages/db`, `packages/env`, `apps/server`.
- Affected frontend modules: QA documents, chat, and settings pages in `apps/web`.
- Affected infrastructure: Docker Compose in `packages/db/docker-compose.yml`, PostgreSQL schema, and new object storage service.
- New external dependencies are expected for object storage access, document parsing, embeddings/LLM official SDKs, and vector-aware queries.
