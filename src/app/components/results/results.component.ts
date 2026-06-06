import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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

  constructor(
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.hasError = false;
    this.tournamentService.getResults().pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe(data => {
      this.ngZone.run(() => {
        this.loading = false;
        if (!data) { this.hasError = true; this.cdr.detectChanges(); return; }
        this.finishedMatches = data.finished_matches;
        this.standings = data.standings;
        this.cdr.detectChanges();
      });
    });
  }

  getGoalDiff(s: Standing): string {
    const diff = s.goals_for - s.goals_against;
    return diff > 0 ? `+${diff}` : `${diff}`;
  }
}
