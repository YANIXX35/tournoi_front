import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface MvpCandidate {
  player_name: string;
  team_name: string;
  goals: number;
  votes: number;
  percentage: number;
}

export interface MvpData {
  candidates: MvpCandidate[];
  total_votes: number;
  user_voted: boolean;
  user_vote: { player_name: string; team_name: string } | null;
}

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

  vote(candidate: MvpCandidate): void {
    if (this.voting || this.data?.user_voted) return;
    this.voting = true;
    this.cdr.markForCheck();

    this.http.post<{ success: boolean }>(`${this.API}/mvp/vote`, {
      player_name: candidate.player_name,
      team_name:   candidate.team_name,
    }).subscribe({
      next: () => {
        this.voting = false;
        this.voteSuccess = true;
        this.silentRefresh();
        this.cdr.markForCheck();
      },
      error: () => {
        this.voting = false;
        this.silentRefresh();
        this.cdr.markForCheck();
      },
    });
  }

  isUserVote(c: MvpCandidate): boolean {
    const uv = this.data?.user_vote;
    if (!uv) return false;
    return uv.player_name.toLowerCase() === c.player_name.toLowerCase()
        && uv.team_name.toLowerCase()   === c.team_name.toLowerCase();
  }

  trackByCandidate(_: number, c: MvpCandidate): string {
    return c.player_name + c.team_name;
  }
}
