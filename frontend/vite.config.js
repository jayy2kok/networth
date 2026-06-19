import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5050,
    // Proxy /api/* to backend during local `npm run dev`
    proxy: {
      '/api': {
        target: 'http://localhost:6060',
        changeOrigin: true,
      },
    },
  },
})
