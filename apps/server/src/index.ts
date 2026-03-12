import { trpcServer } from '@hono/trpc-server'
import { createContext } from '@Intelligent-QA-Assistant/api/context'
import { appRouter } from '@Intelligent-QA-Assistant/api/routers/index'
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
