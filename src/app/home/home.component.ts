import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PushNotificationService, PUSH_SERVER_URL, VAPID_PUBLIC_KEY } from '../services/push-notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home">
      <div class="hero-card">
        <div class="hero-icon">🎉</div>
        <h2>PWA Push Notifications</h2>
        <p class="subtitle">Test Web Push with deep links on your iPhone</p>
      </div>

      <!-- Debug Panel -->
      <div class="card" style="background:#1e1e2e;color:#cdd6f4;font-family:monospace;font-size:12px;">
        <div>🔗 URL: {{ debugUrl() }}</div>
        <div>💾 localStorage: {{ debugStorage() }}</div>
      </div>

      <!-- Push Subscription Status -->
      <div class="card status-card" [class.subscribed]="isSubscribed()">
        <div class="status-indicator">
          <span class="dot" [class.active]="isSubscribed()"></span>
          <span>{{ isSubscribed() ? 'Subscribed to notifications' : 'Not subscribed' }}</span>
        </div>

        @if (errorMsg()) {
          <div class="error-box">⚠️ {{ errorMsg() }}</div>
        }

        @if (successMsg()) {
          <div class="success-box">✅ {{ successMsg() }}</div>
        }

        @if (!isSubscribed()) {
          <button class="btn btn-primary" (click)="subscribe()" [disabled]="loading()">
            {{ loading() ? 'Subscribing...' : '🔔 Enable Push Notifications' }}
          </button>
        } @else {
          <button class="btn btn-outline" (click)="unsubscribe()" [disabled]="loading()">
            🔕 Disable Notifications
          </button>
        }
      </div>

      <!-- Config Check -->
      @if (vapidNotConfigured()) {
        <div class="card warning-card">
          <h3>⚙️ Setup Required</h3>
          <ol>
            <li>Run: <code>cd push-server && npm install</code></li>
            <li>Run: <code>node generate-vapid.js</code></li>
            <li>Copy the public key into <code>push-notification.service.ts</code></li>
            <li>Start server: <code>node server.js</code></li>
            <li>Build the app: <code>npm run build:prod</code></li>
          </ol>
        </div>
      }

      <!-- Test Notifications (only when subscribed) -->
      @if (isSubscribed()) {
        <div class="card">
          <h3>📤 Send Test Notifications</h3>
          <p class="card-desc">Triggers a push from the server — tapping it will deep-link into the app.</p>
          <div class="btn-group">
            <button class="btn btn-birthday" (click)="sendTest('birthday', 'Alice')" [disabled]="loading()">
              🎂 Birthday Notification
            </button>
            <button class="btn btn-anniversary" (click)="sendTest('anniversary', 'Bob & Carol')" [disabled]="loading()">
              💍 Anniversary Notification
            </button>
          </div>
        </div>
      }

      <!-- Quick Nav -->
      <div class="quick-nav">
        <a routerLink="/birthday" class="nav-card birthday">
          <span class="nav-icon">🎂</span>
          <span>Birthdays</span>
        </a>
        <a routerLink="/anniversaries" class="nav-card anniversary">
          <span class="nav-icon">💍</span>
          <span>Anniversaries</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .home { display: flex; flex-direction: column; gap: 16px; }

    .hero-card {
      text-align: center;
      padding: 32px 16px 24px;
      background: linear-gradient(135deg, var(--primary) 0%, #9c88ff 100%);
      border-radius: var(--radius);
      color: white;
      box-shadow: var(--shadow);
    }

    .hero-icon { font-size: 48px; margin-bottom: 12px; }
    .hero-card h2 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .subtitle { font-size: 14px; opacity: 0.85; }

    .card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow);
    }

    .card h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .card-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }

    .status-card { display: flex; flex-direction: column; gap: 12px; }
    .status-card.subscribed { border-left: 4px solid var(--accent); }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
    }

    .dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #d1d5db;
      flex-shrink: 0;
    }
    .dot.active { background: var(--accent); box-shadow: 0 0 0 3px rgba(67, 233, 123, 0.2); }

    .btn {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover:not(:disabled) { background: var(--primary-dark); transform: translateY(-1px); }

    .btn-outline {
      background: transparent;
      border: 2px solid #e5e7eb;
      color: var(--text-muted);
    }

    .btn-group { display: flex; flex-direction: column; gap: 10px; }

    .btn-birthday {
      background: linear-gradient(135deg, #f093fb, #f5576c);
      color: white;
    }
    .btn-anniversary {
      background: linear-gradient(135deg, #4facfe, #00f2fe);
      color: white;
    }
    .btn-birthday:hover:not(:disabled),
    .btn-anniversary:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }

    .warning-card { border-left: 4px solid #fbbf24; }
    .warning-card h3 { margin-bottom: 12px; }
    .warning-card ol { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
    }

    .error-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
    }

    .success-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
    }

    .quick-nav {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .nav-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 600;
      color: white;
      transition: transform 0.2s;
    }
    .nav-card:hover { transform: translateY(-2px); }

    .nav-icon { font-size: 32px; }

    .birthday { background: linear-gradient(135deg, #f093fb, #f5576c); }
    .anniversary { background: linear-gradient(135deg, #4facfe, #00f2fe); }
  `]
})
export class HomeComponent implements OnInit {
  private pushService = inject(PushNotificationService);

  isSubscribed = signal(false);
  loading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  vapidNotConfigured = signal((VAPID_PUBLIC_KEY as string) === 'YOUR_VAPID_PUBLIC_KEY_HERE');
  debugUrl = signal(window.location.href);
  debugStorage = signal(localStorage.getItem('pendingDeeplink') || '(none)');

  ngOnInit() {
    this.pushService.checkSubscription();
    this.pushService.isSubscribed$.subscribe(v => this.isSubscribed.set(v));
  }

  async subscribe() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    try {
      await this.pushService.subscribe();
      this.successMsg.set('Subscribed! You will now receive push notifications.');
    } catch (err: any) {
      this.errorMsg.set(err?.message || 'Subscription failed. Check console for details.');
    } finally {
      this.loading.set(false);
    }
  }

  async unsubscribe() {
    this.loading.set(true);
    try {
      await this.pushService.unsubscribe();
    } finally {
      this.loading.set(false);
    }
  }

  async sendTest(type: 'birthday' | 'anniversary', name: string) {
    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    try {
      await this.pushService.sendTestNotification(type, name);
      this.successMsg.set(`${type === 'birthday' ? '🎂 Birthday' : '💍 Anniversary'} notification sent! Check your notifications.`);
    } catch (err: any) {
      this.errorMsg.set('Failed to send notification. Is the push server running?');
    } finally {
      this.loading.set(false);
    }
  }
}
