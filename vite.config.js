import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api.php': {
        target: 'https://mac.91aix.cfd',
        changeOrigin: true,
        secure: true
      }
    }
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-core': ['vue', 'vue-router'],
          'player-core': ['plyr', 'hls.js']
        }
      }
    }
  }
})
