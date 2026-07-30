import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Disable PWA in development to avoid caching issues
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'DigiHRMS',
        short_name: 'DigiHRMS',
        description: 'Human Resource Management System',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Only precache the app shell — lazy chunks load on demand
        globPatterns: ['**/*.html', '**/assets/react-*.js', '**/assets/react-*.css'],
        // Skip precaching large chunks — let them cache at runtime
        maximumFileSizeToCacheInBytes: 200 * 1024, // 200KB max per file
        runtimeCaching: [
          {
            // StaleWhileRevalidate for JS/CSS chunks — serve cached, update in background
            urlPattern: /\/assets\/.*\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'hrms-chunks',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // NetworkFirst for API requests — always try network, fall back to cache
            urlPattern: /^https:\/\/api\.digihrms\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hrms-api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Also cache local dev API calls with the same strategy
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hrms-api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // CacheFirst for static assets (fonts, images)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hrms-static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Force ALL react imports (including from @platform/auth-sdk) to use
      // the single React instance from this project's node_modules.
      // Without this, the linked auth-sdk resolves its own react@19.2.7,
      // creating two React instances that break context propagation.
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react'
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query'
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts'
          }
          if (id.includes('axios')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
