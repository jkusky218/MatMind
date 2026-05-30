// MatMind Custom Service Worker
// vite-plugin-pwa injects the precache manifest into self.__WB_MANIFEST

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache all build assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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
