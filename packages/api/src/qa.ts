export type DocumentStatus = 'ready' | 'processing' | 'failed' | 'pending'
export type DocumentType = 'TXT' | 'MD' | 'PDF' | 'DOCX'

export type DocumentSummary = {
  id: string
  name: string
  type: DocumentType
  sizeLabel: string
  uploadedAt: string
  status: DocumentStatus
  chunks: number | null
}

export type DocumentDetail = DocumentSummary & {
  summary: string | null
}

export type SourceReference = {
  name: string
  page?: number
}

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  model?: string
  tokens?: number
  responseTime?: string
  sources?: SourceReference[]
}

export type ConversationSummary = {
  id: string
  title: string
  updatedAt: string
}

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[]
}

export type ProviderStatus = 'connected' | 'not_configured' | 'failed'

export type ProviderConfig = {
  apiKey?: string
  baseUrl?: string
  model?: string
  temperature?: number
  maxTokens?: number
  timeout?: number
  isDefault?: boolean
}

export type ProviderItem = {
  id: string
  name: string
  desc: string
  status: ProviderStatus
  config: ProviderConfig
}

export type QaDefaults = {
  defaultModel: string
  contextTurns: string
  showCitations: boolean
  defaultLength: 'concise' | 'standard' | 'detailed'
  chunkStrategy: 'recursive' | 'sentence' | 'paragraph'
  chunkSize: number
  embeddingModel: string
  topK: number
}

export type QaOverview = {
  totalDocuments: number
  readyDocuments: number
  queryCountThisWeek: number
  activeModel: string
  recentDocuments: DocumentSummary[]
}
