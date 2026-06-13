import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type Status = 'upcoming' | 'ongoing' | 'finished';

@Component({
  selector: 'app-yk',
  templateUrl: './yk.component.html',
  styleUrls: ['./yk.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YkComponent {
  selected: Status | null = null;
  loading = false;
  message = '';
  isSuccess = false;

  readonly SECRET = 'YK2026';

  readonly statuses = [
    { value: 'upcoming' as Status, label: 'À venir',  emoji: '⏳' },
    { value: 'ongoing'  as Status, label: 'En cours', emoji: '⚽' },
    { value: 'finished' as Status, label: 'Terminé',  emoji: '✅' },
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  select(s: Status): void {
    this.selected = s;
    this.message = '';
    this.cdr.detectChanges();
  }

  confirm(): void {
    if (!this.selected || this.loading) return;
    const status = this.selected;
    this.loading = true;
    this.message = '';
    this.cdr.detectChanges();

    this.http.post<{ message: string; count: number }>(
      `${environment.apiUrl}/api/bulk-status`,
      { key: this.SECRET, status }
    ).subscribe({
      next: res => {
        this.loading = false;
        this.isSuccess = true;
        this.message = `${res.count} matchs passés en "${this.getLabel(status)}"`;
        this.selected = null;
        this.cdr.detectChanges();
        setTimeout(() => { this.message = ''; this.cdr.detectChanges(); }, 6000);
      },
      error: () => {
        this.loading = false;
        this.isSuccess = false;
        this.message = 'Erreur lors de la mise à jour';
        this.cdr.detectChanges();
      },
    });
  }

  getLabel(s: Status): string {
    return this.statuses.find(x => x.value === s)?.label ?? s;
  }
}
