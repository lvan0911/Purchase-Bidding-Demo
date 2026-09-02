import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@pages': fileURLToPath(new URL('./pages', import.meta.url)),
      '@components': fileURLToPath(new URL('./components', import.meta.url)),
      '@static': fileURLToPath(new URL('./static', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5100,
    strictPort: false,
    open: false,
    proxy: {
      '/api': {
        target: 'http://192.168.110.7:8080',
        changeOrigin: true,
      },
    },
  },
})
