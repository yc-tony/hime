import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single source of truth for the Flask backend URL.
// Change this one line if the port changes.
const BACKEND = 'http://localhost:5001'

export default defineConfig({
  plugins: [react()],
  base: '',
  server: {
    proxy: {
      // All Flask routes use the same backend host
      '/hime':             BACKEND,
      '/static':           BACKEND,   // Live2D model files live under /static/model/
      '/chat_fast':        BACKEND,
      '/chat_deep':        BACKEND,
      '/generate_live2d':  BACKEND,
      '/live2d_config':    BACKEND,
      '/live2d':           BACKEND,   // covers /live2d/characterInfo and any sub-routes
      '/generateAudio':    BACKEND,
      '/translate':        BACKEND,
      '/account':          BACKEND,
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
