import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const singleWorker = process.env.VITEST_SINGLE_WORKER === '1'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Stable mode for constrained CI/sandbox when VITEST_SINGLE_WORKER=1
    pool: singleWorker ? 'threads' : 'threads',
    poolOptions: singleWorker
      ? { threads: { minThreads: 1, maxThreads: 1 } }
      : undefined,
    fileParallelism: singleWorker ? false : true,
    isolate: singleWorker ? false : true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
    },
  },
})
