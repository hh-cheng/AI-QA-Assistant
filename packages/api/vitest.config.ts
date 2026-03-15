import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: 'api',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
})
