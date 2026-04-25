import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config. The /api proxy lets us call `fetch('/api/analyze')` from the
// React app and have it forwarded to the FastAPI server, avoiding CORS
// complications during local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
