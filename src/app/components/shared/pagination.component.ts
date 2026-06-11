import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: false,
  template: `
    <div class="pagination" *ngIf="totalPages > 1">
      <span class="page-info">{{ rangeStart }}–{{ rangeEnd }} sur {{ total }}</span>

      <div class="page-controls">
        <button class="page-btn nav-btn" (click)="prev()" [disabled]="page === 1" aria-label="Page précédente">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <ng-container *ngFor="let p of pages; trackBy: trackBy">
          <span *ngIf="p === '...'" class="page-dots">…</span>
          <button *ngIf="p !== '...'"
            class="page-btn"
            [class.active]="p === page"
            (click)="goTo(+p)">{{ p }}</button>
        </ng-container>

        <button class="page-btn nav-btn" (click)="next()" [disabled]="page === totalPages" aria-label="Page suivante">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: .75rem;
      padding: 2rem 0 .5rem;
    }
    .page-info {
      font-size: .8rem;
      color: var(--text-muted);
      font-weight: 500;
      white-space: nowrap;
    }
    .page-controls {
      display: flex;
      align-items: center;
      gap: .3rem;
    }
    .page-btn {
      min-width: 36px; height: 36px;
      padding: 0 .5rem;
      border-radius: var(--r-sm);
      border: 1.5px solid var(--border);
      background: var(--card);
      color: var(--navy);
      font-size: .85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s;
      &:hover:not(:disabled):not(.active) {
        border-color: var(--emerald);
        color: var(--emerald);
        background: rgba(34,197,94,.06);
      }
      &.active {
        background: var(--green);
        border-color: var(--green);
        color: white;
        box-shadow: 0 2px 8px rgba(26,71,42,.25);
      }
      &:disabled { opacity: .35; cursor: not-allowed; }
    }
    .nav-btn { border-color: var(--border); }
    .page-dots {
      font-size: .9rem;
      color: var(--text-muted);
      padding: 0 .25rem;
      user-select: none;
    }
    @media (max-width: 480px) {
      .pagination { gap: .5rem; }
      .page-btn { min-width: 32px; height: 32px; font-size: .8rem; }
      .page-info { font-size: .75rem; }
    }
  `]
})
export class PaginationComponent implements OnChanges {
  @Input() total = 0;
  @Input() pageSize = 12;
  @Input() page = 1;
  @Output() pageChange = new EventEmitter<number>();

  pages: (number | '...')[] = [];

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get rangeStart(): number { return Math.min((this.page - 1) * this.pageSize + 1, this.total); }
  get rangeEnd(): number   { return Math.min(this.page * this.pageSize, this.total); }

  ngOnChanges(): void { this._buildPages(); }

  private _buildPages(): void {
    const t = this.totalPages;
    const c = this.page;
    if (t <= 7) { this.pages = Array.from({length: t}, (_, i) => i + 1); return; }
    const p: (number | '...')[] = [1];
    if (c > 3) p.push('...');
    for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) p.push(i);
    if (c < t - 2) p.push('...');
    p.push(t);
    this.pages = p;
  }

  goTo(p: number): void {
    if (p === this.page) return;
    this.pageChange.emit(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  prev(): void { if (this.page > 1) this.goTo(this.page - 1); }
  next(): void { if (this.page < this.totalPages) this.goTo(this.page + 1); }
  trackBy(_: number, p: number | string): number | string { return p; }
}
