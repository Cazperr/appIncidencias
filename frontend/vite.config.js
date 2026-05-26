import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Novation — Gestión de Incidencias',
        short_name: 'Novation',
        description: 'Gestión de incidencias técnicas multi-proyecto',
        theme_color: '#0a0f1a',
        background_color: '#0a0f1a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Cachear todos los assets del frontend
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        runtimeCaching: [
          // Listado de incidencias — NetworkFirst con caché de 1 hora
          {
            urlPattern: /^https?:\/\/.*\/api\/incidencias(\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'incidencias-list',
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          // Detalle de incidencia individual
          {
            urlPattern: /^https?:\/\/.*\/api\/incidencias\/\d+$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'incidencias-detail',
              expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          // Dashboard stats
          {
            urlPattern: /^https?:\/\/.*\/api\/dashboard\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dashboard-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 1800 },
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          // Auth y proyectos — StaleWhileRevalidate (carga rápido y actualiza en segundo plano)
          {
            urlPattern: /^https?:\/\/.*\/api\/auth\/.*/i,
            handler: 'NetworkOnly', // Login nunca desde caché
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/proyectos.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'proyectos-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 7200 },
              cacheableResponse: { statuses: [0, 200] },
            }
          },
        ]
      }
    })
  ],
  server: {
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
  }
})