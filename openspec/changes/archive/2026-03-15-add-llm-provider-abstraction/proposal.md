## Why

The current QA answer flow is only partially abstracted. OpenAI is encapsulated in `packages/ai`, but provider routing, provider-specific HTTP behavior, and streaming eligibility still leak into the QA service layer and server route handling. This makes each new LLM integration expensive and error-prone because business code must be updated alongside provider code.

The next phase requires a stable interface layer for multiple LLM services. The user confirmed four constraints for this change:

- Embeddings remain fixed to OpenAI for retrieval and ingestion.
- Model options should expose capability metadata.
- Non-streaming models should continue to fall back to the existing non-streaming mutation path.
- DeepSeek should be added to `packages/ai` in this change.

## What Changes

- Introduce a provider abstraction layer in `packages/ai` for chat-generation capabilities.
- Keep embeddings on a dedicated OpenAI-backed embedding provider instead of coupling them to every chat provider.
- Add a model registry that resolves `provider:model` identifiers, provider availability, and provider capabilities.
- Move provider-specific answer generation logic out of `packages/api/src/qa-rag.ts` and into `packages/ai`.
- Extend QA model settings metadata to include capabilities such as `streaming` and `embeddings`.
- Replace OpenAI-name-based streaming checks with capability-based checks in the server and frontend.
- Add DeepSeek chat provider support through the new abstraction layer while preserving the existing OpenAI integration.

## Capabilities

### New Capabilities
- `llm-provider-abstraction`: Resolve configured answer models through a shared provider registry and execute grounded answer generation without embedding provider-specific HTTP logic in QA business code.

### Modified Capabilities
- `llm-model-selection`: Expose provider capability metadata to the UI and backend so streaming behavior is decided by capabilities instead of hard-coded provider name checks.

## Impact

- Affected shared backend modules: `packages/ai`, `packages/api`, `packages/env`
- Affected runtime module: `apps/server`
- Affected frontend module: protected QA chat flow in `apps/web`
- New server configuration: `DEEPSEEK_API_KEY`
- Existing model configuration format remains unchanged: `provider:model`
