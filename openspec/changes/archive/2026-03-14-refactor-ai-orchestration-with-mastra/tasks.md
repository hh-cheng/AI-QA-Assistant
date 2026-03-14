## 1. Package And Dependency Setup

- [x] 1.1 Create `packages/ai` with Mastra-oriented package exports and TypeScript configuration
- [x] 1.2 Add Mastra and `openai` dependencies in the appropriate workspace packages
- [x] 1.3 Add any required server env validation updates for the new orchestration package without changing the current runtime contract
- [x] 1.4 Wire `packages/ai` into workspace exports and the type-check flow

## 2. Boundary Extraction

- [x] 2.1 Extract document, chunk, ingestion-job, conversation, and model-preference repositories from `packages/api/src/qa-rag.ts`
- [x] 2.2 Extract document parsing, chunking, storage, and prompt-building services behind explicit interfaces
- [x] 2.3 Reduce `qa-rag.ts` to temporary compatibility glue or remove it where practical
- [x] 2.4 Define shared orchestration dependency interfaces before migrating business logic

## 3. Document Ingestion Orchestration

- [x] 3.1 Implement `documentIngestionWorkflow` in `packages/ai`
- [x] 3.2 Replace direct embedding HTTP calls with OpenAI SDK embedding calls
- [x] 3.3 Route the existing ingestion polling runner through the new workflow
- [x] 3.4 Verify success and failure status transitions still populate document and ingestion-job records correctly
- [x] 3.5 Preserve the current upload route contract during ingestion migration

## 4. Grounded Answer Orchestration

- [x] 4.1 Implement `answerAgent` and `answerQuestionWorkflow` in `packages/ai`
- [x] 4.2 Replace direct OpenAI answer-generation HTTP calls with the OpenAI SDK path
- [x] 4.3 Route `trpc.qa.chat.sendMessage` through the workflow while preserving the current request and response shape
- [x] 4.4 Verify retrieval remains user-scoped and honors single-document scope selection
- [x] 4.5 Preserve the current `sendMessage` request and response contract during answer migration

## 5. Cleanup

- [x] 5.1 Remove remaining direct OpenAI `fetch` usage from backend orchestration code
- [x] 5.2 Consolidate provider error handling and workflow logging in shared orchestration helpers
- [x] 5.3 Remove dead code left behind by the migration
- [x] 5.4 Delete or reduce `qa-rag.ts` to a thin compatibility layer after both workflows are live

## 6. Validation

- [x] 6.1 Run `pnpm check`
- [x] 6.2 Run `pnpm check-types`
- [x] 6.3 Perform targeted runtime validation for upload, ingestion, retrieval, and grounded answer generation
- [x] 6.4 Verify backend orchestration code contains no direct OpenAI REST `fetch` calls
