import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Dev-only proxy so downloaded audio is same-origin and the `download`
    // attribute is honoured. Netlify's _redirects does the same in production.
    proxy: {
      '/cdn-audio': {
        target: 'https://apiboxfiles.erweima.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cdn-audio/, ''),
      },
    },
  },
})
