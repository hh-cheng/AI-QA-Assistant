'use client'
import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/utils/trpc'
import { env } from '@Intelligent-QA-Assistant/env/web'
import { ChatBubble } from '@/components/qa/chat-bubble'
import { EmptyState } from '@/components/qa/empty-state'
import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import { createLocalMessage, consumeSseStream } from '../../utils'
import type { ChatMessageLike, LocalChatMessage } from '../../types'
import { Input } from '@Intelligent-QA-Assistant/ui/components/input'
import { Button } from '@Intelligent-QA-Assistant/ui/components/button'
import useConversationPanelService from './service'

const suggestions = [
  'Summarize the most recently uploaded document',
  'List the key points from my indexed files',
  'What are the most important risks mentioned in the documents?',
  'Give me a concise answer with citations',
]

export default function ConversationPanel({
  conversationId,
}: {
  conversationId: string
}) {
  const {
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
  } = useConversationPanelService(conversationId)

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
