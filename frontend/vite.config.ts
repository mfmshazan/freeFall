import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      external: ['three', /^three\/addons\//],
      input: {
        index: resolve(__dirname, 'index.html'),
        simulator: resolve(__dirname, 'simulator.html'),
        'fire-lab': resolve(__dirname, 'fire-lab.html'),
        evidence: resolve(__dirname, 'evidence.html'),
        safety: resolve(__dirname, 'safety.html'),
        replay: resolve(__dirname, 'replay.html'),
      },
    },
  },
})
