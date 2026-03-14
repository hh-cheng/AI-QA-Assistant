import { trpcServer } from '@hono/trpc-server'
import { createContext } from '@Intelligent-QA-Assistant/api/context'
import {
  processPendingIngestionJobs,
  saveUploadedDocuments,
} from '@Intelligent-QA-Assistant/api/qa-rag'
import { appRouter } from '@Intelligent-QA-Assistant/api/routers/index'
import { ensureObjectStorageBucket } from '@Intelligent-QA-Assistant/api/qa-storage'
import { auth } from '@Intelligent-QA-Assistant/auth'
import { env } from '@Intelligent-QA-Assistant/env/server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

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

void ensureObjectStorageBucket()
setInterval(() => {
  void processPendingIngestionJobs()
}, 5_000)

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
