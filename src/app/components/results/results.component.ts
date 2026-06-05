import { Component, OnInit } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match, Standing } from '../../models/match.model';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss'],
  standalone: false,
})
export class ResultsComponent implements OnInit {
  finishedMatches: Match[] = [];
  standings: Standing[] = [];
  loading = true;

  constructor(private tournamentService: TournamentService) {}

  ngOnInit(): void {
    this.tournamentService.getResults().subscribe({
      next: (data) => {
        this.finishedMatches = data.finished_matches;
        this.standings = data.standings;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getGoalDiff(s: Standing): string {
    const diff = s.goals_for - s.goals_against;
    return diff > 0 ? `+${diff}` : `${diff}`;
  }
}
