## Context

The current implementation already persists documents, chunks, ingestion jobs, conversations, messages, and user model preferences. Uploaded files are stored in object storage, chunk embeddings are stored in PostgreSQL with `pgvector`, and the UI already calls real upload and chat endpoints. The problem is not missing functionality; the problem is orchestration design.

Today, [packages/api/src/qa-rag.ts](/Users/heweicheng/Desktop/projects/Intelligent-QA-Assistant/packages/api/src/qa-rag.ts) owns all of the following concerns at once:
- object storage coordination
- document parsing
- chunking
- OpenAI embedding calls
- vector retrieval
- answer generation
- conversation persistence
- ingestion status transitions
- provider error handling

This change introduces a dedicated orchestration layer so the application keeps the current storage model while replacing ad hoc AI flow code with Mastra-managed workflows and a single OpenAI SDK integration.

## Goals / Non-Goals

**Goals:**
- Use Mastra to orchestrate the document ingestion AI path and the answer-generation AI path.
- Use the OpenAI official SDK for OpenAI embeddings and OpenAI answer generation.
- Keep PostgreSQL, pgvector, object storage, Hono, and tRPC boundaries intact.
- Extract stable repository/gateway interfaces so workflows can call domain services instead of raw transport code.
- Preserve current request and response contracts for upload and chat in the first pass.
- Make the orchestration path easier to observe, test, and evolve.

**Non-Goals:**
- Replacing PostgreSQL/pgvector with a Mastra-managed vector store in this change.
- Replacing the current in-process ingestion polling loop with a distributed queue in this change.
- Adding streaming chat responses in this change.
- Redesigning the frontend upload or chat experience in this change.
- Expanding provider support beyond the current allowlist behavior in this change.

## Decisions

### 1. Add a dedicated `packages/ai` package for orchestration

Mastra setup, workflows, agents, OpenAI SDK wiring, and orchestration-specific schemas will live in a new `packages/ai` package. This package will expose workflow runners and orchestration helpers to `packages/api`.

Rationale:
- Keeps orchestration concerns separate from repository and transport concerns.
- Avoids spreading Mastra-specific code across `apps/server` and `packages/api`.
- Makes future AI-flow evolution independent from route-layer changes.

Alternatives considered:
- Put Mastra directly inside `packages/api`: rejected because it would keep repository and orchestration concerns tangled.
- Put Mastra only inside `apps/server`: rejected because orchestration should be reusable beyond one transport entrypoint.

### 2. Preserve existing storage contracts and migrate orchestration only

The refactor will continue to use:
- existing QA tables in PostgreSQL
- existing object storage integration
- existing pgvector cosine-distance retrieval

Mastra will coordinate these operations but will not replace them.

Rationale:
- This is the lowest-risk path because storage and UI contracts already work.
- It keeps scope focused on orchestration and SDK correctness.
- It avoids a double migration of both orchestration and retrieval storage.

Alternatives considered:
- Move retrieval storage to a Mastra-native vector layer: rejected due to unnecessary migration scope.

### 3. Use two workflows with one answer agent

The refactor will introduce:
- `documentIngestionWorkflow`
- `answerQuestionWorkflow`

The answer workflow may use one dedicated `answerAgent` for final grounded response generation, but retrieval, authorization, scope selection, and persistence remain deterministic workflow steps.

Rationale:
- Upload indexing and question answering are distinct operational flows with different failure and retry behavior.
- Retrieval and persistence require strict control and should not be delegated to an agent.
- A small answer-only agent keeps the generative portion isolated and replaceable.

Alternatives considered:
- A single monolithic workflow for both ingestion and chat: rejected because the operational semantics are different.
- Fully agentic retrieval: rejected because user scope, citations, and DB side effects need deterministic handling.

### 4. Use the OpenAI official SDK as the only OpenAI integration path

All OpenAI calls will be routed through a shared client built with the `openai` package. OpenAI embeddings will use `client.embeddings.create(...)`. OpenAI answer generation will use `client.responses.create(...)` as the primary path.

Rationale:
- Matches the explicit product requirement.
- Centralizes error handling, observability, and future model upgrades.
- Avoids repeated raw HTTP contract handling in business modules.

Alternatives considered:
- Keep raw `fetch` wrappers: rejected by requirement and maintainability concerns.
- Continue using Chat Completions as the main path: rejected because the goal is to move to the official SDK and current recommended text-generation path.

### 5. Keep the current public API shape stable in phase one

The following interfaces remain stable during the refactor:
- `POST /qa/documents/upload`
- `trpc.qa.chat.sendMessage`
- document list/detail/delete procedures
- conversation list/detail procedures

Rationale:
- This minimizes frontend churn.
- It isolates risk to backend orchestration changes.
- It allows phase-by-phase validation.

Alternatives considered:
- Redesign the public API together with the orchestration rewrite: rejected as unnecessary risk.

## Implementation Invariants

- `packages/ai` is the only package that hosts Mastra workflows, agents, and OpenAI SDK orchestration code.
- `packages/ai` must not directly depend on Hono, tRPC, Drizzle, direct env reads, or HTTP transport objects; it only accepts plain TypeScript interfaces and injected dependencies.
- No database schema migration is part of this change.
- The existing `POST /qa/documents/upload` and `trpc.qa.chat.sendMessage` request and response shapes must remain unchanged in phase one.
- OpenAI answer generation must use the shared SDK `responses.create(...)` path as the primary implementation. If a compatibility fallback is required, it may exist only inside `OpenAIService` and must not leak into workflow or route-level code.

## Target Structure

### New package layout

```text
packages/ai/
  src/
    index.ts
    mastra.ts
    schemas/
      ingestion.ts
      answer.ts
      shared.ts
    openai/
      client.ts
      embeddings.ts
      responses.ts
    agents/
      answer-agent.ts
    workflows/
      document-ingestion.ts
      answer-question.ts
    services/
      chunker.ts
      document-parser.ts
      prompt-builder.ts
    types/
      context.ts
      results.ts
```

### Refactored API layout

```text
packages/api/src/
  qa/
    repositories/
      documents.ts
      ingestion-jobs.ts
      chunks.ts
      conversations.ts
      model-preferences.ts
    services/
      documents.ts
      conversations.ts
      dashboard.ts
    ai/
      ingestion-runner.ts
      answer-runner.ts
```

`qa-rag.ts` will be reduced during migration and eventually removed or turned into a compatibility export surface.

## Workflow Design

### `documentIngestionWorkflow`

**Input**

```ts
type DocumentIngestionInput = {
  jobId: string
  documentId: string
  userId: string
}
```

**Steps**
1. Load job and document
2. Mark job running
3. Read source object from storage
4. Extract document text
5. Chunk text
6. Create chunk embeddings through OpenAI SDK
7. Replace persisted chunks
8. Compute document summary
9. Mark document ready
10. Mark job completed

**Failure path**
- Mark document failed
- Mark job failed

**Output**

```ts
type DocumentIngestionResult = {
  documentId: string
  chunkCount: number
  summary: string | null
  status: "completed" | "failed"
  errorMessage?: string
}
```

### `answerQuestionWorkflow`

**Input**

```ts
type AnswerQuestionInput = {
  conversationId: string
  userId: string
  question: string
  scope: "all" | string
  responseLength: "concise" | "standard" | "detailed"
}
```

**Steps**
1. Load conversation
2. Resolve selected model and effective scope
3. Persist user message
4. Create question embedding through OpenAI SDK
5. Retrieve relevant chunks with user and scope filters
6. Build the grounded prompt payload
7. Generate answer with `answerAgent`
8. Dedupe source references
9. Persist assistant message
10. Update conversation metadata

**Output**

```ts
type AnswerQuestionResult = {
  conversationId: string
  assistantMessageId: string
  content: string
  model?: string
  tokenCount?: number
  sources: Array<{ name: string; page?: number }>
}
```

## Interface Contracts

Workflows will depend on stable interfaces implemented in `packages/api`.

### OpenAI service

```ts
export type OpenAIService = {
  createEmbeddings(input: {
    texts: string[]
    model?: string
    dimensions?: number
  }): Promise<number[][]>

  generateGroundedAnswer(input: {
    model: string
    systemPrompt: string
    userPrompt: string
  }): Promise<{
    content: string
    tokenCount?: number
    model: string
    rawResponseId?: string
  }>
}
```

### Document parser

```ts
export type DocumentParser = {
  extractText(input: {
    fileType: "TXT" | "MD" | "PDF" | "DOCX"
    body: Buffer
  }): Promise<{
    text: string
    pageMap?: Array<{ pageNumber: number; content: string }>
  }>
}
```

### Chunking service

```ts
export type ChunkingService = {
  chunkText(input: {
    text: string
    chunkSize?: number
    chunkOverlap?: number
  }): Promise<
    Array<{
      index: number
      content: string
      tokenEstimate: number
      pageNumber?: number
    }>
  >
}
```

### Document repository

```ts
export type DocumentRepository = {
  getById(input: { documentId: string; userId: string }): Promise<DocumentRecord | null>
  markProcessing(input: { documentId: string; at: Date }): Promise<void>
  markReady(input: {
    documentId: string
    summary: string | null
    chunkCount: number
    processedAt: Date
  }): Promise<void>
  markFailed(input: {
    documentId: string
    errorMessage: string
    at: Date
  }): Promise<void>
  createChunks(input: {
    documentId: string
    userId: string
    chunks: Array<{
      chunkIndex: number
      content: string
      tokenCount?: number
      pageNumber?: number | null
      embedding: number[]
    }>
  }): Promise<void>
  deleteChunks(input: { documentId: string }): Promise<void>
}
```

### Ingestion job repository

```ts
export type IngestionJobRepository = {
  listPending(limit: number): Promise<IngestionJobRecord[]>
  markRunning(input: { jobId: string; attempts: number; at: Date }): Promise<void>
  markCompleted(input: { jobId: string; at: Date }): Promise<void>
  markFailed(input: { jobId: string; errorMessage: string; at: Date }): Promise<void>
}
```

### Storage gateway

```ts
export type DocumentStorage = {
  readObject(input: { storageKey: string }): Promise<Buffer>
  storeObject(input: {
    storageKey: string
    body: Buffer
    contentType: string
  }): Promise<void>
  removeObject(input: { storageKey: string }): Promise<void>
}
```

### Chunk retriever

```ts
export type ChunkRetriever = {
  retrieve(input: {
    userId: string
    questionEmbedding: number[]
    documentIds?: string[]
    topK?: number
  }): Promise<
    Array<{
      documentId: string
      fileName: string
      content: string
      pageNumber?: number | null
      distance: number
    }>
  >
}
```

### Conversation repository

```ts
export type ConversationRepository = {
  getConversation(input: {
    conversationId: string
    userId: string
  }): Promise<ConversationRecord | null>

  appendUserMessage(input: {
    conversationId: string
    userId: string
    content: string
  }): Promise<{ messageId: string }>

  appendAssistantMessage(input: {
    conversationId: string
    userId: string
    content: string
    model?: string
    tokenCount?: number
    responseTimeMs?: number
    sources?: Array<{ name: string; page?: number }>
  }): Promise<{ messageId: string }>

  updateConversationAfterAnswer(input: {
    conversationId: string
    title?: string
    selectedScope: string[] | null
    selectedModel?: string
    updatedAt: Date
  }): Promise<void>
}
```

### User model preference repository

```ts
export type UserModelPreferencesRepository = {
  getSelectedModelId(userId: string): Promise<string>
}
```

## Implementation Order

The implementation order is mandatory and must be followed as written.

### Phase 1: Package and dependency setup
- Add `packages/ai`
- Add Mastra and OpenAI SDK dependencies
- Export a minimal orchestration surface without changing behavior

### Phase 2: Extract repositories and gateways
- Move SQL and storage coordination into dedicated repository/service modules
- Reduce `qa-rag.ts` to orchestration glue

### Phase 3: Migrate document ingestion orchestration
- Replace direct ingestion logic with `documentIngestionWorkflow`
- Keep the current in-process polling trigger

### Phase 4: Migrate answer orchestration
- Replace direct question-answer logic with `answerQuestionWorkflow`
- Keep current tRPC input/output contracts

### Phase 5: Remove old orchestration code
- Delete direct OpenAI `fetch` paths
- Delete or shrink compatibility glue in `qa-rag.ts`

### Phase 6: Add observability and cleanup
- Add workflow-level logging and timing
- Add optional metadata persistence if needed

## Risks / Trade-offs

- [Mastra integration boundary] -> If Mastra-specific types leak across package boundaries, `packages/api` will become harder to maintain. Mitigation: expose plain TypeScript interfaces at the package boundary.
- [Workflow retry semantics] -> The current polling runner is simple and may retry failed work differently from a full job system. Mitigation: keep repository-side state transitions explicit and idempotent.
- [Responses API behavior drift] -> Model output behavior may differ from the current chat-completions prompt shape. Mitigation: isolate prompt building and validate answer style against current UI expectations.
- [Partial migration complexity] -> During migration, old and new orchestration code may coexist. Mitigation: migrate ingestion and answer flow in separate phases and delete direct fetch code immediately after each phase passes validation.

## Validation Plan

1. Upload a supported document and confirm the ingestion workflow transitions `pending -> running -> completed`.
2. Confirm the documents UI can observe ingestion status updates without any upload contract change.
3. Upload an unsupported or malformed document and confirm the failure path records a user-visible error.
4. Ask a question scoped to all documents and confirm user-scoped retrieval plus grounded answer generation still work without any chat contract change.
5. Ask a question scoped to one document and confirm retrieval respects the selected scope and does not retrieve other documents.
6. Confirm the chat UI still receives grounded answers and sources without a protocol change.
7. Confirm there are no direct OpenAI REST `fetch` calls left in backend orchestration code for ingestion or answer generation.
8. Confirm `packages/ai` type-checks as a standalone workspace package without requiring route context.
9. Run project checks and type checks after each migration phase.

## Open Questions

- Should the first Mastra-based answer path return a fully buffered answer only, or should streaming be designed into the interfaces now but deferred in implementation?
- Does the team want workflow run identifiers persisted in the database immediately, or only emitted in logs for the first pass?
