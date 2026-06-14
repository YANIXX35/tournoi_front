import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match, Goal } from '../../models/match.model';
import { timeout, catchError } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchesComponent implements OnInit, OnDestroy {
  matches: Match[] = [];
  filteredMatches: Match[] = [];
  phases: string[] = [];
  selectedPhase = 'Tous';
  searchQuery = '';
  loading = true;
  hasError = false;
  page = 1;
  readonly pageSize = 10;
  teams: any[] = [];
  goals: Goal[] = [];
  goalsByMatchId: Map<number, Goal[]> = new Map();
  selectedMatch: Match | null = null;
  selectedMatchGoals: Goal[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private channel: BroadcastChannel | null = null;

  get paginatedMatches(): Match[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredMatches.slice(start, start + this.pageSize);
  }

  get showVenueCard(): boolean {
    const hasDemi = this.matches.some(m => m.phase === 'Demi-finale');
    return hasDemi && (this.selectedPhase === 'Demi-finale' || this.selectedPhase === 'Tous');
  }

  constructor(
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  @HostListener('document:keydown.escape')
  onEsc(): void { this.closeModal(); }

  ngOnInit(): void {
    this.tournamentService.invalidate('matches');
    this.tournamentService.invalidate('scorers');
    this.load();

    this.pollInterval = setInterval(() => {
      this.tournamentService.invalidate('matches');
      this.tournamentService.invalidate('scorers');
      this.silentRefresh();
    }, 5000);

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('tournament-updates');
      this.channel.onmessage = () => {
        this.tournamentService.invalidate('matches');
        this.tournamentService.invalidate('scorers');
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
      matches: this.tournamentService.getMatches().pipe(timeout(15000), catchError(() => of(null))),
      scorers: this.tournamentService.getTopScorers().pipe(timeout(15000), catchError(() => of(null))),
    }).subscribe(({ teams, matches, scorers }) => {
      this.ngZone.run(() => {
        if (teams.length) this.teams = teams;
        if (!matches) return;
        this.matches = matches;
        if (scorers?.all_goals) {
          this.goals = scorers.all_goals;
          this.buildGoalsMap();
        }
        const _fixed = ['Tour 1', 'Tour 2', 'Demi-finale', 'Finale'];
        const _fromData = [...new Set(matches.map((m: Match) => m.phase))];
        const _extra = _fromData.filter((p: string) => !_fixed.includes(p));
        const newPhases = ['Tous', ..._fixed, ..._extra];
        if (JSON.stringify(newPhases) !== JSON.stringify(this.phases)) this.phases = newPhases;
        this.applyFilters();
        this.cdr.detectChanges();
      });
    });
  }

  load(): void {
    this.loading = true;
    this.hasError = false;
    this.cdr.detectChanges();

    forkJoin({
      teams: this.tournamentService.getTeamsPublic().pipe(timeout(12000), catchError(() => of([]))),
      matches: this.tournamentService.getMatches().pipe(timeout(15000), catchError(() => of(null))),
      scorers: this.tournamentService.getTopScorers().pipe(timeout(15000), catchError(() => of(null))),
    }).subscribe(({ teams, matches, scorers }) => {
      this.ngZone.run(() => {
        this.teams = teams;
        this.loading = false;
        if (!matches) { this.hasError = true; this.cdr.detectChanges(); return; }
        this.matches = matches;
        if (scorers?.all_goals) {
          this.goals = scorers.all_goals;
          this.buildGoalsMap();
        }
        const fixed = ['Tour 1', 'Tour 2', 'Demi-finale', 'Finale'];
        const fromData = [...new Set(matches.map((m: Match) => m.phase))];
        const extra = fromData.filter((p: string) => !fixed.includes(p));
        this.phases = ['Tous', ...fixed, ...extra];
        this.applyFilters();
        this.cdr.detectChanges();
      });
    });
  }

  private buildGoalsMap(): void {
    const map = new Map<number, Goal[]>();
    for (const g of this.goals) {
      const arr = map.get(g.match_id) ?? [];
      arr.push(g);
      map.set(g.match_id, arr);
    }
    this.goalsByMatchId = map;
  }

  getMatchGoals(matchId: number): Goal[] {
    return this.goalsByMatchId.get(matchId) ?? [];
  }

  openMatch(match: Match): void {
    if (match.status !== 'finished') return;
    this.selectedMatch = match;
    this.selectedMatchGoals = this.getMatchGoals(match.id);
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.selectedMatch = null;
    this.selectedMatchGoals = [];
    this.cdr.detectChanges();
  }

  getPlayerPhotoUrl(photoUrl: string | null): string | null {
    if (!photoUrl) return null;
    return `${environment.apiUrl}${photoUrl}`;
  }

  onPhotoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  getInitials(name: string): string {
    return name.replace(/[?]/g, '').trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
  }

  private applyFilters(): void {
    let result = this.selectedPhase === 'Tous'
      ? this.matches
      : this.matches.filter(m => m.phase === this.selectedPhase);
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(m =>
        (m.team1_name || '').toLowerCase().includes(q) ||
        (m.team2_name || '').toLowerCase().includes(q)
      );
    }
    this.filteredMatches = result;
  }

  filterByPhase(phase: string): void {
    this.selectedPhase = phase;
    this.page = 1;
    this.applyFilters();
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.page = 1;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchQuery = '';
    input.value = '';
    this.page = 1;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  onPageChange(p: number): void { this.page = p; this.cdr.markForCheck(); }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = { upcoming: 'À venir', ongoing: 'En cours', finished: 'Terminé' };
    return labels[status] || status;
  }

  getTeamLogoUrl(name: string): string | null {
    if (!name || !this.teams.length) return null;
    const norm = (s: string) => s.trim().toLowerCase().replace(/[''‚‛ʼ]/g, "'");
    const n = norm(name);
    const t = this.teams.find(t => norm(t.name ?? '') === n);
    if (!t || !t.logo_path) return null;
    return `${environment.apiUrl}/api/teams/${t.id}/logo`;
  }

  trackByMatchId(_: number, m: Match): number { return m.id; }
  trackByPhase(_: number, phase: string): string { return phase; }
  trackByGoalId(_: number, g: Goal): number { return g.id; }

  exportPdf(): void {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();

      doc.setFillColor(13, 27, 42);
      doc.rect(0, 0, w, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Programme des Matchs', w / 2, 12, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text("Tournoi de Football de l'Étoile Universelle de Grand Bassam 2026", w / 2, 20, { align: 'center' });

      let y = 36;
      const matches = this.selectedPhase === 'Tous' ? this.matches : this.filteredMatches;

      matches.forEach((m, i) => {
        if (y > 270) { doc.addPage(); y = 15; }
        const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(10, y - 4, w - 20, 12, 'F');

        doc.setTextColor(26, 71, 42); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.text(m.phase, 13, y + 1);

        doc.setTextColor(30, 30, 30); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        const matchStr = `${m.team1_name}  vs  ${m.team2_name}`;
        doc.text(matchStr, w / 2, y + 2, { align: 'center' });

        if (m.status === 'finished' && m.score1 !== null) {
          doc.setTextColor(26, 71, 42);
          doc.text(`${m.score1} — ${m.score2}`, w - 40, y + 2, { align: 'center' });
        }

        doc.setTextColor(120, 120, 120); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        const dateStr = m.match_date ? m.match_date + (m.match_time ? '  ' + m.match_time.slice(0,5) : '') : '';
        doc.text(dateStr, 13, y + 6);

        const statusLabel = this.getStatusLabel(m.status);
        doc.text(statusLabel, w - 13, y + 6, { align: 'right' });

        y += 14;
      });

      doc.setTextColor(150, 150, 150); doc.setFontSize(7);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, w / 2, 288, { align: 'center' });

      doc.save('programme-matchs-etoiles-universelle-2026.pdf');
    });
  }
}
