import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { PerformanceService } from '../../services/performance.service';
import { Match, TeamDetail } from '../../models/match.model';

@Component({
  selector: 'app-team-detail',
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamDetailComponent implements OnInit {
  team: TeamDetail | null = null;
  loading = true;
  error = false;
  brokenPhotos = new Set<string>();

  goalScorers: { player_name: string; type: string; total: number }[] = [];
  assisters:   { player_name: string; type: string; total: number }[] = [];

  get isLiteMode(): boolean { return this.perf.isLiteMode; }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentService: TournamentService,
    private perf: PerformanceService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/equipes']); return; }
    this.tournamentService.getTeamDetail(id).subscribe({
      next: team => {
        this.team = team;
        this.goalScorers = team.scorers.filter(s => s.type === 'goal');
        this.assisters   = team.scorers.filter(s => s.type === 'assist');
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.error = true; this.cdr.detectChanges(); },
    });
  }

  getPhotoUrl(path: string | null): string | null {
    if (!path || this.brokenPhotos.has(path)) return null;
    return path;
  }

  onPhotoError(path: string | null): void {
    if (path) this.brokenPhotos.add(path);
    this.cdr.detectChanges();
  }

  getMatchResult(m: any): 'win' | 'loss' | 'draw' | 'upcoming' {
    if (m.status !== 'finished' || m.score1 === null) return 'upcoming';
    const isT1 = m.team1_name?.toLowerCase() === this.team?.name?.toLowerCase();
    const gf = isT1 ? m.score1 : m.score2;
    const ga = isT1 ? m.score2 : m.score1;
    if (gf > ga) return 'win';
    if (gf < ga) return 'loss';
    return 'draw';
  }

  getOpponent(m: any): string {
    const isT1 = m.team1_name?.toLowerCase() === this.team?.name?.toLowerCase();
    return isT1 ? m.team2_name : m.team1_name;
  }

  getScore(m: any): string {
    if (m.status !== 'finished' || m.score1 === null) return '— vs —';
    const isT1 = m.team1_name?.toLowerCase() === this.team?.name?.toLowerCase();
    return isT1 ? `${m.score1} — ${m.score2}` : `${m.score2} — ${m.score1}`;
  }

  trackByPlayerId(_: number, p: { id: number }): number { return p.id; }
  trackByMatchId(_: number, m: Match): number { return m.id; }
  trackByScorer(_: number, s: { player_name: string; type: string }): string { return s.player_name + s.type; }
}
