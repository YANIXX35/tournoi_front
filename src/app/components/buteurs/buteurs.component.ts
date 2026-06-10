import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { TopScorer } from '../../models/match.model';

@Component({
  selector: 'app-buteurs',
  templateUrl: './buteurs.component.html',
  styleUrls: ['./buteurs.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButeursComponent implements OnInit {
  scorers: TopScorer[] = [];
  assisters: TopScorer[] = [];
  tab: 'goal' | 'assist' = 'goal';
  list: TopScorer[] = [];
  loading = true;
  error = false;

  constructor(private tournamentService: TournamentService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.tournamentService.getTopScorers().subscribe({
      next: data => {
        this.scorers = data.scorers;
        this.assisters = data.assisters;
        this.list = this.tab === 'goal' ? this.scorers : this.assisters;
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

  setTab(tab: 'goal' | 'assist'): void {
    this.tab = tab;
    this.list = tab === 'goal' ? this.scorers : this.assisters;
    this.cdr.markForCheck();
  }

  trackByScorer(_: number, s: TopScorer): string { return s.player_name + s.team_name; }
}
