import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { TournamentService } from '../../services/tournament.service';
import { AuthService } from '../../services/auth.service';
import { Team, AdminPlayer } from '../../models/team.model';
import { Match } from '../../models/match.model';
import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: false,
})
export class AdminDashboardComponent implements OnInit {
  teams: Team[] = [];
  matches: Match[] = [];
  activeSection: 'overview' | 'teams' | 'matches' | 'results' | 'licences' = 'overview';
  sidebarOpen = false;

  // Matchs — création / édition complète
  editingMatch: Match | null = null;
  newMatch: Partial<Match> = {};
  showNewMatchForm = false;

  // Résultats — saisie rapide du score
  scoringMatch: Match | null = null;
  scoreInput: { score1: number; score2: number } = { score1: 0, score2: 0 };

  // Licences — filtre par équipe
  licenceTeamFilter = 'all';

  phases = ['Poule', 'Quarts de finale', 'Demi-finale', 'Finale'];
  saveSuccess = '';
  today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  private readonly UPLOADS = `${environment.apiUrl}/uploads`;

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

  setSection(section: 'overview' | 'teams' | 'matches' | 'results' | 'licences'): void {
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

  get totalPlayers(): number {
    return this.teams.reduce((acc, t) => acc + (t.players?.length ?? 0), 0);
  }

  // ── Licences ───────────────────────────────────────────
  get filteredTeamsForLicences(): Team[] {
    if (this.licenceTeamFilter === 'all') return this.teams;
    return this.teams.filter(t => t.id === Number(this.licenceTeamFilter));
  }

  getPhotoUrl(path: string | null | undefined): string | null {
    return path ? `${this.UPLOADS}/${path}` : null;
  }

  isCapitaine(team: Team, playerName: string): boolean {
    return team.captain_name?.trim().toLowerCase() === playerName?.trim().toLowerCase();
  }

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
    this.ngZone.run(() => { this.editingMatch = { ...match }; this.cdr.detectChanges(); });
  }

  cancelEdit(): void {
    this.ngZone.run(() => { this.editingMatch = null; this.cdr.detectChanges(); });
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
      next: () => this.ngZone.run(() => { this.loadMatches(); this.flash('Match supprimé'); })
    });
  }

  // ── Saisie rapide du score ──────────────────────────────
  openScore(match: Match): void {
    this.ngZone.run(() => {
      this.scoringMatch = match;
      this.scoreInput = { score1: match.score1 ?? 0, score2: match.score2 ?? 0 };
      this.cdr.detectChanges();
    });
  }

  cancelScore(): void {
    this.ngZone.run(() => { this.scoringMatch = null; this.cdr.detectChanges(); });
  }

  saveScore(): void {
    if (!this.scoringMatch) return;
    const payload: Partial<Match> = {
      ...this.scoringMatch,
      score1: Number(this.scoreInput.score1),
      score2: Number(this.scoreInput.score2),
      status: 'finished' as const,
    };
    this.adminService.updateMatch(this.scoringMatch.id, payload).subscribe({
      next: () => this.ngZone.run(() => {
        this.scoringMatch = null;
        this.loadMatches();
        this.flash('Score enregistré ✓');
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => { this.flash('Erreur sauvegarde'); this.cdr.detectChanges(); }),
    });
  }

  // ── Exports ────────────────────────────────────────────
  exportExcel(): void {
    const rows: any[][] = [
      ['#', 'Équipe', 'Capitaine', 'Téléphone', 'Statut', 'Joueurs', 'Date inscription'],
    ];
    this.teams.forEach((team, idx) => {
      rows.push([
        idx + 1,
        team.name,
        team.captain_name,
        team.phone,
        team.validated ? 'Validée' : 'En attente',
        team.players.map(p => p.player_name).join(', '),
        team.created_at ? new Date(team.created_at).toLocaleDateString('fr-FR') : '',
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 4 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 60 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Équipes');
    XLSX.writeFile(wb, 'equipes-tournoi-fju-2026.xlsx');
    this.flash('Export Excel téléchargé ✓');
  }

  exportWord(): void {
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    let body = '';
    this.teams.forEach((team, idx) => {
      const players = team.players.map((p, i) =>
        `<tr><td style="padding:4px 8px;border:1px solid #ddd">${i + 1}</td><td style="padding:4px 8px;border:1px solid #ddd">${p.player_name}</td></tr>`
      ).join('');
      body += `
        <div style="margin-bottom:28px;page-break-inside:avoid">
          <h3 style="background:#1a472a;color:white;padding:6px 12px;margin:0 0 4px;font-size:13pt">
            ${idx + 1}. ${team.name}
          </h3>
          <p style="margin:2px 0 6px;font-size:10pt;color:#555">
            Capitaine : <b>${team.captain_name}</b> &nbsp;|&nbsp; Tél : ${team.phone} &nbsp;|&nbsp;
            Statut : <b style="color:${team.validated ? '#2e7d32' : '#e65100'}">${team.validated ? 'Validée' : 'En attente'}</b>
          </p>
          <table style="border-collapse:collapse;width:100%;font-size:10pt">
            <thead><tr>
              <th style="padding:4px 8px;border:1px solid #ddd;background:#f5f5f5;width:40px">#</th>
              <th style="padding:4px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:left">Joueur</th>
            </tr></thead>
            <tbody>${players}</tbody>
          </table>
        </div>`;
    });
    const html = `
      <html><head><meta charset="utf-8">
      <style>body{font-family:Arial,sans-serif;margin:2cm;font-size:11pt}h1{color:#1a472a}h2{color:#555;font-size:11pt;font-weight:normal}</style>
      </head><body>
      <h1>Liste des équipes — Tournoi FJU Côte d'Ivoire 2026</h1>
      <h2>Exporté le ${date} &nbsp;·&nbsp; ${this.teams.length} équipe(s)</h2>
      <hr style="border-color:#1a472a;margin:12px 0 20px">
      ${body}
      </body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    this._download(blob, 'equipes-tournoi-fju-2026.doc');
    this.flash('Export Word téléchargé ✓');
  }

  exportPdf(): void {
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    let body = '';
    this.teams.forEach((team, idx) => {
      const players = team.players.map((p, i) =>
        `<tr><td>${i + 1}</td><td>${p.player_name}</td></tr>`
      ).join('');
      body += `
        <div class="team-block">
          <div class="team-head">${idx + 1}. ${team.name}
            <span class="tag ${team.validated ? 'tag-ok' : 'tag-wait'}">${team.validated ? 'Validée' : 'En attente'}</span>
          </div>
          <div class="team-meta">Capitaine : <b>${team.captain_name}</b> &nbsp;·&nbsp; Tél : ${team.phone}</div>
          <table><thead><tr><th>#</th><th>Joueur</th></tr></thead><tbody>${players}</tbody></table>
        </div>`;
    });
    const win = window.open('', '_blank', 'width=850,height=1100');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>Équipes — Tournoi FJU 2026</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10pt;color:#333;padding:1.5cm}
        h1{color:#1a472a;font-size:16pt;margin-bottom:4px}
        .sub{color:#777;font-size:9pt;margin-bottom:16px}
        .team-block{margin-bottom:20px;page-break-inside:avoid}
        .team-head{background:#1a472a;color:white;padding:5px 10px;font-size:11pt;font-weight:bold;display:flex;justify-content:space-between;align-items:center}
        .team-meta{padding:3px 10px;background:#f5f5f5;font-size:9pt;color:#555}
        table{width:100%;border-collapse:collapse;margin-top:2px}
        th{background:#eee;padding:3px 8px;text-align:left;font-size:9pt;border:1px solid #ddd}
        td{padding:3px 8px;border:1px solid #ddd;font-size:9pt}
        .tag{font-size:8pt;padding:2px 8px;border-radius:20px;font-weight:normal}
        .tag-ok{background:#e8f5e9;color:#2e7d32}
        .tag-wait{background:#fff3e0;color:#e65100}
        @media print{body{padding:0.8cm}.team-block{page-break-inside:avoid}}
      </style></head><body>
      <h1>Tournoi FJU — Côte d'Ivoire 2026</h1>
      <div class="sub">Liste des équipes · Exporté le ${date} · ${this.teams.length} équipe(s)</div>
      ${body}
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`);
    win.document.close();
    this.flash('Fenêtre PDF ouverte ✓');
  }

  private _download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
      this.ngZone.run(() => { this.saveSuccess = ''; this.cdr.detectChanges(); });
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
      licences: 'Licences joueurs',
    };
    return map[this.activeSection] || '';
  }
}
