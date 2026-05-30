import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest lets us write a custom service worker (src/sw.js) with
      // push event handlers. Workbox injects self.__WB_MANIFEST into it at build time.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],

      manifest: {
        name: 'MatMind — Lovett Wrestling',
        short_name: 'MatMind',
        description: 'AI-powered team management for Lovett Wrestling',
        theme_color: '#1B3A5C',
        background_color: '#f8fafb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
