import type { ChatProvider, EmbeddingProvider, OpenAIService } from '../index'

export function createOpenAIEmbeddingProvider(input: {
  service: OpenAIService
}): EmbeddingProvider {
  return {
    id: 'openai',
    createEmbeddings(request) {
      return input.service.createEmbeddings(request)
    },
  }
}

export function createOpenAIChatProvider(input: {
  service: OpenAIService
}): ChatProvider {
  return {
    id: 'openai',
    capabilities: {
      streaming: true,
      embeddings: true,
    },
    isConfigured() {
      return true
    },
    generateGroundedAnswer(request) {
      return input.service.generateGroundedAnswer(request)
    },
    streamGroundedAnswer(request) {
      return input.service.streamGroundedAnswer(request)
    },
  }
}
