import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      './apps/web/vitest.config.ts',
      './packages/ai/vitest.config.ts',
      './packages/api/vitest.config.ts',
      './packages/ui/vitest.config.ts',
    ],
  },
})
