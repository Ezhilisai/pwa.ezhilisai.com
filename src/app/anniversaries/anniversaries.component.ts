import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Anniversary {
  couple: string;
  date: string;
  years: number;
  emoji: string;
  daysUntil: number;
}

@Component({
  selector: 'app-anniversaries',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header anniversary-header">
        <div class="page-icon">💍</div>
        <h2>Anniversaries</h2>
        <p>Love milestones to celebrate</p>
      </div>

      <div class="deep-link-banner">
        <span>🔗</span>
        <span>You arrived here via deep link from a push notification!</span>
      </div>

      <div class="items-list">
        @for (a of anniversaries(); track a.couple) {
          <div class="item-card" [class.soon]="a.daysUntil <= 7">
            <div class="item-emoji">{{ a.emoji }}</div>
            <div class="item-info">
              <div class="item-name">{{ a.couple }}</div>
              <div class="item-date">{{ a.date }} · {{ a.years }} years</div>
            </div>
            <div class="item-badge" [class.urgent]="a.daysUntil <= 7">
              @if (a.daysUntil === 0) {
                <span class="today">Today! 💕</span>
              } @else if (a.daysUntil === 1) {
                <span>Tomorrow!</span>
              } @else {
                <span>{{ a.daysUntil }}d</span>
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

    .anniversary-header {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
    .item-card.soon { border-left: 4px solid #4facfe; }

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
    .item-badge.urgent { background: #eff6ff; color: #3b82f6; }
    .today { color: #4facfe; }
  `]
})
export class AnniversariesComponent {
  anniversaries = signal<Anniversary[]>(this.computeAnniversaries());

  private computeAnniversaries(): Anniversary[] {
    const entries = [
      { couple: 'Bob & Carol', month: 6, day: 22, startYear: 2015, emoji: '💑' },
      { couple: 'David & Eve', month: 7, day: 10, startYear: 2010, emoji: '👫' },
      { couple: 'Frank & Grace', month: 9, day: 3, startYear: 2020, emoji: '💏' },
      { couple: 'Henry & Iris', month: 11, day: 18, startYear: 2005, emoji: '💞' },
    ];

    const today = new Date();
    const thisYear = today.getFullYear();

    return entries
      .map(e => {
        let next = new Date(thisYear, e.month - 1, e.day);
        if (next < today) next = new Date(thisYear + 1, e.month - 1, e.day);
        const diff = Math.ceil((next.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
        const years = thisYear - e.startYear + (next.getFullYear() > thisYear ? 1 : 0);
        return {
          couple: e.couple,
          emoji: e.emoji,
          date: next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          years,
          daysUntil: diff
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }
}
