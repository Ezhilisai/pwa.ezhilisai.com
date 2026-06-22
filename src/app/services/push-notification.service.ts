import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export const VAPID_PUBLIC_KEY: string = 'BAU7FFwc4Cyorc8KAOhklp1YibyUWy9vuatVzBBDvErkZuvumomYhpjglmFOJHn3MWjHwvabFQDIrZpBk6nsXu0';
export const PUSH_SERVER_URL: string  = 'https://push.ezhilisai.com';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private http = inject(HttpClient);

  isSubscribed$ = new BehaviorSubject<boolean>(false);

  get isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async subscribe(): Promise<void> {
    if (!this.isSupported) throw new Error('Push not supported in this browser.');

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await this.http.post(`${PUSH_SERVER_URL}/api/subscribe`, sub).toPromise();
    this.isSubscribed$.next(true);
    console.log('[Push] Subscribed:', sub.endpoint.slice(0, 50));
  }

  async unsubscribe(): Promise<void> {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      this.isSubscribed$.next(false);
    }
  }

  async checkSubscription(): Promise<void> {
    if (!this.isSupported) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    this.isSubscribed$.next(!!sub);
  }

  sendTestNotification(type: 'birthday' | 'anniversary', name: string): Promise<any> {
    return this.http.post(`${PUSH_SERVER_URL}/api/notify`, { type, name }).toPromise();
  }
}
