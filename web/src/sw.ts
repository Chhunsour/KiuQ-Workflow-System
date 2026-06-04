/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Workbox injects the precache manifest here at build time
precacheAndRoute(self.__WB_MANIFEST);

// Remove caches from old Workbox versions on activation
cleanupOutdatedCaches();

// Let the browser handle navigation requests — Vue Router handles routing client-side.
// This avoids a fetch handler that would intercept /firebase-messaging-sw.js.
self.addEventListener('fetch', (event) => {
  // Pass-through: let the browser cache and network handle everything.
  // Workbox precaching already covers the built assets above.
  void event;
});
