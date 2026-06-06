import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
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
export class AdminDashboardComponent implements OnInit, OnDestroy {
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

  // Licences — filtre par équipe + aperçu modal
  licenceTeamFilter = 'all';
  showLicencePreview = false;
  exportPreviewOpen = false;

  // Photos — suivi des URLs cassées pour afficher le placeholder à la place
  private brokenPhotos = new Set<string>();

  // Licences — CRUD joueurs
  editingPlayer: { id: number; name: string; photo_path: string | null; teamId: number } | null = null;
  editPlayerPhotoPreview: string | null = null;
  editPlayerNewPhotoPath: string | undefined = undefined;
  addingPlayerTeamId: number | null = null;
  newPlayerName = '';
  newPlayerPhotoPath: string | null = null;
  newPlayerPhotoPreview: string | null = null;
  uploadingPhoto = false;

  // Recherche matchs
  matchSearchQuery = '';

  // Pagination équipes
  teamsPage = 1;
  readonly teamsPageSize = 10;

  private refreshInterval: ReturnType<typeof setInterval> | null = null;

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
    // Rafraîchit le token toutes les 2h si la session est encore valide
    this.refreshInterval = setInterval(() => {
      if (this.auth.isLoggedIn()) {
        this.auth.refresh().subscribe({ error: () => {} });
      }
    }, 2 * 60 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  loadTeams(): void {
    this.adminService.getTeams().subscribe({
      next: d => this.ngZone.run(() => { this.teams = d; this.teamsPage = 1; this.cdr.detectChanges(); }),
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
      this.editingPlayer = null;
      this.addingPlayerTeamId = null;
      this.newPlayerName = '';
      this.newPlayerPhotoPath = null;
      this.newPlayerPhotoPreview = null;
      this.editPlayerPhotoPreview = null;
      this.editPlayerNewPhotoPath = undefined;
      this.cdr.detectChanges();
    });
  }

  // ── Recherche matchs ───────────────────────────────────
  get filteredMatches(): Match[] {
    const q = this.matchSearchQuery.trim().toLowerCase();
    if (!q) return this.matches;
    return this.matches.filter(m =>
      m.team1_name?.toLowerCase().includes(q) ||
      m.team2_name?.toLowerCase().includes(q)
    );
  }

  // ── Pagination équipes ─────────────────────────────────
  get teamsTotalPages(): number {
    return Math.max(1, Math.ceil(this.teams.length / this.teamsPageSize));
  }

  get pagedTeams(): Team[] {
    const start = (this.teamsPage - 1) * this.teamsPageSize;
    return this.teams.slice(start, start + this.teamsPageSize);
  }

  prevTeamsPage(): void { if (this.teamsPage > 1) this.teamsPage--; }
  nextTeamsPage(): void { if (this.teamsPage < this.teamsTotalPages) this.teamsPage++; }

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

  get filteredPlayersCount(): number {
    return this.filteredTeamsForLicences.reduce((acc, t) => acc + (t.players?.length ?? 0), 0);
  }

  // ── Licences ───────────────────────────────────────────
  get filteredTeamsForLicences(): Team[] {
    if (this.licenceTeamFilter === 'all') return this.teams;
    return this.teams.filter(t => t.id === Number(this.licenceTeamFilter));
  }

  getPhotoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (this.brokenPhotos.has(path)) return null;
    if (path.startsWith('data:')) return path;
    return `${this.UPLOADS}/${path}`;
  }

  onPhotoError(path: string | null | undefined): void {
    if (!path) return;
    this.ngZone.run(() => {
      this.brokenPhotos.add(path);
      this.cdr.detectChanges();
    });
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
      }),
      error: (err) => this.ngZone.run(() => {
        const msg = err?.error?.error || 'Erreur lors de la création';
        this.flash(msg);
        this.cdr.detectChanges();
      }),
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

  // ── Joueurs CRUD ───────────────────────────────────────
  startEditPlayer(player: AdminPlayer, teamId: number): void {
    this.ngZone.run(() => {
      this.editingPlayer = { id: player.id, name: player.player_name, photo_path: player.photo_path, teamId };
      this.editPlayerPhotoPreview = null;
      this.editPlayerNewPhotoPath = undefined;
      this.addingPlayerTeamId = null;
      this.newPlayerName = '';
      this.newPlayerPhotoPath = null;
      this.newPlayerPhotoPreview = null;
      this.cdr.detectChanges();
    });
  }

  cancelEditPlayer(): void {
    this.ngZone.run(() => {
      this.editingPlayer = null;
      this.editPlayerPhotoPreview = null;
      this.editPlayerNewPhotoPath = undefined;
      this.cdr.detectChanges();
    });
  }

  saveEditPlayer(): void {
    if (!this.editingPlayer) return;
    const name = this.editingPlayer.name.trim();
    if (!name) { this.flash('Nom requis'); return; }
    const photoPath = this.editPlayerNewPhotoPath !== undefined
      ? this.editPlayerNewPhotoPath
      : this.editingPlayer.photo_path ?? undefined;
    this.adminService.updatePlayer(this.editingPlayer.id, name, photoPath).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadTeams();
        this.editingPlayer = null;
        this.editPlayerPhotoPreview = null;
        this.editPlayerNewPhotoPath = undefined;
        this.flash('Joueur mis à jour ✓');
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => { this.flash('Erreur lors de la mise à jour'); this.cdr.detectChanges(); }),
    });
  }

  confirmDeletePlayer(playerId: number): void {
    if (!confirm('Supprimer ce joueur définitivement ?')) return;
    this.adminService.deletePlayer(playerId).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadTeams();
        this.flash('Joueur supprimé ✓');
      }),
      error: () => this.ngZone.run(() => { this.flash('Erreur lors de la suppression'); }),
    });
  }

  startAddPlayer(teamId: number): void {
    this.ngZone.run(() => {
      this.addingPlayerTeamId = teamId;
      this.newPlayerName = '';
      this.newPlayerPhotoPath = null;
      this.newPlayerPhotoPreview = null;
      this.editingPlayer = null;
      this.editPlayerPhotoPreview = null;
      this.editPlayerNewPhotoPath = undefined;
      this.cdr.detectChanges();
    });
  }

  cancelAddPlayer(): void {
    this.ngZone.run(() => {
      this.addingPlayerTeamId = null;
      this.newPlayerName = '';
      this.newPlayerPhotoPath = null;
      this.newPlayerPhotoPreview = null;
      this.cdr.detectChanges();
    });
  }

  saveAddPlayer(teamId: number): void {
    const name = this.newPlayerName.trim();
    if (!name) { this.flash('Nom requis'); return; }
    this.adminService.addPlayer(teamId, name, this.newPlayerPhotoPath).subscribe({
      next: () => this.ngZone.run(() => {
        this.loadTeams();
        this.addingPlayerTeamId = null;
        this.newPlayerName = '';
        this.newPlayerPhotoPath = null;
        this.newPlayerPhotoPreview = null;
        this.flash('Joueur ajouté ✓');
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => { this.flash('Erreur lors de l\'ajout'); this.cdr.detectChanges(); }),
    });
  }

  onEditPlayerPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.ngZone.run(() => {
      this.editPlayerPhotoPreview = e.target?.result as string;
      this.cdr.detectChanges();
    });
    reader.readAsDataURL(file);
    this.uploadingPhoto = true;
    this.cdr.detectChanges();
    this.adminService.uploadPlayerPhoto(file).subscribe({
      next: res => this.ngZone.run(() => {
        this.editPlayerNewPhotoPath = res.photo_path;
        this.uploadingPhoto = false;
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => {
        this.flash('Erreur upload photo');
        this.uploadingPhoto = false;
        this.cdr.detectChanges();
      }),
    });
  }

  onNewPlayerPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.ngZone.run(() => {
      this.newPlayerPhotoPreview = e.target?.result as string;
      this.cdr.detectChanges();
    });
    reader.readAsDataURL(file);
    this.uploadingPhoto = true;
    this.cdr.detectChanges();
    this.adminService.uploadPlayerPhoto(file).subscribe({
      next: res => this.ngZone.run(() => {
        this.newPlayerPhotoPath = res.photo_path;
        this.uploadingPhoto = false;
        this.cdr.detectChanges();
      }),
      error: () => this.ngZone.run(() => {
        this.flash('Erreur upload photo');
        this.uploadingPhoto = false;
        this.cdr.detectChanges();
      }),
    });
  }

  // ── Prévisualisation export ────────────────────────────
  openExportPreview(): void {
    this.ngZone.run(() => { this.exportPreviewOpen = true; this.cdr.detectChanges(); });
  }

  closeExportPreview(): void {
    this.ngZone.run(() => { this.exportPreviewOpen = false; this.cdr.detectChanges(); });
  }

  openLicencePdfPreview(): void {
    this.ngZone.run(() => {
      this.exportPreviewOpen = false;
      this.showLicencePreview = true;
      this.cdr.detectChanges();
    });
  }

  // ── Exports Licences ───────────────────────────────────
  exportLicencesExcel(): void {
    const rows: any[][] = [
      ['#', 'Équipe', 'Statut équipe', 'Joueur', 'Capitaine'],
    ];
    let n = 1;
    this.filteredTeamsForLicences.forEach(team => {
      team.players.forEach(player => {
        rows.push([
          n++,
          team.name,
          team.validated ? 'Validée' : 'En attente',
          player.player_name,
          this.isCapitaine(team, player.player_name) ? 'Capitaine' : '',
        ]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Licences');
    XLSX.writeFile(wb, 'licences-tournoi-fju-2026.xlsx');
    this.flash('Export Excel licences téléchargé ✓');
  }

  exportLicencesCsv(): void {
    const BOM = '﻿';
    const header = ['#', 'Equipe', 'Statut equipe', 'Joueur', 'Capitaine'];
    const rows: string[][] = [];
    let n = 1;
    this.filteredTeamsForLicences.forEach(team => {
      team.players.forEach(player => {
        rows.push([
          String(n++),
          team.name,
          team.validated ? 'Validee' : 'En attente',
          player.player_name,
          this.isCapitaine(team, player.player_name) ? 'Capitaine' : '',
        ]);
      });
    });
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    this._download(blob, 'licences-tournoi-fju-2026.csv');
    this.flash('CSV licences téléchargé ✓');
  }

  exportLicencesPdf(): void {
    this.ngZone.run(() => {
      this.showLicencePreview = true;
      this.cdr.detectChanges();
    });
  }

  closeLicencePreview(): void {
    this.ngZone.run(() => {
      this.showLicencePreview = false;
      this.cdr.detectChanges();
    });
  }

  printLicences(): void {
    setTimeout(() => window.print(), 200);
  }

  // ── Exports Équipes ────────────────────────────────────
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

  exportCsv(): void {
    const BOM = '﻿';
    const header = ['#', 'Equipe', 'Capitaine', 'Telephone', 'Statut', 'Joueurs', 'Date inscription'];
    const rows = this.teams.map((t, i) => [
      String(i + 1),
      t.name,
      t.captain_name,
      t.phone,
      t.validated ? 'Validee' : 'En attente',
      t.players.map(p => p.player_name).join(' / '),
      t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '',
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    this._download(blob, 'equipes-tournoi-fju-2026.csv');
    this.flash('CSV téléchargé ✓ (ouvre dans Excel)');
  }

  async exportPdf(): Promise<void> {
    this.flash('Génération PDF...');
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const W = 210;
    const M = 14;
    let y = 18;

    // Titre
    doc.setFontSize(16);
    doc.setTextColor(26, 71, 42);
    doc.text('Tournoi FJU — Côte d\'Ivoire 2026', M, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Liste des équipes  ·  ${this.teams.length} équipe(s)  ·  Exporté le ${new Date().toLocaleDateString('fr-FR')}`,
      M, y
    );
    y += 8;

    this.teams.forEach((team, idx) => {
      if (y > 262) { doc.addPage(); y = 18; }

      // En-tête équipe (fond vert)
      doc.setFillColor(26, 71, 42);
      doc.rect(M, y, W - 2 * M, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      const teamLabel = `${idx + 1}. ${team.name}`;
      doc.text(teamLabel, M + 2.5, y + 5);
      const statusTxt = team.validated ? 'Validée ✓' : 'En attente';
      doc.setFontSize(8);
      doc.text(statusTxt, W - M - 2.5 - doc.getTextWidth(statusTxt), y + 5);
      y += 8;

      // Méta (fond gris clair)
      doc.setFillColor(245, 245, 245);
      doc.rect(M, y, W - 2 * M, 5.5, 'F');
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(8);
      doc.text(`Capitaine : ${team.captain_name}   |   Tél : ${team.phone}`, M + 2.5, y + 3.8);
      y += 6;

      // Joueurs
      team.players.forEach((player, pi) => {
        if (y > 274) { doc.addPage(); y = 18; }
        doc.setFillColor(pi % 2 === 0 ? 255 : 248, pi % 2 === 0 ? 255 : 248, pi % 2 === 0 ? 255 : 248);
        doc.setDrawColor(220, 220, 220);
        doc.rect(M, y, W - 2 * M, 5, 'FD');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(8);
        doc.text(String(pi + 1), M + 3, y + 3.5);
        doc.setTextColor(40, 40, 40);
        doc.text(player.player_name, M + 11, y + 3.5);
        y += 5;
      });
      y += 5;
    });

    doc.save('equipes-tournoi-fju-2026.pdf');
    this.flash('PDF téléchargé ✓');
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
