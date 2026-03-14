'use client'

import { env } from '@Intelligent-QA-Assistant/env/web'
import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import { Input } from '@Intelligent-QA-Assistant/ui/components/input'
import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, MessageSquare, Plus, Send, Settings2 } from 'lucide-react'
import { startTransition, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { queryClient, trpc } from '@/utils/trpc'

import { ChatBubble } from './chat-bubble'
import { EmptyState } from './empty-state'

const suggestions = [
  'Summarize the most recently uploaded document',
  'List the key points from my indexed files',
  'What are the most important risks mentioned in the documents?',
  'Give me a concise answer with citations',
]

type MessageRole = 'user' | 'assistant'

type SourceReference = {
  name: string
  page?: number
}

type ChatMessageLike = {
  id: string
  role: MessageRole
  content: string
  model?: string
  responseTime?: string
  tokens?: number
  sources?: SourceReference[]
}

type LocalChatMessage = ChatMessageLike & {
  status?: 'streaming' | 'error'
}

type StreamCompleteEvent = {
  conversationId: string
  message: ChatMessageLike
}

function createLocalMessage(input: {
  role: MessageRole
  content: string
  status?: 'streaming' | 'error'
}): LocalChatMessage {
  return {
    id: crypto.randomUUID(),
    role: input.role,
    content: input.content,
    status: input.status,
  }
}

function parseSseBlock(block: string) {
  let event = 'message'
  const data: string[] = []

  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
      continue
    }

    if (line.startsWith('data:')) {
      data.push(line.slice('data:'.length).trim())
    }
  }

  if (data.length === 0) {
    return null
  }

  return {
    event,
    payload: JSON.parse(data.join('\n')) as unknown,
  }
}

async function consumeSseStream(
  response: Response,
  input: {
    onDelta(chunk: string): void
    onComplete(payload: StreamCompleteEvent): Promise<void> | void
  },
) {
  if (!response.body) {
    throw new Error('Streaming response did not include a body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done }).replaceAll('\r\n', '\n')

    let separatorIndex = buffer.indexOf('\n\n')
    while (separatorIndex !== -1) {
      const block = buffer.slice(0, separatorIndex).trim()
      buffer = buffer.slice(separatorIndex + 2)

      if (block) {
        const parsed = parseSseBlock(block)
        if (parsed) {
          switch (parsed.event) {
            case 'delta':
              input.onDelta((parsed.payload as { chunk?: string }).chunk ?? '')
              break
            case 'complete':
              await input.onComplete(parsed.payload as StreamCompleteEvent)
              break
            case 'error':
              throw new Error(
                (parsed.payload as { message?: string }).message ??
                  'Streaming request failed',
              )
            default:
              break
          }
        }
      }

      separatorIndex = buffer.indexOf('\n\n')
    }

    if (done) {
      break
    }
  }
}

function ConversationPanel({ conversationId }: { conversationId: string }) {
  const [inputValue, setInputValue] = useState('')
  const [scope, setScope] = useState('all')
  const [responseLength, setResponseLength] = useState<
    'concise' | 'standard' | 'detailed'
  >('standard')
  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [suggestionOverflow, setSuggestionOverflow] = useState({
    left: false,
    right: false,
  })
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const conversationQueryOptions = trpc.qa.chat.getConversation.queryOptions({
    id: conversationId,
  })
  const conversation = useQuery(conversationQueryOptions)
  const documents = useQuery(
    trpc.qa.documents.list.queryOptions({ status: 'ready', type: 'all' }),
  )
  const models = useQuery(trpc.qa.settings.getModels.queryOptions())
  const sendMutation = useMutation(trpc.qa.chat.sendMessage.mutationOptions())
  const canStreamResponses =
    models.data?.selectedModelId.startsWith('openai:') ?? false

  const displayMessages = [
    ...(conversation.data?.messages ?? []),
    ...localMessages,
  ]
  const lastMessage = displayMessages.at(-1)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages.length, lastMessage?.content, isSending])

  useEffect(() => {
    abortRef.current?.abort()
    setIsSending(false)
    setLocalMessages([])
  }, [conversationId])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const container = suggestionsRef.current
    if (!container) {
      return
    }

    const updateSuggestionOverflow = () => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth
      setSuggestionOverflow({
        left: container.scrollLeft > 4,
        right: maxScrollLeft - container.scrollLeft > 4,
      })
    }

    updateSuggestionOverflow()
    container.addEventListener('scroll', updateSuggestionOverflow, {
      passive: true,
    })

    const resizeObserver = new ResizeObserver(updateSuggestionOverflow)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('scroll', updateSuggestionOverflow)
      resizeObserver.disconnect()
    }
  }, [])

  const updateAssistantMessage = (
    assistantId: string,
    updater: (message: LocalChatMessage) => LocalChatMessage,
  ) => {
    setLocalMessages((current) =>
      current.map((message) =>
        message.id === assistantId ? updater(message) : message,
      ),
    )
  }

  const syncConversationQueries = async () => {
    await queryClient.invalidateQueries()
  }

  const finalizeConversation = async (input: {
    userMessage: LocalChatMessage
    assistantMessage: ChatMessageLike
  }) => {
    queryClient.setQueryData(conversationQueryOptions.queryKey, (current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        updatedAt: new Date().toISOString(),
        messages: [
          ...current.messages,
          {
            id: input.userMessage.id,
            role: 'user' as const,
            content: input.userMessage.content,
          },
          input.assistantMessage,
        ],
      }
    })

    setLocalMessages([])
    await syncConversationQueries()
  }

  const sendWithFallbackMutation = async (input: {
    content: string
    userMessage: LocalChatMessage
  }) => {
    const nextConversation = await sendMutation.mutateAsync({
      conversationId,
      content: input.content,
      scope,
      responseLength,
    })

    queryClient.setQueryData(
      conversationQueryOptions.queryKey,
      nextConversation,
    )
    setLocalMessages([])
    await syncConversationQueries()
  }

  const sendWithStreaming = async (input: {
    content: string
    userMessage: LocalChatMessage
    assistantMessage: LocalChatMessage
  }) => {
    const abortController = new AbortController()
    abortRef.current = abortController

    const response = await fetch(
      `${env.NEXT_PUBLIC_SERVER_URL}/qa/chat/stream`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          content: input.content,
          scope,
          responseLength,
        }),
        signal: abortController.signal,
      },
    )

    if (response.status === 409) {
      abortRef.current = null
      await sendWithFallbackMutation(input)
      return
    }

    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as {
        message?: string
      } | null
      throw new Error(json?.message ?? 'Failed to open chat stream')
    }

    await consumeSseStream(response, {
      onDelta(chunk) {
        updateAssistantMessage(input.assistantMessage.id, (message) => ({
          ...message,
          content: `${message.content}${chunk}`,
        }))
      },
      async onComplete(payload) {
        abortRef.current = null
        await finalizeConversation({
          userMessage: input.userMessage,
          assistantMessage: payload.message,
        })
      },
    })
  }

  const send = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSending) {
      return
    }

    const userMessage = createLocalMessage({
      role: 'user',
      content: trimmed,
    })
    const assistantMessage = createLocalMessage({
      role: 'assistant',
      content: '',
      status: 'streaming',
    })

    setInputValue('')
    setLocalMessages([userMessage, assistantMessage])
    setIsSending(true)

    try {
      if (canStreamResponses) {
        await sendWithStreaming({
          content: trimmed,
          userMessage,
          assistantMessage,
        })
      } else {
        await sendWithFallbackMutation({
          content: trimmed,
          userMessage,
        })
      }
    } catch (error) {
      const aborted = abortRef.current?.signal.aborted ?? false
      abortRef.current = null

      if (!aborted) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to send message',
        )
      }

      setLocalMessages([
        {
          ...assistantMessage,
          content: aborted
            ? 'Generation cancelled.'
            : 'Failed to generate answer.',
          status: 'error',
        },
      ])

      await syncConversationQueries()
    } finally {
      setIsSending(false)
    }
  }

  if (conversation.isLoading || !conversation.data) {
    return (
      <div className="qa-glass-card flex h-full min-h-0 items-center justify-center rounded-[2rem]">
        Loading conversation...
      </div>
    )
  }

  return (
    <div className="qa-glass-card flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem]">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="font-semibold">{conversation.data.title}</h2>
          <p className="text-sm text-muted-foreground">
            Updated {new Date(conversation.data.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="h-10 rounded-full border border-border/70 bg-secondary/20 px-4 text-sm"
          >
            <option value="all">All documents</option>
            {documents.data?.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
          <select
            value={responseLength}
            onChange={(event) =>
              setResponseLength(event.target.value as typeof responseLength)
            }
            className="h-10 rounded-full border border-border/70 bg-secondary/20 px-4 text-sm"
          >
            <option value="concise">Concise</option>
            <option value="standard">Standard</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="qa-scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {displayMessages.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="size-8" />}
                title="Start the conversation"
                description="The first message will retrieve your indexed chunks and call the selected LLM."
              />
            ) : (
              displayMessages.map((message) => (
                <ChatBubble key={message.id} {...message} />
              ))
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 px-5 py-4">
          <div className="flex h-full min-h-0 flex-col">
            <div className="relative mb-3 shrink-0">
              <div
                ref={suggestionsRef}
                className="scrollbar-hide overflow-x-auto"
              >
                <div className="flex min-w-max flex-nowrap gap-2 pr-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-full border border-border/70 bg-secondary/20 px-3 py-1.5 text-xs whitespace-nowrap transition hover:bg-secondary/40"
                      onClick={() => setInputValue(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={cn(
                  'pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-card/95 to-transparent transition-opacity',
                  suggestionOverflow.left ? 'opacity-100' : 'opacity-0',
                )}
              />
              <div
                className={cn(
                  'pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-card/95 to-transparent transition-opacity',
                  suggestionOverflow.right ? 'opacity-100' : 'opacity-0',
                )}
              />
            </div>

            <div className="flex min-h-0 flex-1 items-end gap-3">
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send(inputValue)
                  }
                }}
                placeholder="Ask something about your documents..."
                className="h-12 rounded-full border-border/70 bg-secondary/20 px-5"
              />
              <Button
                type="button"
                className="rounded-full px-5"
                onClick={() => void send(inputValue)}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QaChatPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const conversations = useQuery(trpc.qa.chat.listConversations.queryOptions())
  const createConversation = useMutation(
    trpc.qa.chat.createConversation.mutationOptions(),
  )

  useEffect(() => {
    if (!activeId && conversations.data?.[0]) {
      setActiveId(conversations.data[0].id)
    }
  }, [activeId, conversations.data])

  const createNewConversation = async () => {
    const conversation = await createConversation.mutateAsync()
    toast.success('Conversation created')
    await queryClient.invalidateQueries()
    startTransition(() => {
      setActiveId(conversation.id)
    })
  }

  return (
    <div className="grid h-[80vh] min-h-0 overflow-hidden gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="qa-glass-card flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem]">
        <div className="border-b border-border/60 p-4">
          <Button
            type="button"
            className="w-full rounded-full"
            onClick={() => void createNewConversation()}
            disabled={createConversation.isPending}
          >
            <Plus className="size-4" />
            New chat
          </Button>
        </div>
        <div className="qa-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {conversations.data?.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={cn(
                'w-full rounded-[1.5rem] border p-4 text-left transition',
                activeId === conversation.id
                  ? 'border-primary/20 bg-primary/10'
                  : 'border-border/60 bg-secondary/20 hover:bg-secondary/35',
              )}
              onClick={() => {
                startTransition(() => {
                  setActiveId(conversation.id)
                })
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{conversation.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(conversation.updatedAt).toLocaleString()}
                  </p>
                </div>
                <MessageSquare className="size-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-border/60 p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4" />
            Answers are grounded in your indexed documents
          </div>
        </div>
      </aside>

      {activeId ? (
        <ConversationPanel conversationId={activeId} />
      ) : (
        <div className="h-[80vh] min-h-0">
          <EmptyState
            icon={<MessageSquare className="size-8" />}
            title="No conversation selected"
            description="Create a new chat to exercise the migrated chat route."
          />
        </div>
      )}
    </div>
  )
}
