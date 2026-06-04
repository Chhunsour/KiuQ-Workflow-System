/* eslint-disable no-undef */
// Firebase Messaging Service Worker — handles background push notifications.
// Keep this file in /public so it is served from the root scope ('/').
// Version must stay in sync with the firebase package used in the main app.
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyAXIUePAhcsXeze4oPkhfq65P0sKnHO3ww",
  authDomain:        "website-team-4ed89.firebaseapp.com",
  projectId:         "website-team-4ed89",
  storageBucket:     "website-team-4ed89.firebasestorage.app",
  messagingSenderId: "189377356663",
  appId:             "1:189377356663:web:da1d6756359712e4d4b772",
});

const messaging = firebase.messaging();

// Background message handler — fires when tab is hidden or browser is closed.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? 'KiuQ';
  const body  = payload.notification?.body  ?? payload.data?.body  ?? '';
  const link  = payload.data?.link ?? '/';
  const type  = payload.data?.type ?? '';

  console.log('[sw] Background message received:', { title, type, link });

  self.registration.showNotification(title, {
    body,
    icon:     '/pwa-192x192.png',
    badge:    '/favicon.svg',
    silent:   false,
    tag:      type || 'kiuq',
    renotify: true,
    data:     { url: link },
  });
});

// Notification click — focus existing window or open a new one, then navigate.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';
  const origin    = self.location.origin;

  console.log('[sw] Notification clicked, navigating to:', targetUrl);

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        // If any window on our origin is already open, focus it and navigate.
        for (const win of wins) {
          if (win.url.startsWith(origin) && 'focus' in win) {
            win.focus();
            // Post message to App.vue router.push() handler
            win.postMessage({ type: 'NAVIGATE', url: targetUrl });
            return;
          }
        }
        // No window open — open a new one at the target URL.
        if (clients.openWindow) {
          return clients.openWindow(origin + targetUrl);
        }
      })
  );
});

// Activate immediately — no waiting for old SW to unload.
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
