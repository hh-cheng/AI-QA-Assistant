import { trpcServer } from '@hono/trpc-server'
import { createContext } from '@Intelligent-QA-Assistant/api/context'
import {
  getSelectedChatModel,
  processPendingIngestionJobs,
  saveUploadedDocuments,
  streamMessage,
} from '@Intelligent-QA-Assistant/api/qa-rag'
import { appRouter } from '@Intelligent-QA-Assistant/api/routers/index'
import { ensureObjectStorageBucket } from '@Intelligent-QA-Assistant/api/qa-storage'
import { auth } from '@Intelligent-QA-Assistant/auth'
import { env } from '@Intelligent-QA-Assistant/env/server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { z } from 'zod'

const app = new Hono()

const streamChatRequestSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1),
  scope: z.string().default('all'),
  responseLength: z.enum(['concise', 'standard', 'detailed']),
})

app.use(logger())
app.use(
  '/*',
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.post('/qa/documents/upload', async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  const userId = session?.user?.id
  if (!userId) {
    return c.json({ message: 'Authentication required' }, 401)
  }

  const formData = await c.req.raw.formData()
  const fileEntries = formData.getAll('files')
  const files = fileEntries.reduce<
    Array<{
      name: string
      type: string
      size: number
      arrayBuffer: () => Promise<ArrayBuffer>
    }>
  >((result, entry) => {
    if (
      typeof entry !== 'string' &&
      typeof entry.name === 'string' &&
      typeof entry.arrayBuffer === 'function'
    ) {
      result.push(entry)
    }
    return result
  }, [])

  if (files.length === 0) {
    return c.json({ message: 'No files uploaded' }, 400)
  }

  try {
    const documents = await saveUploadedDocuments({
      userId,
      files,
    })
    void processPendingIngestionJobs()
    return c.json({ documents })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload documents'

    return c.json(
      { message },
      message.startsWith('Unsupported file type') ? 400 : 500,
    )
  }
})

app.post('/qa/chat/stream', async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  const userId = session?.user?.id
  if (!userId) {
    return c.json({ message: 'Authentication required' }, 401)
  }

  const json = await c.req.json().catch(() => null)
  const parsed = streamChatRequestSchema.safeParse(json)

  if (!parsed.success) {
    return c.json(
      {
        message: 'Invalid chat stream request',
      },
      400,
    )
  }

  const selectedModel = await getSelectedChatModel({ userId })
  if (!selectedModel.capabilities.streaming) {
    return c.json(
      {
        message: 'Streaming is not available for the selected model',
      },
      409,
    )
  }

  const encoder = new TextEncoder()
  const abortController = new AbortController()

  const sendEvent = (
    controller: ReadableStreamDefaultController,
    event: string,
    data: unknown,
  ) => {
    controller.enqueue(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await streamMessage({
          userId,
          conversationId: parsed.data.conversationId,
          content: parsed.data.content,
          scope: parsed.data.scope,
          responseLength: parsed.data.responseLength,
          signal: abortController.signal,
          onStart(data) {
            sendEvent(controller, 'start', data)
          },
          onDelta(chunk) {
            sendEvent(controller, 'delta', { chunk })
          },
        })

        sendEvent(controller, 'complete', result)
      } catch (error) {
        if (!abortController.signal.aborted) {
          sendEvent(controller, 'error', {
            message:
              error instanceof Error
                ? error.message
                : 'Failed to generate a streaming answer',
          })
        }
      } finally {
        controller.close()
      }
    },
    cancel() {
      abortController.abort()
    },
  })

  return c.newResponse(stream, 200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
})

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context })
    },
  }),
)

app.get('/', (c) => {
  return c.text('OK')
})

import { serve } from '@hono/node-server'

if (!env.QA_TEST_MODE && !env.QA_FAKE_STORAGE) {
  void ensureObjectStorageBucket()
}

if (!env.QA_TEST_MODE) {
  setInterval(() => {
    void processPendingIngestionJobs()
  }, 5_000)
}

serve(
  {
    fetch: app.fetch,
    hostname: '0.0.0.0',
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  },
)
