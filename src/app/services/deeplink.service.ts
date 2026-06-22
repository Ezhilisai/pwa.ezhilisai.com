import { Injectable } from '@angular/core';

const DB_NAME = 'pwa-push-db';
const STORE   = 'pending-nav';

/**
 * Reads and clears the pending deep link URL stored in IndexedDB
 * by the service worker when a push notification is tapped.
 */
@Injectable({ providedIn: 'root' })
export class DeeplinkService {

  getPendingUrl(): Promise<string | null> {
    return new Promise(resolve => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = (e: any) =>
        e.target.result.createObjectStore(STORE);

      req.onsuccess = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          resolve(null);
          return;
        }
        const tx    = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const get   = store.get('deeplink');

        get.onsuccess = () => {
          const url = get.result || null;
          if (url) store.delete('deeplink'); // consume it
          resolve(url);
        };
        get.onerror = () => resolve(null);
      };

      req.onerror = () => resolve(null);
    });
  }
}
