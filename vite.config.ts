import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 4171, strictPort: true },
  preview: { port: 4171, strictPort: true },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
