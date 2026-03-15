export type EmbeddingProvider = {
  id: string
  createEmbeddings(input: {
    texts: string[]
    model?: string
    dimensions?: number
  }): Promise<number[][]>
}

export type GroundedAnswerResult = {
  content: string
  tokenCount?: number
  model: string
  rawResponseId?: string
}

export type ChatProvider = {
  id: string
  capabilities: {
    streaming: boolean
    embeddings: boolean
  }
  isConfigured(): boolean
  generateGroundedAnswer(input: {
    model: string
    systemPrompt: string
    userPrompt: string
  }): Promise<GroundedAnswerResult>
  streamGroundedAnswer?(input: {
    model: string
    systemPrompt: string
    userPrompt: string
    signal?: AbortSignal
    onDelta(chunk: string): void
  }): Promise<GroundedAnswerResult>
}

export type ResolvedModel = {
  id: string
  provider: string
  model: string
  capabilities: ChatProvider['capabilities']
  status: 'connected' | 'not_configured'
  chatProvider: ChatProvider
}
