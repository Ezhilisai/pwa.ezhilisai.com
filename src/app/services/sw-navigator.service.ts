import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Listens for NAVIGATE messages posted by sw.js when
 * the user taps a notification while the app is open/in background.
 */
@Injectable({ providedIn: 'root' })
export class SwNavigatorService implements OnDestroy {
  private router = inject(Router);
  private handler = (event: MessageEvent) => {
    if (event.data?.type === 'NAVIGATE') {
      console.log('[SwNavigator] Navigate to:', event.data.url);
      this.router.navigateByUrl(event.data.url);
    }
  };

  init() {
    navigator.serviceWorker?.addEventListener('message', this.handler);
  }

  ngOnDestroy() {
    navigator.serviceWorker?.removeEventListener('message', this.handler);
  }
}
