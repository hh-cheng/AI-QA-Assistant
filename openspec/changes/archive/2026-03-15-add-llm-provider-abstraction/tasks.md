## 1. Shared Provider Abstractions

- [x] 1.1 Define shared chat-provider, embedding-provider, capability, and model-resolution types in `packages/ai`
- [x] 1.2 Introduce a provider registry that resolves `provider:model` identifiers, provider availability, and capabilities
- [x] 1.3 Refactor the existing OpenAI implementation to conform to the shared interfaces without changing current answer behavior

## 2. DeepSeek Provider Support

- [x] 2.1 Add validated server configuration for `DEEPSEEK_API_KEY`
- [x] 2.2 Implement a DeepSeek chat provider in `packages/ai` for grounded answer generation
- [x] 2.3 Implement DeepSeek streaming support through the shared provider interface
- [x] 2.4 Register DeepSeek model capabilities in the shared model registry

## 3. QA Backend Integration

- [x] 3.1 Refactor answer-question orchestration to use the shared provider abstraction instead of OpenAI-specific dependencies and non-OpenAI escape hatches
- [x] 3.2 Refactor document-ingestion orchestration to depend on a dedicated embedding provider abstraction while keeping OpenAI as the concrete embedding backend
- [x] 3.3 Remove provider-specific answer HTTP logic from `packages/api/src/qa-rag.ts`
- [x] 3.4 Extend QA model settings responses with capability metadata

## 4. Transport And Frontend Behavior

- [x] 4.1 Replace server-side streaming eligibility checks with model-capability checks
- [x] 4.2 Replace frontend `openai:`-prefix streaming checks with capability-based checks
- [x] 4.3 Preserve the existing fallback path from streaming to non-streaming mutation when the selected model does not support streaming

## 5. Validation

- [x] 5.1 Add or update unit tests for model registry resolution and capability reporting
- [x] 5.2 Add or update unit tests for answer orchestration with multiple providers
- [x] 5.3 Verify that document ingestion still uses OpenAI embeddings regardless of the selected chat provider
- [x] 5.4 Run `pnpm check`
- [x] 5.5 Run `pnpm check-types`
