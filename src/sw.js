/**
 * Custom Service Worker
 * - Caches app shell (offline support)
 * - Handles push notifications
 * - On notification click: stores target URL in IndexedDB, then opens app
 * - Angular reads IndexedDB on startup → navigates to deep link
 */

const CACHE = 'pwa-push-v2';
const DB_NAME = 'pwa-push-db';
const STORE  = 'pending-nav';

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

// ── Install: cache app shell ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing');
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(['/', '/index.html', '/manifest.webmanifest']))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: claim clients, remove old caches ────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: SPA routing + cache-first for assets ───────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip API, chrome-extension, non-GET
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation → always serve index.html (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(r => r || fetch('/index.html', { redirect: 'follow' }))
    );
    return;
  }

  // Assets → cache-first, fallback to network then cache
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request, { redirect: 'follow' }).then(response => {
        if (response.ok && response.type !== 'opaqueredirect') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return response;
      });
    })
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
        return self.clients.openWindow('/');
      })
  );
});
