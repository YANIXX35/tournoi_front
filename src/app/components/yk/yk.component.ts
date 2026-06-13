import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TournamentService } from '../../services/tournament.service';
import { Match } from '../../models/match.model';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';

type Status = 'upcoming' | 'ongoing' | 'finished';

@Component({
  selector: 'app-yk',
  templateUrl: './yk.component.html',
  styleUrls: ['./yk.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YkComponent implements OnInit {

  // ── Verrouillage ─────────────────────────────────────────────────────────────
  locked = !sessionStorage.getItem('yk_unlocked');
  pinValue = '';
  pinError = false;

  unlock(): void {
    if (this.pinValue.trim().toUpperCase() === 'YK2026') {
      sessionStorage.setItem('yk_unlocked', '1');
      this.locked = false;
      this.cdr.detectChanges();
    } else {
      this.pinError = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.pinError = false; this.cdr.detectChanges(); }, 1200);
    }
  }

  // ── Bulk ─────────────────────────────────────────────────────────────────────
  bulkSelected: Status | null = null;
  bulkLoading = false;
  bulkMessage = '';
  bulkSuccess = false;

  // ── Matchs ───────────────────────────────────────────────────────────────────
  matches: Match[] = [];
  matchesLoading = true;
  expandedId: number | null = null;
  editScore = { score1: 0, score2: 0 };
  editStatus: Status = 'upcoming';
  saveLoading = false;
  globalSaveMsg = '';

  readonly SECRET = 'YK2026';
  private channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('tournament-updates') : null;

  private broadcast(): void { this.channel?.postMessage({ type: 'match-updated' }); }

  readonly STATUSES = [
    { value: 'upcoming' as Status, label: 'À venir',  emoji: '⏳' },
    { value: 'ongoing'  as Status, label: 'En cours', emoji: '⚽' },
    { value: 'finished' as Status, label: 'Terminé',  emoji: '✅' },
  ];

  constructor(
    private http: HttpClient,
    private tournament: TournamentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.loadMatches(); }

  // ── Chargement ───────────────────────────────────────────────────────────────

  loadMatches(): void {
    this.matchesLoading = true;
    this.tournament.invalidate('matches');
    this.tournament.getMatches().pipe(
      timeout(15000),
      catchError(() => of([] as Match[]))
    ).subscribe(matches => {
      this.matches = matches;
      this.matchesLoading = false;
      this.cdr.detectChanges();
    });
  }

  // ── Liste affichée : en cours → à venir → terminé aujourd'hui ───────────────

  get today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get displayMatches(): Match[] {
    const ongoing  = this.matches.filter(m => m.status === 'ongoing');
    const upcoming = this.matches.filter(m => m.status === 'upcoming');
    const doneToday = this.matches.filter(m => m.status === 'finished' && m.match_date?.slice(0,10) === this.today);
    return [...ongoing, ...upcoming, ...doneToday];
  }

  // ── Édition individuelle ──────────────────────────────────────────────────────

  toggle(match: Match): void {
    if (this.expandedId === match.id) {
      this.expandedId = null;
    } else {
      this.expandedId = match.id;
      this.editScore  = { score1: match.score1 ?? 0, score2: match.score2 ?? 0 };
      this.editStatus = match.status;
      this.globalSaveMsg = '';
    }
    this.cdr.detectChanges();
  }

  saveMatch(match: Match): void {
    if (this.saveLoading) return;
    this.saveLoading = true;
    this.cdr.detectChanges();

    this.http.post<{ message: string }>(
      `${environment.apiUrl}/api/match-quick-update`,
      {
        key: this.SECRET,
        match_id: match.id,
        score1: Number(this.editScore.score1),
        score2: Number(this.editScore.score2),
        status: this.editStatus,
      }
    ).subscribe({
      next: () => {
        const idx = this.matches.findIndex(m => m.id === match.id);
        if (idx >= 0) {
          this.matches[idx] = {
            ...this.matches[idx],
            score1: Number(this.editScore.score1),
            score2: Number(this.editScore.score2),
            status: this.editStatus,
          };
          this.matches = [...this.matches];
        }
        this.saveLoading = false;
        this.expandedId  = null;
        this.globalSaveMsg = '✓ Match mis à jour';
        this.tournament.invalidate('matches');
        this.broadcast();
        this.cdr.detectChanges();
        setTimeout(() => { this.globalSaveMsg = ''; this.cdr.detectChanges(); }, 5000);
      },
      error: () => {
        this.saveLoading = false;
        this.globalSaveMsg = '✗ Erreur lors de la sauvegarde';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Bulk ─────────────────────────────────────────────────────────────────────

  selectBulk(s: Status): void {
    this.bulkSelected = s;
    this.bulkMessage = '';
    this.cdr.detectChanges();
  }

  confirmBulk(): void {
    if (!this.bulkSelected || this.bulkLoading) return;
    const status = this.bulkSelected;
    this.bulkLoading = true;
    this.cdr.detectChanges();

    this.http.post<{ message: string; count: number }>(
      `${environment.apiUrl}/api/bulk-status`,
      { key: this.SECRET, status }
    ).subscribe({
      next: res => {
        this.bulkLoading = false;
        this.bulkSuccess = true;
        this.bulkMessage = `✓ ${res.count} matchs → "${this.getLabel(status)}"`;
        this.bulkSelected = null;
        this.broadcast();
        this.loadMatches();
        this.cdr.detectChanges();
        setTimeout(() => { this.bulkMessage = ''; this.cdr.detectChanges(); }, 5000);
      },
      error: () => {
        this.bulkLoading = false;
        this.bulkSuccess = false;
        this.bulkMessage = '✗ Erreur';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getLabel(s: Status | string): string {
    return this.STATUSES.find(x => x.value === s)?.label ?? s;
  }

  trackById(_: number, m: Match): number { return m.id; }
}
