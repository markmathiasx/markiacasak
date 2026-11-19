import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import process from 'node:process'

const backendTarget = 'http://127.0.0.1:3000'
const allowedHosts = (process.env.SKYNET_ALLOWED_HOSTS || '')
  .split(',')
  .map(host => host.trim())
  .filter(Boolean)
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
    allowedHosts,
    proxy,
  },
  preview: { allowedHosts, proxy },
  build: {
    sourcemap: process.env.SKYNET_SOURCEMAP === '1',
  },
})
