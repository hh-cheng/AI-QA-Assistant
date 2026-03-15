import { defineConfig, devices } from '@playwright/test'

const serverEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:password@127.0.0.1:5432/Intelligent-QA-Assistant',
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? 'test-secret-at-least-32-characters-long',
  BETTER_AUTH_URL: 'http://127.0.0.1:3000',
  CORS_ORIGIN: 'http://127.0.0.1:3001',
  NODE_ENV: 'test',
  OBJECT_STORAGE_ENDPOINT: '127.0.0.1',
  OBJECT_STORAGE_PORT: '9000',
  OBJECT_STORAGE_ACCESS_KEY: 'minioadmin',
  OBJECT_STORAGE_SECRET_KEY: 'minioadmin',
  OBJECT_STORAGE_BUCKET: 'qa-documents',
  OBJECT_STORAGE_USE_SSL: 'false',
  OPENAI_API_KEY: 'test-openai-key',
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  QA_DEFAULT_MODEL: 'openai:gpt-4.1',
  QA_ALLOWED_MODELS: 'openai:gpt-4.1,anthropic:claude-3-5-sonnet-latest',
  QA_TEST_MODE: 'true',
  QA_FAKE_AI: 'true',
  QA_FAKE_STORAGE: 'true',
  BETTER_AUTH_SECURE_COOKIES: 'false',
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter server build && pnpm --filter server start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: serverEnv,
    },
    {
      command: 'pnpm --filter web dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
      },
    },
  ],
})
