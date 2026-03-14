export type MessageRole = 'user' | 'assistant'

export type SourceReference = {
  name: string
  page?: number
}

export type ChatMessageLike = {
  id: string
  role: MessageRole
  content: string
  model?: string
  responseTime?: string
  tokens?: number
  sources?: SourceReference[]
}

export type LocalChatMessage = ChatMessageLike & {
  status?: 'streaming' | 'error'
}

export type StreamCompleteEvent = {
  conversationId: string
  message: ChatMessageLike
}
