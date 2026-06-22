import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Birthday {
  name: string;
  date: string;
  emoji: string;
  daysUntil: number;
}

@Component({
  selector: 'app-birthday',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header birthday-header">
        <div class="page-icon">🎂</div>
        <h2>Birthdays</h2>
        <p>Upcoming celebrations</p>
      </div>

      <div class="deep-link-banner">
        <span>🔗</span>
        <span>You arrived here via deep link from a push notification!</span>
      </div>

      <div class="items-list">
        @for (b of birthdays(); track b.name) {
          <div class="item-card" [class.soon]="b.daysUntil <= 7">
            <div class="item-emoji">{{ b.emoji }}</div>
            <div class="item-info">
              <div class="item-name">{{ b.name }}</div>
              <div class="item-date">{{ b.date }}</div>
            </div>
            <div class="item-badge" [class.urgent]="b.daysUntil <= 7">
              @if (b.daysUntil === 0) {
                <span class="today">Today! 🎉</span>
              } @else if (b.daysUntil === 1) {
                <span>Tomorrow!</span>
              } @else {
                <span>{{ b.daysUntil }}d</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 16px; }

    .page-header {
      text-align: center;
      padding: 28px 16px 20px;
      border-radius: var(--radius);
      color: white;
    }

    .birthday-header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .page-icon { font-size: 44px; margin-bottom: 10px; }
    .page-header h2 { font-size: 24px; font-weight: 700; }
    .page-header p { font-size: 14px; opacity: 0.85; margin-top: 4px; }

    .deep-link-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
    }

    .items-list { display: flex; flex-direction: column; gap: 10px; }

    .item-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: white;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      transition: transform 0.2s;
    }
    .item-card:hover { transform: translateX(4px); }
    .item-card.soon { border-left: 4px solid #f5576c; }

    .item-emoji { font-size: 32px; flex-shrink: 0; }

    .item-info { flex: 1; }
    .item-name { font-weight: 600; font-size: 16px; }
    .item-date { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

    .item-badge {
      background: #f3f4f6;
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .item-badge.urgent { background: #fef2f2; color: #ef4444; }
    .today { color: #f5576c; }
  `]
})
export class BirthdayComponent {
  birthdays = signal<Birthday[]>(this.computeBirthdays());

  private computeBirthdays(): Birthday[] {
    const entries = [
      { name: 'Alice Johnson', month: 6, day: 20, emoji: '👩' },
      { name: 'Bob Smith', month: 7, day: 4, emoji: '👨' },
      { name: 'Carol White', month: 8, day: 15, emoji: '👩‍🦳' },
      { name: 'David Brown', month: 9, day: 1, emoji: '🧑' },
      { name: 'Eve Davis', month: 12, day: 25, emoji: '👧' },
    ];

    const today = new Date();
    const thisYear = today.getFullYear();

    return entries
      .map(e => {
        let next = new Date(thisYear, e.month - 1, e.day);
        if (next < today) next = new Date(thisYear + 1, e.month - 1, e.day);
        const diff = Math.ceil((next.getTime() - today.setHours(0,0,0,0)) / 86400000);
        return {
          name: e.name,
          emoji: e.emoji,
          date: next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          daysUntil: diff
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }
}
