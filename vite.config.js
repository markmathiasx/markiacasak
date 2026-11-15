import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget = 'http://127.0.0.1:3000'
const proxy = {
  '/health': { target: backendTarget, changeOrigin: false },
  '/api': { target: backendTarget, changeOrigin: false },
  '/ws': { target: backendTarget, ws: true, changeOrigin: false },
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy,
  },
  preview: { proxy },
  build: {
    sourcemap: true,
  },
})
