'use client'

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
  'Summarize the project specification',
  'List action items from the meeting notes',
  'What model is configured by default?',
  'Explain the current migration architecture',
]

function ConversationPanel({ conversationId }: { conversationId: string }) {
  const [inputValue, setInputValue] = useState('')
  const [scope, setScope] = useState('all')
  const [responseLength, setResponseLength] = useState<
    'concise' | 'standard' | 'detailed'
  >('standard')
  const endRef = useRef<HTMLDivElement>(null)
  const conversation = useQuery(
    trpc.qa.chat.getConversation.queryOptions({ id: conversationId }),
  )
  const sendMutation = useMutation(trpc.qa.chat.sendMessage.mutationOptions())

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.data?.messages.length, sendMutation.isPending])

  const send = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    setInputValue('')
    await sendMutation.mutateAsync({
      conversationId,
      content: trimmed,
      scope,
      responseLength,
    })
    await queryClient.invalidateQueries()
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
            <option value="project-spec-v2.md">project-spec-v2.md</option>
            <option value="meeting-notes-q3.txt">meeting-notes-q3.txt</option>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {conversation.data.messages.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="size-8" />}
                title="Start the conversation"
                description="The first message will hit the mock chat.sendMessage mutation."
              />
            ) : (
              conversation.data.messages.map((message) => (
                <ChatBubble key={message.id} {...message} />
              ))
            )}
            {sendMutation.isPending ? (
              <div className="flex justify-start">
                <div className="qa-glass-card rounded-3xl px-5 py-4 text-sm text-muted-foreground">
                  Generating mock answer...
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        </div>

        <div className="h-[20vh] shrink-0 border-t border-border/60 px-5 py-4">
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-3 shrink-0 overflow-x-auto">
              <div className="flex min-w-max flex-wrap gap-2 pr-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-border/70 bg-secondary/20 px-3 py-1.5 text-xs transition hover:bg-secondary/40"
                    onClick={() => setInputValue(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending ? (
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
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
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
            Mock responses only
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
