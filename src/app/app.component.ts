import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { PushNotificationService } from './services/push-notification.service';
import { SwNavigatorService } from './services/sw-navigator.service';
import { DeeplinkService } from './services/deeplink.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <div class="header-brand">
          <span class="brand-icon">🎉</span>
          <h1>PWA Push</h1>
        </div>
        <nav class="nav-tabs">
          <a routerLink="/home" routerLinkActive="active">🏠 Home</a>
          <a routerLink="/birthday" routerLinkActive="active">🎂 Birthday</a>
          <a routerLink="/anniversaries" routerLinkActive="active">💍 Anniversary</a>
        </nav>
      </header>

      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-header {
      background: var(--primary);
      color: white;
      padding: 0 16px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(108, 99, 255, 0.3);
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 0 4px;
    }

    .brand-icon {
      font-size: 24px;
    }

    h1 {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .nav-tabs {
      display: flex;
      gap: 4px;
      padding-top: 8px;
    }

    .nav-tabs a {
      color: rgba(255,255,255,0.75);
      padding: 8px 12px;
      border-radius: 12px 12px 0 0;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .nav-tabs a:hover {
      color: white;
      background: rgba(255,255,255,0.15);
    }

    .nav-tabs a.active {
      color: var(--primary);
      background: white;
      font-weight: 600;
    }

    .app-content {
      flex: 1;
      padding: 24px 16px;
      max-width: 640px;
      width: 100%;
      margin: 0 auto;
    }
  `]
})
export class AppComponent implements OnInit {
  private pushService = inject(PushNotificationService);
  private swNavigator = inject(SwNavigatorService);
  private deeplinkService = inject(DeeplinkService);
  private router = inject(Router);

  async ngOnInit() {
    // 1. Register our custom SW
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[App] SW registered');
      } catch (e) {
        console.warn('[App] SW registration failed:', e);
      }
    }

    // 2. Listen for NAVIGATE messages from SW (app open/background)
    this.swNavigator.init();

    // 3. Read IndexedDB for pending deep link (app closed case)
    //    SW stores the URL in IndexedDB before opening the app
    const deeplink = await this.deeplinkService.getPendingUrl();
    if (deeplink) {
      console.log('[App] Deep link from IndexedDB:', deeplink);
      this.router.navigateByUrl(deeplink);
    }
  }
}
