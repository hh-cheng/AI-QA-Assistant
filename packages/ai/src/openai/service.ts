import type { OpenAIService } from '../index'
import { createEmbeddingVectors } from './embeddings'
import { createGroundedResponse } from './responses'

export function createOpenAIService(input: {
  apiKey: string
  embeddingModel: string
  embeddingDimensions?: number
}) {
  const service: OpenAIService = {
    createEmbeddings(request) {
      return createEmbeddingVectors({
        apiKey: input.apiKey,
        texts: request.texts,
        model: request.model ?? input.embeddingModel,
        dimensions: request.dimensions ?? input.embeddingDimensions,
      })
    },
    generateGroundedAnswer(request) {
      return createGroundedResponse({
        apiKey: input.apiKey,
        model: request.model,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
      })
    },
  }

  return service
}
