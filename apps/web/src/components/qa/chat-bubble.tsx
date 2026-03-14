import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'

import { Badge } from './badge'

type SourceReference = {
  name: string
  page?: number
}

export function ChatBubble({
  role,
  content,
  model,
  responseTime,
  tokens,
  sources,
}: {
  role: 'user' | 'assistant'
  content: string
  model?: string
  responseTime?: string
  tokens?: number
  sources?: SourceReference[]
}) {
  const isAssistant = role === 'assistant'

  return (
    <div className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'qa-glass-card max-w-3xl rounded-3xl px-5 py-4',
          isAssistant
            ? 'border-border/70 bg-card/70'
            : 'border-primary/20 bg-primary/12 text-white',
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <Badge variant={isAssistant ? 'default' : 'outline'}>
            {isAssistant ? 'Assistant' : 'You'}
          </Badge>
          {isAssistant && model ? (
            <Badge variant="outline">{model}</Badge>
          ) : null}
          {isAssistant && responseTime ? (
            <span className="text-xs text-muted-foreground">
              {responseTime}
            </span>
          ) : null}
          {isAssistant && tokens ? (
            <span className="text-xs text-muted-foreground">
              {tokens} tokens
            </span>
          ) : null}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7">{content}</p>
        {isAssistant && sources?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {sources.map((source, index) => (
              <Badge key={`${source.name}-${index}`} variant="secondary">
                {source.name}
                {source.page ? ` · p.${source.page}` : ''}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
