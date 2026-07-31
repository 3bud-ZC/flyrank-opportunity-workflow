import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  base: '/flyrank-opportunity-workflow/',
  test: {
    environment: 'node',
    globals: true,
  },
})
