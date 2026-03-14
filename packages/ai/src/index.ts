export type DocumentIngestionInput = {
  jobId: string
  documentId: string
  userId: string
}

export type DocumentIngestionResult = {
  documentId: string
  chunkCount: number
  summary: string | null
  status: 'completed' | 'failed'
  errorMessage?: string
}

export type AnswerQuestionInput = {
  conversationId: string
  userId: string
  question: string
  scope: 'all' | string
  responseLength: 'concise' | 'standard' | 'detailed'
}

export type AnswerQuestionResult = {
  conversationId: string
  assistantMessageId: string
  content: string
  model?: string
  tokenCount?: number
  sources: Array<{ name: string; page?: number }>
}

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

export type DocumentParser = {
  extractText(input: {
    fileType: 'TXT' | 'MD' | 'PDF' | 'DOCX'
    body: Buffer
  }): Promise<{
    text: string
    pageMap?: Array<{ pageNumber: number; content: string }>
  }>
}

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

export type SourceReference = {
  name: string
  page?: number
}

export type RetrievedChunk = {
  documentId: string
  fileName: string
  content: string
  pageNumber?: number | null
  distance: number
}

export type DocumentRecord = {
  id: string
  userId: string
  storageKey: string
  fileType: 'TXT' | 'MD' | 'PDF' | 'DOCX'
}

export type IngestionJobRecord = {
  id: string
  documentId: string
  userId: string
  attempts: number
}

export type ConversationRecord = {
  id: string
  userId: string
  title: string
}

export type DocumentRepository = {
  getById(input: {
    documentId: string
    userId: string
  }): Promise<DocumentRecord | null>
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

export type IngestionJobRepository = {
  listPending(limit: number): Promise<IngestionJobRecord[]>
  getById(input: { jobId: string }): Promise<IngestionJobRecord | null>
  markRunning(input: {
    jobId: string
    attempts: number
    at: Date
  }): Promise<void>
  markCompleted(input: { jobId: string; at: Date }): Promise<void>
  markFailed(input: {
    jobId: string
    errorMessage: string
    at: Date
  }): Promise<void>
}

export type DocumentStorage = {
  readObject(input: { storageKey: string }): Promise<Buffer>
  storeObject(input: {
    storageKey: string
    body: Buffer
    contentType: string
  }): Promise<void>
  removeObject(input: { storageKey: string }): Promise<void>
}

export type ChunkRetriever = {
  retrieve(input: {
    userId: string
    questionEmbedding: number[]
    documentIds?: string[]
    topK?: number
  }): Promise<RetrievedChunk[]>
}

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
    sources?: SourceReference[]
  }): Promise<{ messageId: string }>
  updateConversationAfterAnswer(input: {
    conversationId: string
    title?: string
    selectedScope: string[] | null
    selectedModel?: string
    updatedAt: Date
  }): Promise<void>
}

export type UserModelPreferencesRepository = {
  getSelectedModelId(userId: string): Promise<string>
}

export { createMastra } from './mastra'
export { createAnswerAgent } from './agents/answer-agent'
export { createOpenAIService } from './openai/service'
export {
  createAnswerQuestionWorkflow,
  runAnswerQuestionWorkflow,
} from './workflows/answer-question'
export {
  createDocumentIngestionWorkflow,
  runDocumentIngestionWorkflow,
} from './workflows/document-ingestion'
