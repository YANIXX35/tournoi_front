import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { TopScorer } from '../../models/match.model';

@Component({
  selector: 'app-buteurs',
  templateUrl: './buteurs.component.html',
  styleUrls: ['./buteurs.component.scss'],
  standalone: false,
})
export class ButeursComponent implements OnInit {
  scorers: TopScorer[] = [];
  assisters: TopScorer[] = [];
  tab: 'goal' | 'assist' = 'goal';
  loading = true;
  error = false;

  constructor(private tournamentService: TournamentService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.tournamentService.getTopScorers().subscribe({
      next: data => {
        this.scorers = data.scorers;
        this.assisters = data.assisters;
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

  get list(): TopScorer[] {
    return this.tab === 'goal' ? this.scorers : this.assisters;
  }
}
