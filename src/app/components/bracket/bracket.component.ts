import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match } from '../../models/match.model';

interface BracketRound {
  phase: string;
  label: string;
  matches: Match[];
}

@Component({
  selector: 'app-bracket',
  templateUrl: './bracket.component.html',
  styleUrls: ['./bracket.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BracketComponent implements OnInit {
  rounds: BracketRound[] = [];
  loading = true;
  hasError = false;

  private readonly phaseOrder: Record<string, number> = {
    'Tour 1':      1,
    'Tour 2':      2,
    'Demi-finale': 3,
    'Finale':      4,
  };

  private readonly phaseLabels: Record<string, string> = {
    'Tour 1':      '1er Tour',
    'Tour 2':      '2e Tour',
    'Demi-finale': 'Demi-finales',
    'Finale':      'Finale 🏆',
  };

  constructor(
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.tournamentService.getMatches().subscribe({
      next: matches => {
        this.buildBracket(matches);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasError = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private buildBracket(matches: Match[]): void {
    const grouped = new Map<string, Match[]>();
    for (const match of matches) {
      const phase = match.phase;
      if (!grouped.has(phase)) grouped.set(phase, []);
      grouped.get(phase)!.push(match);
    }
    this.rounds = Array.from(grouped.entries())
      .sort(([a], [b]) => (this.phaseOrder[a] ?? 99) - (this.phaseOrder[b] ?? 99))
      .map(([phase, phaseMatches]) => ({
        phase,
        label: this.phaseLabels[phase] ?? phase,
        matches: phaseMatches.slice().sort((a, b) =>
          (a.match_number ?? 999) - (b.match_number ?? 999)
        ),
      }));
  }

  getWinner(match: Match): 'team1' | 'team2' | null {
    if (match.status !== 'finished' || match.score1 === null || match.score2 === null) return null;
    if (match.score1 > match.score2) return 'team1';
    if (match.score2 > match.score1) return 'team2';
    return null;
  }

  finishedCount(round: BracketRound): number {
    return round.matches.filter(m => m.status === 'finished').length;
  }

  trackByPhase(_: number, r: BracketRound): string { return r.phase; }
  trackByMatchId(_: number, m: Match): number { return m.id; }
}
