import { defineConfig } from 'vitest/config'
import type { Connect } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const api: Connect.NextHandleFunction = async (req, res, next) => {
  const route = req.url?.split('?')[0]
  if (route !== '/api/classroom' && route !== '/api/pro-paper') return next()
  const { default: handler } = await import(
    pathToFileURL(path.resolve('.' + route + '.mjs')).href
  )
  await handler(req, res)
}
export default defineConfig({
  plugins: [
    react(),
    tailwind(),
    {
      name: 'classroom-local',
      configureServer(server) {
        server.middlewares.use(api)
      },
      configurePreviewServer(server) {
        server.middlewares.use(api)
      },
    },
  ],
  server: {
    fs: {
      deny: [
        '**/.private/**',
        '**/server-data/**',
        '**/*.sqlite',
        '**/*.pdf',
        '.env',
        '.env.*',
        '**/.git/**',
      ],
    },
  },
  build: { rollupOptions: { output: { manualChunks: { katex: ['katex'] } } } },
  test: { include: ['tests/**/*.unit.test.ts'] },
})
