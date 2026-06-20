import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface MvpCandidate {
  player_id: number;
  player_name: string;
  team_name: string;
  role: string;
  photo_url: string | null;
  votes: number;
  percentage: number;
  is_mvp_winner?: boolean;
}

export interface MvpData {
  candidates: MvpCandidate[];
  total_votes: number;
  user_voted: boolean;
  user_vote: { player_name: string; team_name: string } | null;
}

const MVP_VOTE_KEY = 'mvp_vote_2026_r2';

@Component({
  selector: 'app-mvp',
  templateUrl: './mvp.component.html',
  styleUrls: ['./mvp.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MvpComponent implements OnInit, OnDestroy {
  data: MvpData | null = null;
  loading = true;
  error = false;
  voting = false;
  voteSuccess = false;

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly API = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load();
    this.pollInterval = setInterval(() => this.silentRefresh(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // ── LocalStorage : 1 vote par navigateur ──────────────────────────────────
  private getLocalVote(): { player_name: string; team_name: string } | null {
    try {
      const raw = localStorage.getItem(MVP_VOTE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private saveLocalVote(player_name: string, team_name: string): void {
    try {
      localStorage.setItem(MVP_VOTE_KEY, JSON.stringify({ player_name, team_name }));
    } catch {}
  }

  get alreadyVoted(): boolean {
    return !!(this.data?.user_voted || this.getLocalVote());
  }

  get myVote(): { player_name: string; team_name: string } | null {
    return this.data?.user_vote ?? this.getLocalVote();
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  load(): void {
    this.http.get<MvpData>(`${this.API}/mvp`).subscribe({
      next: data => {
        this.data = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.cdr.detectChanges();
      },
    });
  }

  silentRefresh(): void {
    this.http.get<MvpData>(`${this.API}/mvp`).subscribe({
      next: data => { this.data = data; this.cdr.detectChanges(); },
    });
  }

  // ── Vote ──────────────────────────────────────────────────────────────────
  vote(candidate: MvpCandidate): void {
    if (this.voting || this.alreadyVoted) return;
    this.voting = true;
    this.cdr.markForCheck();

    this.http.post<{ success: boolean }>(`${this.API}/mvp/vote`, {
      player_name: candidate.player_name,
      team_name:   candidate.team_name,
    }).subscribe({
      next: () => {
        this.saveLocalVote(candidate.player_name, candidate.team_name);
        this.voting = false;
        this.voteSuccess = true;
        this.silentRefresh();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.voting = false;
        if (err.status === 409) {
          // Déjà voté côté serveur — on sauvegarde quand même en local
          this.saveLocalVote(candidate.player_name, candidate.team_name);
        }
        this.silentRefresh();
        this.cdr.markForCheck();
      },
    });
  }

  onPhotoError(event: Event, c: MvpCandidate): void {
    (event.target as HTMLImageElement).style.display = 'none';
    c.photo_url = null;
  }

  isUserVote(c: MvpCandidate): boolean {
    const uv = this.myVote;
    if (!uv) return false;
    return uv.player_name.toLowerCase() === c.player_name.toLowerCase()
        && uv.team_name.toLowerCase()   === c.team_name.toLowerCase();
  }

  trackByCandidate(_: number, c: MvpCandidate): string {
    return c.player_name + c.team_name;
  }
}
