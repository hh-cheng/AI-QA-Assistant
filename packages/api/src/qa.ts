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
  errorMessage?: string | null
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

export type ProviderStatus = 'connected' | 'not_configured'

export type ModelOption = {
  id: string
  provider: string
  model: string
  label: string
  status: ProviderStatus
}

export type UserModelSettings = {
  options: ModelOption[]
  selectedModelId: string
}

export type QaOverview = {
  totalDocuments: number
  readyDocuments: number
  queryCountThisWeek: number
  activeModel: string
  recentDocuments: DocumentSummary[]
}
