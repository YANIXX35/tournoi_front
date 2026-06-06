import { Component, OnInit } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match, Standing } from '../../models/match.model';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
  hasError = false;

  constructor(private tournamentService: TournamentService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.hasError = false;
    this.tournamentService.getResults().pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe(data => {
      this.loading = false;
      if (!data) { this.hasError = true; return; }
      this.finishedMatches = data.finished_matches;
      this.standings = data.standings;
    });
  }

  getGoalDiff(s: Standing): string {
    const diff = s.goals_for - s.goals_against;
    return diff > 0 ? `+${diff}` : `${diff}`;
  }
}
