import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match, Standing } from '../../models/match.model';
import { timeout, catchError } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  standingsTour2: Standing[] = [];
  activeStandingsTab: 'tour1' | 'tour2' = 'tour1';
  teams: any[] = [];
  loading = true;
  hasError = false;
  matchPage = 1;
  readonly matchPageSize = 8;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private channel: BroadcastChannel | null = null;

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
    }, 5000);

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('tournament-updates');
      this.channel.onmessage = () => {
        this.tournamentService.invalidate('results');
        this.silentRefresh();
      };
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.channel) this.channel.close();
  }

  private silentRefresh(): void {
    forkJoin({
      teams: this.tournamentService.getTeamsPublic().pipe(timeout(12000), catchError(() => of([]))),
      results: this.tournamentService.getResults().pipe(timeout(15000), catchError(() => of(null))),
    }).subscribe(({ teams, results }) => {
      this.ngZone.run(() => {
        if (teams.length) this.teams = teams;
        if (!results) return;
        this.finishedMatches = results.finished_matches;
        this.standings = results.standings;
        this.standingsTour2 = results.standings_tour2 ?? [];
        this.cdr.detectChanges();
      });
    });
  }

  load(): void {
    this.loading = true;
    this.hasError = false;
    forkJoin({
      teams: this.tournamentService.getTeamsPublic().pipe(timeout(12000), catchError(() => of([]))),
      results: this.tournamentService.getResults().pipe(timeout(15000), catchError(() => of(null))),
    }).subscribe(({ teams, results }) => {
      this.ngZone.run(() => {
        this.teams = teams;
        this.loading = false;
        if (!results) { this.hasError = true; this.cdr.detectChanges(); return; }
        this.finishedMatches = results.finished_matches;
        this.standings = results.standings;
        this.standingsTour2 = results.standings_tour2 ?? [];
        this.cdr.detectChanges();
      });
    });
  }

  setStandingsTab(tab: 'tour1' | 'tour2'): void {
    this.activeStandingsTab = tab;
    this.cdr.markForCheck();
  }

  getTeamLogoUrl(name: string): string | null {
    if (!name || !this.teams.length) return null;
    const norm = (s: string) => s.trim().toLowerCase().replace(/[''‚‛ʼ]/g, "'");
    const n = norm(name);
    const t = this.teams.find(t => norm(t.name ?? '') === n);
    if (!t || !t.logo_path) return null;
    return `${environment.apiUrl}/api/teams/${t.id}/logo`;
  }

  getGoalDiff(s: Standing): string {
    const diff = s.goals_for - s.goals_against;
    return diff > 0 ? `+${diff}` : `${diff}`;
  }

  onMatchPageChange(p: number): void { this.matchPage = p; this.cdr.markForCheck(); }
  trackByMatchId(_: number, m: Match): number { return m.id; }
  trackByStandingId(_: number, s: Standing): number { return s.id; }
}
