import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,   // Auto-pick next free port if 5173 is busy
    host: 'localhost',
    open: true,          // Auto-open browser on startup
    // NOTE: Do NOT hardcode hmr.port — let Vite match it to the actual server port
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
