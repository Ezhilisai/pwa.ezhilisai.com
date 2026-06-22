/**
 * Custom Push Service Worker
 * Handles push events and notification clicks with deep linking.
 *
 * This file is included alongside Angular's ngsw-worker.js.
 * It is registered separately in the Angular app so both can coexist.
 *
 * NOTE: For Angular PWA, ngsw-worker.js handles caching.
 *       This SW handles ONLY push notifications and deep links.
 *
 * Registration: handled by custom-sw.service.ts (registered manually).
 */

self.addEventListener('install', () => {
  console.log('[SW Push] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW Push] Activated');
  event.waitUntil(self.clients.claim());
});

// ── Push Event ───────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW Push] Push received:', event);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'New notification', body: event.data?.text() || '' };
  }

  const title = data.title || '🎉 PWA Push';
  const options = {
    body: data.body || '',
    icon: data.icon || '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    tag: data.tag || 'pwa-push',
    data: {
      url: data.url || '/',
      type: data.type || 'general'
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: data.actions || []
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click → Deep Link ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification clicked:', event.notification.data);

  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app window is already open, focus and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
