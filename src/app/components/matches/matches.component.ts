import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match } from '../../models/match.model';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
    this.tournamentService.getMatches().pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe(data => {
      this.ngZone.run(() => {
        this.loading = false;
        if (!data) { this.hasError = true; this.cdr.detectChanges(); return; }
        this.matches = data;
        this.phases = ['Tous', ...new Set(data.map((m: Match) => m.phase))];
        this.filteredMatches = data;
        this.cdr.detectChanges();
      });
    });
  }

  filterByPhase(phase: string): void {
    this.selectedPhase = phase;
    this.filteredMatches = phase === 'Tous' ? this.matches : this.matches.filter(m => m.phase === phase);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = { upcoming: 'À venir', ongoing: 'En cours', finished: 'Terminé' };
    return labels[status] || status;
  }
}
