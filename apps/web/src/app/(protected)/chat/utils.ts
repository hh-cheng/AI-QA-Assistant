import type {
  MessageRole,
  LocalChatMessage,
  StreamCompleteEvent,
} from './types'

export function createLocalMessage(input: {
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

export function parseSseBlock(block: string) {
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

export async function consumeSseStream(
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
