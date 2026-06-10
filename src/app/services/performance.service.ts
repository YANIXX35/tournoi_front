import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private _lite$ = new BehaviorSubject<boolean>(false);
  readonly liteMode$ = this._lite$.asObservable();

  get isLiteMode(): boolean { return this._lite$.value; }

  init(): void {
    const conn = (navigator as any).connection;
    if (!conn) return;
    const check = () => {
      if (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
        if (!this._lite$.value) this._lite$.next(true);
      }
    };
    check();
    conn.addEventListener?.('change', check);
  }

  markSlow(): void {
    if (!this._lite$.value) this._lite$.next(true);
  }
}
