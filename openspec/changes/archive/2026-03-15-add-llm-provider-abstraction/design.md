## Context

The current implementation already supports more than one model provider at the configuration level, but the architecture is split across several layers:

- `packages/ai` contains OpenAI-specific interfaces and workflow dependencies.
- `packages/api/src/qa-rag.ts` still performs provider branching and contains direct provider request logic for non-OpenAI models.
- `apps/server/src/index.ts` determines whether streaming is allowed by checking whether the selected model provider is `openai`.
- `apps/web/src/app/(protected)/chat/components/ConversationPanel/service.ts` decides whether to attempt SSE streaming by checking whether `selectedModelId` starts with `openai:`.

This shape does not scale. Adding a new provider currently requires touching workflow contracts, QA orchestration, transport-layer checks, and UI behavior. The desired state is that model selection resolves to a provider object with explicit capabilities, and the rest of the system only consumes those capabilities.

The user confirmed that embeddings remain fixed to OpenAI. That requirement changes the design: the abstraction must not assume every chat provider also implements embeddings.

## Goals / Non-Goals

**Goals:**
- Introduce a reusable chat-provider abstraction in `packages/ai`.
- Keep embedding generation on a dedicated OpenAI-backed provider.
- Centralize provider resolution, configuration checks, and capability metadata.
- Add DeepSeek as a first-class chat provider in `packages/ai`.
- Replace provider-name checks with capability-based checks.
- Preserve the existing non-streaming fallback behavior for models that do not support SSE.

**Non-Goals:**
- Supporting user-managed provider credentials.
- Making embeddings provider-selectable.
- Adding provider-specific advanced controls such as reasoning mode, tools, or custom parameters in the first pass.
- Changing the persisted model ID format away from `provider:model`.

## Decisions

### 1. Separate chat providers from the embedding provider

The system will introduce two different interfaces:

- `ChatProvider` for grounded answer generation and optional streaming
- `EmbeddingProvider` for embedding generation

OpenAI will continue to back embeddings for ingestion and query retrieval. Chat generation will resolve through the selected model provider. This avoids coupling the full system to the assumption that every provider supports or should own embeddings.

Rationale:
- The user explicitly wants embeddings to remain on OpenAI.
- It avoids over-generalizing the abstraction in a way that does not match product requirements.
- It keeps vector dimensions and retrieval behavior stable.

### 2. Introduce a model registry with declared capabilities

Configured model IDs will continue to use the existing `provider:model` format. A registry in `packages/ai` will parse and resolve each model ID into:

- provider ID
- raw model name
- provider availability
- capabilities such as `streaming` and `embeddings`
- a concrete provider implementation

Rationale:
- The current string parsing already exists and can be preserved.
- A central registry gives both backend and frontend a stable source of truth.
- Capability-based routing removes hard-coded checks from transport and UI logic.

### 3. Keep capabilities explicit instead of inferred from provider name

`ModelOption` will be extended with a `capabilities` object. The first version will expose:

- `streaming`
- `embeddings`

`embeddings` represents provider-native embedding support for that model provider, not whether the system as a whole can complete retrieval. For DeepSeek chat models, this will be `false` in the first implementation because embeddings remain OpenAI-backed.

Rationale:
- Capability metadata is required by the user.
- The UI should not rely on `startsWith("openai:")`.
- Explicit capability flags are easier to extend later than name-based heuristics.

### 4. Move provider-specific generation logic into `packages/ai`

`packages/api/src/qa-rag.ts` will stop making direct provider HTTP requests for answer generation. Instead, it will call the shared provider abstraction.

Rationale:
- Provider behavior belongs in the provider layer, not in QA business orchestration.
- This is the only way to make future providers additive instead of cross-cutting.

### 5. Add DeepSeek as a chat provider using its documented chat-completions interface

DeepSeek will be implemented as a separate adapter in `packages/ai`. The adapter will support:

- non-streaming grounded answers
- streaming grounded answers

The first implementation will not add DeepSeek embeddings.

Rationale:
- The user explicitly requested DeepSeek in this change.
- DeepSeek should be integrated through the same abstraction boundary as OpenAI, not as another special case in `packages/api`.

## Proposed Architecture

### Shared types in `packages/ai`

The abstraction layer should define these concepts:

- `ModelCapabilities`
- `ChatProvider`
- `EmbeddingProvider`
- `ResolvedModel`
- `ModelRegistry`

Expected shape:

```ts
type ModelCapabilities = {
  streaming: boolean
  embeddings: boolean
}

type ChatProvider = {
  id: string
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
  streamGroundedAnswer?(input: {
    model: string
    systemPrompt: string
    userPrompt: string
    signal?: AbortSignal
    onDelta(chunk: string): void
  }): Promise<{
    content: string
    tokenCount?: number
    model: string
    rawResponseId?: string
  }>
}

type EmbeddingProvider = {
  id: string
  createEmbeddings(input: {
    texts: string[]
    model?: string
    dimensions?: number
  }): Promise<number[][]>
}
```

### Provider registry responsibilities

The registry should:

- parse `provider:model`
- validate supported providers
- determine whether required credentials are configured
- expose capability metadata for each configured model
- resolve the concrete chat provider implementation

### Workflow refactor

`packages/ai/src/workflows/answer-question.ts` should no longer depend on:

- `openAI`
- `generateNonOpenAIAnswer`

It should instead depend on:

- an embedding provider for retrieval
- a model resolver or chat gateway for answer generation

`packages/ai/src/workflows/document-ingestion.ts` should depend on an embedding provider with OpenAI semantics behind the interface, but not on an `OpenAIService` type.

### Transport and UI behavior

The server stream route should reject streaming requests when the selected model capability `streaming` is false.

The frontend should read capability metadata from the model settings query and only attempt SSE when the selected model supports streaming. When streaming is unavailable, it should keep the current fallback to the non-streaming mutation path.

## Risks / Trade-offs

- [Capability semantics] -> `embeddings: false` on DeepSeek models may be misread as "this model cannot answer questions." Mitigation: treat `embeddings` as provider-native embedding support, while retrieval continues to use the system embedding provider.
- [Two-provider execution path] -> The final QA request path will use OpenAI for embeddings and another provider for answer generation. Mitigation: make this explicit in naming and keep retrieval encapsulated in one workflow boundary.
- [DeepSeek API differences] -> DeepSeek chat generation is not implemented via the same OpenAI Responses API path used by the current OpenAI adapter. Mitigation: standardize at the provider interface level, not at the raw upstream API shape.

## Migration Plan

1. Add shared provider abstractions and registry support in `packages/ai`.
2. Adapt OpenAI chat generation to the new interfaces.
3. Add DeepSeek chat provider support.
4. Replace workflow dependencies that are currently named or shaped around `OpenAIService`.
5. Remove provider-specific answer-generation logic from `packages/api/src/qa-rag.ts`.
6. Extend model settings metadata with capabilities.
7. Update server and frontend streaming checks to use capabilities.
8. Validate QA chat, ingestion, and settings behavior with both OpenAI and DeepSeek model configurations.

Rollback strategy:
- Because this change preserves the `provider:model` storage contract and is mostly internal refactoring, rollback can revert application code without requiring schema changes.

## Open Questions

- Should DeepSeek capability metadata include additional future-facing flags once reasoning-specific features are introduced?
- Should the registry remain env-backed only, or should provider metadata eventually move into a dedicated configuration module?
