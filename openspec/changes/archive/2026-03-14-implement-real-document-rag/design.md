## Context

The current QA domain is implemented entirely in [packages/api/src/routers/qa.ts](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/api/src/routers/qa.ts) with in-memory arrays for documents, conversations, providers, and defaults. Authentication is already real and available in tRPC context through Better Auth, and PostgreSQL already runs from a `pgvector` image. There is no QA-specific schema yet, and the frontend upload and settings screens are wired to mock APIs.

This change crosses multiple packages:
- `packages/db` for QA persistence schema
- `packages/api` for real document, chat, and settings logic
- `apps/server` for runtime wiring and background ingestion execution
- `apps/web` for upload, document list, chat, and simplified model settings
- Docker Compose for object storage alongside PostgreSQL

The user also requires a migration-first workflow: any database change must be delivered as PostgreSQL SQL first so they can apply it manually before implementation proceeds.

## Goals / Non-Goals

**Goals:**
- Persist documents, chunks, conversations, messages, and per-user model preferences in PostgreSQL.
- Store uploaded source files in a Docker-managed object storage service.
- Support vector search using PostgreSQL `pgvector`.
- Enforce per-user visibility and retrieval boundaries across all QA flows.
- Use official provider APIs for embeddings and final LLM responses.
- Reduce settings to model selection only.
- Make manual database migration a hard prerequisite to code implementation.

**Non-Goals:**
- Exposing raw provider credentials or advanced generation parameters to end users.
- Introducing a separate vector database in the first version.
- Building a multi-tenant admin console or organization-level sharing model.
- Adding OCR, image understanding, or scanned-PDF recovery in the first version.
- Implementing streaming responses, hybrid search, reranking, or background queue infrastructure beyond what is needed for the first working version.

## Decisions

### 1. Use PostgreSQL + `pgvector` as the only retrieval store

The system will store document metadata, chunk text, embeddings, conversations, messages, and user model preferences in PostgreSQL. `document_chunks.embedding` will use `vector(1536)` to match the first-version embedding model contract.

Rationale:
- The repository already uses PostgreSQL and ships a `pgvector`-enabled image.
- This avoids adding operational complexity from a second storage engine.
- The expected first-version scale fits PostgreSQL well.

Alternatives considered:
- Dedicated vector DB: rejected for added infrastructure and synchronization cost.
- Full-text search only: rejected because the requirement explicitly calls for vector search.

### 2. Use MinIO as the Docker-managed upload storage service

Uploaded files will be stored in MinIO. PostgreSQL will store object metadata and keys, not the binary payload.

Rationale:
- It satisfies the requirement that upload infrastructure be containerized like PostgreSQL.
- MinIO provides an S3-compatible API that is easy to run locally and easy to replace later.
- Keeping binaries out of PostgreSQL simplifies backup size and query performance.

Alternatives considered:
- Storing files as `bytea` in PostgreSQL: rejected due to poor operational fit.
- Local filesystem only: rejected because it complicates portability and future deployment.

### 3. Use an application-managed async ingestion pipeline with database jobs

Uploading a file will create a `documents` row and an `ingestion_jobs` row. A background worker process in the server runtime will poll pending jobs, read the object from MinIO, parse text, chunk it, generate embeddings, and write searchable chunks.

Rationale:
- It preserves responsiveness for uploads and avoids long request timeouts.
- It keeps the first version simple by using PostgreSQL-backed jobs before introducing Redis or BullMQ.

Alternatives considered:
- Synchronous upload-time parsing and embedding: rejected because PDFs and embeddings can be slow.
- External queue immediately: rejected as unnecessary for the first implementation.

### 4. Enforce user isolation in the application service layer and schema

All QA tables will carry `user_id`, and all tRPC procedures will derive the user from `ctx.session.user.id`. Queries will never accept a client-provided `userId`. Document operations and vector search will always include a user filter.

Rationale:
- The current auth setup already provides a trusted user identifier.
- Application-layer filtering is necessary immediately because all access goes through the backend.
- Including `user_id` on chunks and conversations keeps permission checks cheap and explicit.

Alternatives considered:
- Relying on document ownership joins only: rejected because it makes retrieval queries and guardrails easier to miss.
- Postgres RLS in the first version: deferred. It is useful later, but not required for the initial server-only access model.

### 5. Make user-selectable models a whitelist-based preference

Users will only be able to choose from a server-defined list of supported provider/model combinations. API keys, base URLs, temperature, max tokens, and timeouts will be removed from the UI and stored only in server env/config.

Rationale:
- It matches the product requirement to expose only LLM selection.
- It prevents leakage of provider secrets to the browser.
- It makes runtime behavior more predictable and supportable.

Alternatives considered:
- Letting users enter arbitrary provider config: rejected by product requirement and security concerns.

### 6. Use official APIs for embeddings and generation

The first version will call provider official APIs for both embeddings and answer generation from the backend. The embedding model will be fixed server-side for consistency. The response model will come from the user's selected allowed model.

Rationale:
- This matches the explicit requirement to call official APIs.
- Fixing the embedding model avoids vector dimension drift and retrieval inconsistency.

Alternatives considered:
- User-selectable embedding model: rejected because it complicates indexing and migration.
- Self-hosted embedding/LLM endpoints: rejected for the first version because they violate the official-API requirement.

## Risks / Trade-offs

- [Embedding dimension lock-in] -> Fixing `vector(1536)` to the initial embedding model simplifies the schema now, but changing embedding dimensions later requires a migration and reindex. Mitigation: document the embedding contract explicitly and isolate embedding writes behind a service.
- [Polling worker simplicity] -> A polling job runner is less robust than a dedicated queue. Mitigation: track attempts, timestamps, and failure state in `ingestion_jobs`, and keep the worker idempotent.
- [Document parser variability] -> PDF and DOCX parsing quality may vary. Mitigation: keep the first version limited to text-extractable files and mark parsing failures clearly in document status.
- [Cross-origin auth in local dev] -> Current Better Auth cookies are configured with secure cross-origin defaults that can already be fragile in local HTTP setups. Mitigation: validate auth behavior before attributing failures to QA changes.
- [Citation fidelity] -> Chunk-level citations can be imprecise if page metadata is unavailable. Mitigation: preserve page numbers when the parser provides them and degrade gracefully to filename-only citations.

## Migration Plan

1. Deliver a PostgreSQL migration SQL script for manual execution by the user.
2. Wait for user confirmation that the SQL has been applied successfully.
3. Update Drizzle schema to match the applied SQL exactly.
4. Add MinIO to Docker Compose and env validation for object storage plus official provider API credentials.
5. Implement persistent document, chat, and settings repositories against PostgreSQL.
6. Implement background ingestion worker and object storage integration.
7. Replace mock chat generation with retrieval + official LLM generation.
8. Simplify frontend settings to model choice only and switch documents/chat screens to real data.
9. Validate upload, ingestion, retrieval isolation, and chat end-to-end.

Rollback strategy:
- If implementation code must be rolled back after SQL has been applied, leave the new tables in place and revert application behavior only. The schema is additive, so rollback does not require destructive SQL.

## Open Questions

- Which official providers need to be supported in v1 beyond OpenAI?
- Should the default model preference be per user only, or also have a system default fallback in config?
- Does the user want citations to reference exact page numbers whenever available, or is filename-level citation acceptable for the first release?
