import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(), tailwind()],
  build: { rollupOptions: { output: { manualChunks: { katex: ['katex'] } } } },
  test: { include: ['tests/**/*.unit.test.ts'] },
})
