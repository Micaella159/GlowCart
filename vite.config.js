
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'glowcaRT (1).png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET'
              && /^\/api\/v1\/products(?:\/[0-9a-f-]+)?$/i.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'glowcart-products',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|avif|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'glowcart-images',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }
            }
          }
        ]
      }
    })
  ]
})
