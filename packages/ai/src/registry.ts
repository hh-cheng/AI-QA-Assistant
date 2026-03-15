import type { ChatProvider, ResolvedModel } from './providers'

function parseModelId(modelId: string) {
  const [provider, ...modelParts] = modelId.split(':')
  const model = modelParts.join(':').trim()

  if (!provider || !model) {
    throw new Error(`Invalid model identifier: ${modelId}`)
  }

  return {
    id: `${provider}:${model}`,
    provider,
    model,
  }
}

export type ModelRegistry = {
  listModels(modelIds: string[]): ResolvedModel[]
  getModel(modelId: string): ResolvedModel | null
  requireModel(modelId: string): ResolvedModel
}

export function createModelRegistry(input: { providers: ChatProvider[] }) {
  const providers = new Map(
    input.providers.map((provider) => [provider.id, provider]),
  )

  const registry: ModelRegistry = {
    listModels(modelIds) {
      return modelIds.map((modelId) => {
        const parsed = parseModelId(modelId)
        const provider = providers.get(parsed.provider)

        if (!provider) {
          throw new Error(`Unsupported provider: ${parsed.provider}`)
        }

        return {
          ...parsed,
          capabilities: provider.capabilities,
          status: provider.isConfigured() ? 'connected' : 'not_configured',
          chatProvider: provider,
        }
      })
    },
    getModel(modelId) {
      try {
        return registry.requireModel(modelId)
      } catch {
        return null
      }
    },
    requireModel(modelId) {
      const resolved = registry.listModels([modelId])[0]

      if (!resolved) {
        throw new Error(`Unsupported model: ${modelId}`)
      }

      if (resolved.status !== 'connected') {
        throw new Error(`Model is not configured: ${modelId}`)
      }

      return resolved
    },
  }

  return registry
}
