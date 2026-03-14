## Why

The repository already implements a real document ingestion and RAG pipeline, but the AI path is tightly coupled inside [packages/api/src/qa-rag.ts](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/api/src/qa-rag.ts). OpenAI embedding calls, answer generation calls, chunk retrieval, state transitions, and persistence updates are mixed together in one module. This makes the AI flow hard to reason about, hard to extend, and difficult to observe.

The user now requires the AI path to be reorganized with Mastra and to use the OpenAI official SDK for OpenAI services. The refactor must cover both major flows:
- document upload followed by parsing, chunking, embedding, and indexing
- user question followed by retrieval and a grounded answer

## What Changes

- Introduce a dedicated AI orchestration package built around Mastra workflows and agents.
- Replace direct OpenAI HTTP `fetch` calls with the official `openai` Node SDK.
- Move document ingestion orchestration into a Mastra workflow while keeping the current PostgreSQL, pgvector, and object storage contracts.
- Move question-answer orchestration into a Mastra workflow that embeds the query, retrieves user-scoped chunks, and generates a grounded answer.
- Split persistence, storage, parsing, retrieval, and prompt construction into explicit services/repositories so Mastra workflows depend on stable interfaces instead of raw SQL and transport code.
- Preserve the current frontend and API request shapes where possible so the migration is backend-first and low-risk.

## Capabilities

### New Capabilities
- `document-ingestion-orchestration`
- `grounded-answer-orchestration`

### Modified Capabilities
- `document-ingestion-and-storage`

## Impact

- Affected backend modules: `packages/api`, `packages/env`, `apps/server`
- New backend package: `packages/ai`
- Affected dependencies: add Mastra and the OpenAI official SDK
- No database schema migration is part of this change
- No required frontend API shape changes are part of phase one
