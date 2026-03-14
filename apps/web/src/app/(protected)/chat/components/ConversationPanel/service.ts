import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/utils/trpc'
import { env } from '@Intelligent-QA-Assistant/env/web'
import { createLocalMessage, consumeSseStream } from '../../utils'
import type { ChatMessageLike, LocalChatMessage } from '../../types'

const suggestions = [
  'Summarize the most recently uploaded document',
  'List the key points from my indexed files',
  'What are the most important risks mentioned in the documents?',
  'Give me a concise answer with citations',
]

export default function useConversationPanelService(conversationId: string) {
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

  return {
    send,
    scope,
    endRef,
    setScope,
    isSending,
    documents,
    inputValue,
    conversation,
    setInputValue,
    responseLength,
    suggestionsRef,
    displayMessages,
    setResponseLength,
    suggestionOverflow,
  }
}
