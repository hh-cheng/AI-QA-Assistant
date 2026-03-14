'use client'
import { toast } from 'sonner'
import { startTransition, useEffect, useState } from 'react'
import { MessageSquare, Plus, Settings2 } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient, trpc } from '@/utils/trpc'
import ConversationPanel from './ConversationPanel'
import { EmptyState } from '@/components/qa/empty-state'
import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import { Button } from '@Intelligent-QA-Assistant/ui/components/button'

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
