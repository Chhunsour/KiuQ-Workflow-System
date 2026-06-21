import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // Use injectManifest so we control the SW file — Workbox SW is separate from
      // firebase-messaging-sw.js and the two never conflict.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      // Push notifications use /firebase-messaging-sw.js at the root scope.
      // Do not auto-register the Workbox SW on the same scope.
      injectRegister: false,

      manifest: {
        name: 'KiuQ Website System',
        short_name: 'KiuQ System',
        description: 'Manage WordPress prompts, assignments, and team workflow.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#242424',
        background_color: '#242424',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },

      devOptions: {
        // Enable PWA in dev so you can test install prompt locally
        enabled: true,
        type: 'module',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 5175,
  },
});
