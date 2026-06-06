import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Team } from '../../models/team.model';
import { Match } from '../../models/match.model';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: false,
})
export class AdminDashboardComponent implements OnInit {
  teams: Team[] = [];
  matches: Match[] = [];
  activeSection: 'overview' | 'teams' | 'matches' | 'results' = 'overview';
  sidebarOpen = false;

  // Matchs — création / édition complète
  editingMatch: Match | null = null;
  newMatch: Partial<Match> = {};
  showNewMatchForm = false;

  // Résultats — saisie rapide du score
  scoringMatch: Match | null = null;
  scoreInput: { score1: number; score2: number } = { score1: 0, score2: 0 };

  phases = ['Poule', 'Quarts de finale', 'Demi-finale', 'Finale'];
  saveSuccess = '';
  today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  constructor(
    private adminService: AdminService,
    private tournamentService: TournamentService,
    public auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadTeams();
    this.loadMatches();
  }

  loadTeams(): void {
    this.adminService.getTeams().subscribe({
      next: d => this.ngZone.run(() => { this.teams = d; this.cdr.detectChanges(); }),
      error: () => this.ngZone.run(() => { this.flash('Erreur chargement équipes'); this.cdr.detectChanges(); }),
    });
  }

  loadMatches(): void {
    this.tournamentService.getMatches().subscribe({
      next: d => this.ngZone.run(() => { this.matches = d; this.cdr.detectChanges(); }),
      error: () => this.ngZone.run(() => { this.flash('Erreur chargement matchs'); this.cdr.detectChanges(); }),
    });
  }

  setSection(section: 'overview' | 'teams' | 'matches' | 'results'): void {
    this.ngZone.run(() => {
      this.activeSection = section;
      this.sidebarOpen = false;
      this.scoringMatch = null;
      this.editingMatch = null;
      this.cdr.detectChanges();
    });
  }

  // ── Stats ──────────────────────────────────────────────
  get totalTeams(): number { return this.teams.length; }
  get pendingTeams(): number { return this.teams.filter(t => !t.validated).length; }
  get validatedTeams(): number { return this.teams.filter(t => t.validated).length; }
  get totalMatches(): number { return this.matches.length; }
  get finishedMatches(): number { return this.matches.filter(m => m.status === 'finished').length; }
  get upcomingMatches(): number { return this.matches.filter(m => m.status === 'upcoming').length; }

  // ── Équipes CRUD ───────────────────────────────────────
  validateTeam(team: Team, validated: boolean): void {
    this.adminService.validateTeam(team.id, validated).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadTeams();
        this.flash(validated ? 'Équipe validée ✓' : 'Équipe rejetée');
      })
    });
  }

  deleteTeam(id: number): void {
    if (!confirm('Supprimer cette équipe définitivement ?')) return;
    this.adminService.deleteTeam(id).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadTeams();
        this.flash('Équipe supprimée');
      })
    });
  }

  // ── Matchs CRUD ────────────────────────────────────────
  createMatch(): void {
    if (!this.newMatch.team1_name || !this.newMatch.team2_name) return;
    this.adminService.createMatch(this.newMatch).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadMatches();
        this.newMatch = {};
        this.showNewMatchForm = false;
        this.flash('Match créé ✓');
        this.cdr.detectChanges();
      })
    });
  }

  startEdit(match: Match): void {
    this.ngZone.run(() => {
      this.editingMatch = { ...match };
      this.cdr.detectChanges();
    });
  }

  cancelEdit(): void {
    this.ngZone.run(() => {
      this.editingMatch = null;
      this.cdr.detectChanges();
    });
  }

  saveMatch(): void {
    if (!this.editingMatch) return;
    this.adminService.updateMatch(this.editingMatch.id, this.editingMatch).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadMatches();
        this.editingMatch = null;
        this.flash('Match mis à jour ✓');
        this.cdr.detectChanges();
      })
    });
  }

  deleteMatch(id: number): void {
    if (!confirm('Supprimer ce match ?')) return;
    this.adminService.deleteMatch(id).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadMatches();
        this.flash('Match supprimé');
      })
    });
  }

  // ── Saisie rapide du score (section Résultats) ──────────
  openScore(match: Match): void {
    this.ngZone.run(() => {
      this.scoringMatch = match;
      this.scoreInput = {
        score1: match.score1 ?? 0,
        score2: match.score2 ?? 0,
      };
      this.cdr.detectChanges();
    });
  }

  cancelScore(): void {
    this.ngZone.run(() => {
      this.scoringMatch = null;
      this.cdr.detectChanges();
    });
  }

  saveScore(): void {
    if (!this.scoringMatch) return;
    const payload = {
      ...this.scoringMatch,
      score1: Number(this.scoreInput.score1),
      score2: Number(this.scoreInput.score2),
      status: 'finished',
    };
    this.adminService.updateMatch(this.scoringMatch.id, payload).subscribe({
      next: () => this.ngZone.run(() => {
        this.scoringMatch = null;
        this.loadMatches();
        this.flash('Score enregistré ✓');
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => {
        this.flash('Erreur lors de la sauvegarde');
        this.cdr.detectChanges();
      }),
    });
  }

  // ── Utilitaires ────────────────────────────────────────
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }

  private flash(msg: string): void {
    this.saveSuccess = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.ngZone.run(() => {
        this.saveSuccess = '';
        this.cdr.detectChanges();
      });
    }, 3000);
  }

  getStatusLabel(s: string): string {
    return s === 'upcoming' ? 'À venir' : s === 'ongoing' ? 'En cours' : 'Terminé';
  }

  getPhaseColor(phase: string): string {
    const map: Record<string, string> = {
      'Poule': '#2196f3', 'Quarts de finale': '#ff9800',
      'Demi-finale': '#9c27b0', 'Finale': '#f44336',
    };
    return map[phase] || '#888';
  }

  getSectionTitle(): string {
    const map: Record<string, string> = {
      overview: "Vue d'ensemble",
      teams: 'Gestion des équipes',
      matches: 'Gestion des matchs',
      results: 'Saisie des résultats',
    };
    return map[this.activeSection] || '';
  }
}
