import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 1. Catches any frontend request directed at http://localhost:5173/api
      '/api': {
        target: 'https://openrouter.ai', // 2. Smoothly forwards it here
        changeOrigin: true,
        secure: true,
        // 3. Rewrites /api/v1 to /api/v1 so it matches the endpoint layout
        rewrite: (path) => path
      }
    }
  }
})
