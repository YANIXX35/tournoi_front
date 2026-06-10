import { Component, OnInit, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { TournamentService } from '../../services/tournament.service';
import { Match } from '../../models/match.model';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  trackByMatchId(_: number, m: Match): number { return m.id; }
  trackByPhase(_: number, phase: string): string { return phase; }

  exportPdf(): void {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();

      doc.setFillColor(13, 27, 42);
      doc.rect(0, 0, w, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Programme des Matchs', w / 2, 12, { align: 'center' });
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text("Tournoi de Football de l'Étoile Universelle de Grand Bassam 2026", w / 2, 20, { align: 'center' });

      let y = 36;
      const matches = this.selectedPhase === 'Tous' ? this.matches : this.filteredMatches;

      matches.forEach((m, i) => {
        if (y > 270) { doc.addPage(); y = 15; }
        const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(10, y - 4, w - 20, 12, 'F');

        doc.setTextColor(26, 71, 42); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.text(m.phase, 13, y + 1);

        doc.setTextColor(30, 30, 30); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        const matchStr = `${m.team1_name}  vs  ${m.team2_name}`;
        doc.text(matchStr, w / 2, y + 2, { align: 'center' });

        if (m.status === 'finished' && m.score1 !== null) {
          doc.setTextColor(26, 71, 42);
          doc.text(`${m.score1} — ${m.score2}`, w - 40, y + 2, { align: 'center' });
        }

        doc.setTextColor(120, 120, 120); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        const dateStr = m.match_date ? m.match_date + (m.match_time ? '  ' + m.match_time.slice(0,5) : '') : '';
        doc.text(dateStr, 13, y + 6);

        const statusLabel = this.getStatusLabel(m.status);
        doc.text(statusLabel, w - 13, y + 6, { align: 'right' });

        y += 14;
      });

      doc.setTextColor(150, 150, 150); doc.setFontSize(7);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, w / 2, 288, { align: 'center' });

      doc.save('programme-matchs-etoiles-universelle-2026.pdf');
    });
  }
}
