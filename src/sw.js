/**
 * Custom Service Worker
 * - NO caching (avoids iOS redirect errors)
 * - Handles push notifications
 * - On notification click: stores target URL in IndexedDB, then opens app
 * - Angular reads IndexedDB on startup → navigates to deep link
 */

const DB_NAME = 'pwa-push-db';
const STORE   = 'pending-nav';

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
    req.onsuccess  = e => resolve(e.target.result);
    req.onerror    = e => reject(e.target.error);
  });
}

async function storeDeeplink(url) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(url, 'deeplink');
    tx.oncomplete = resolve;
    tx.onerror    = reject;
  });
}

// ── Install & Activate ────────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    // Clear all old caches
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener('push', event => {
  console.log('[SW] Push received');
  let data = {};
  try { data = event.data?.json() || {}; } catch {}

  const notif = data.notification || data;
  const targetUrl = notif.data?.url || '/';

  event.waitUntil(
    self.registration.showNotification(notif.title || '🔔 Notification', {
      body:   notif.body  || '',
      icon:   notif.icon  || '/assets/icons/icon-192x192.png',
      badge:  notif.badge || '/assets/icons/icon-72x72.png',
      tag:    notif.tag   || 'pwa-push',
      data:   { url: targetUrl }
    })
  );
});

// ── Notification click: store URL → open app ──────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  console.log('[SW] Notification clicked, target:', targetUrl);

  event.waitUntil(
    // 1. Store deeplink in IndexedDB BEFORE opening the app
    storeDeeplink(targetUrl)
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => {
        const appClient = clients.find(c => c.url.startsWith(self.location.origin));
        if (appClient) {
          // App open/background: send message + focus
          appClient.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return appClient.focus();
        }
        // App closed: open root, Angular reads IndexedDB on startup
        return self.clients.openWindow(self.location.origin + '/');
      })
  );
});
