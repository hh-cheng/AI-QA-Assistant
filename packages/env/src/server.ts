import 'dotenv/config'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    OBJECT_STORAGE_ENDPOINT: z.string().min(1),
    OBJECT_STORAGE_PORT: z.coerce.number().int().positive(),
    OBJECT_STORAGE_ACCESS_KEY: z.string().min(1),
    OBJECT_STORAGE_SECRET_KEY: z.string().min(1),
    OBJECT_STORAGE_BUCKET: z.string().min(1),
    OBJECT_STORAGE_USE_SSL: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    OPENAI_API_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    QA_DEFAULT_MODEL: z.string().min(1),
    QA_ALLOWED_MODELS: z.string().min(1),
    QA_TEST_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    QA_FAKE_AI: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    QA_FAKE_STORAGE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    BETTER_AUTH_SECURE_COOKIES: z
      .enum(['true', 'false'])
      .default(process.env.NODE_ENV === 'test' ? 'false' : 'true')
      .transform((value) => value === 'true'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
