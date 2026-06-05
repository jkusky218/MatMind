// MatMind Custom Service Worker
// vite-plugin-pwa injects the precache manifest into self.__WB_MANIFEST

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache all build assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Automatic updates ─────────────────────────────────────────────────────────
// With injectManifest + autoUpdate, nothing reliably posts SKIP_WAITING, so a
// new service worker would install and sit in "waiting" forever — meaning the
// OLD cached bundle keeps being served to users (they never get new releases).
// Calling skipWaiting() in `install` makes every new SW activate immediately;
// clients.claim() then fires `controllerchange` in the app, which shows the
// "Update available" banner. This is what actually pushes new builds to devices.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Belt-and-suspenders: also honor an explicit SKIP_WAITING message.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Claim all open clients immediately so the controllerchange event fires
// in the app and it can surface the update banner.
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'MatMind 🦁', body: event.data.text() };
  }

  const options = {
    body:    payload.body  || '',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    data:    { url: payload.url || '/' },
    vibrate: [100, 50, 100],
    tag:     payload.tag  || 'matmind',    // collapses duplicate notifications
    renotify: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'MatMind 🦁', options)
  );
});

// ── Notification click → open / focus the app ─────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open in a tab, focus it
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(targetUrl);
    })
  );
});
