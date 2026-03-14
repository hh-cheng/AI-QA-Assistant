import { cn } from '@Intelligent-QA-Assistant/ui/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  status,
}: {
  role: 'user' | 'assistant'
  content: string
  model?: string
  responseTime?: string
  tokens?: number
  sources?: SourceReference[]
  status?: 'streaming' | 'error'
}) {
  const isAssistant = role === 'assistant'
  const isError = status === 'error'

  return (
    <div className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'qa-glass-card max-w-3xl rounded-3xl px-5 py-4',
          isAssistant
            ? 'border-border/70 bg-card/70'
            : 'border-primary/20 bg-primary/12 text-white',
          isError && 'border-destructive/50 bg-destructive/10',
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <Badge
            variant={
              isError ? 'destructive' : isAssistant ? 'default' : 'outline'
            }
          >
            {isAssistant ? 'Assistant' : 'You'}
          </Badge>
          {status === 'streaming' ? (
            <Badge variant="outline">Streaming</Badge>
          ) : null}
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
        <div
          className={cn(
            'qa-markdown max-w-none text-sm leading-7',
            isAssistant ? 'text-foreground' : 'text-white',
            '[&_a]:break-all [&_a]:underline [&_a]:underline-offset-4',
            '[&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground',
            '[&_code]:rounded-md [&_code]:bg-black/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]',
            '[&_li>p]:inline [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p:not(:first-child)]:mt-3 [&_pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-black/20 [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:mt-3 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:text-left [&_td]:border [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border/60 [&_th]:bg-black/10 [&_th]:px-3 [&_th]:py-2 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1',
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || (status === 'streaming' ? 'Thinking…' : '')}
          </ReactMarkdown>
          {status === 'streaming' ? (
            <span className="mt-2 inline-block h-5 w-2 animate-pulse rounded-full bg-primary/80 align-middle" />
          ) : null}
        </div>
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
