import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* ── PWA Plugin — Gracefully loads if installed, skips if not ── */
let VitePWA = null
try {
  VitePWA = (await import('vite-plugin-pwa')).VitePWA
} catch (e) {
  console.log(
    '%c[CABD]%c PWA plugin not installed — skipping. Enable in Phase 7: npm i -D vite-plugin-pwa',
    'color:#06d6f0;font-weight:bold',
    'color:#94a3b8'
  )
}

export default defineConfig({
  plugins: [
    react(),
    ...(VitePWA
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['**/*.png', '**/*.jpg', '**/*.svg', '**/*.webp'],
            manifest: {
              name: 'Clutch Arena BD',
              short_name: 'Clutch Arena',
              description: 'Free Fire Custom Room Tournament Platform',
              theme_color: '#0a0a1a',
              background_color: '#0a0a1a',
              display: 'standalone',
              orientation: 'portrait',
              scope: '/',
              start_url: '/',
              lang: 'en',
              categories: ['games', 'entertainment', 'sports'],
              icons: [
                {
                  src: '/icons/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any maskable',
                },
                {
                  src: '/icons/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any maskable',
                },
                {
                  src: '/icons/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
              ],
            },
                       workbox: {
              globPatterns: ['**/*.{js,css,html,png,jpg,svg,webp,woff2}'],
              navigateFallback: '/index.html',
            },
          }),
        ]
      : []),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})