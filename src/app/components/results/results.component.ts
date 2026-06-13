import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match, Standing } from '../../models/match.model';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent implements OnInit, OnDestroy {
  finishedMatches: Match[] = [];
  standings: Standing[] = [];
  loading = true;
  hasError = false;
  matchPage = 1;
  readonly matchPageSize = 8;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  get paginatedMatches(): Match[] {
    const start = (this.matchPage - 1) * this.matchPageSize;
    return this.finishedMatches.slice(start, start + this.matchPageSize);
  }

  constructor(
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.load();
    this.pollInterval = setInterval(() => {
      this.tournamentService.invalidate('results');
      this.silentRefresh();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private silentRefresh(): void {
    this.tournamentService.getResults().pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe(data => {
      this.ngZone.run(() => {
        if (!data) return;
        this.finishedMatches = data.finished_matches;
        this.standings = data.standings;
        this.cdr.detectChanges();
      });
    });
  }

  load(): void {
    this.loading = true;
    this.hasError = false;
    this.tournamentService.getResults().pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe(data => {
      this.ngZone.run(() => {
        this.loading = false;
        if (!data) { this.hasError = true; this.cdr.detectChanges(); return; }
        this.finishedMatches = data.finished_matches;
        this.standings = data.standings;
        this.cdr.detectChanges();
      });
    });
  }

  getGoalDiff(s: Standing): string {
    const diff = s.goals_for - s.goals_against;
    return diff > 0 ? `+${diff}` : `${diff}`;
  }

  onMatchPageChange(p: number): void { this.matchPage = p; this.cdr.markForCheck(); }
  trackByMatchId(_: number, m: Match): number { return m.id; }
  trackByStandingId(_: number, s: Standing): number { return s.id; }
}
