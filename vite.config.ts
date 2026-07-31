import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/flyrank-opportunity-workflow/',
  test: {
    environment: 'node',
    globals: true,
  },
})
