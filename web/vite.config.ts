import { defineConfig } from 'vite'
// Declare minimal 'process' shape to avoid requiring @types/node
declare const process: { env?: Record<string, string | undefined> };
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number((process?.env?.VITE_PORT ?? process?.env?.PORT ?? 5173)),
    host: true,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      // Narrow proxy to backend brain asset endpoints only (do not intercept built static /assets/* files)
      '/assets/brain': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/agents': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: Number((process?.env?.VITE_PORT ?? process?.env?.PORT ?? 5173)),
    host: true,
  },
})
