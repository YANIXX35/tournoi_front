import { Component, OnInit } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match } from '../../models/match.model';

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss'],
  standalone: false,
})
export class MatchesComponent implements OnInit {
  matches: Match[] = [];
  filteredMatches: Match[] = [];
  phases: string[] = [];
  selectedPhase = 'Tous';
  loading = true;

  constructor(private tournamentService: TournamentService) {}

  ngOnInit(): void {
    this.tournamentService.getMatches().subscribe({
      next: (data) => {
        this.matches = data;
        this.phases = ['Tous', ...new Set(data.map(m => m.phase))];
        this.filteredMatches = data;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  filterByPhase(phase: string): void {
    this.selectedPhase = phase;
    this.filteredMatches = phase === 'Tous'
      ? this.matches
      : this.matches.filter(m => m.phase === phase);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      upcoming: 'À venir',
      ongoing: 'En cours',
      finished: 'Terminé',
    };
    return labels[status] || status;
  }
}
