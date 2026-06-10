import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { TopScorer, Announcement } from '../../models/match.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  private tournamentDate = new Date('2026-06-13T09:00:00');
  private timer: any;

  scorers: TopScorer[] = [];
  assisters: TopScorer[] = [];
  scorerTab: 'goal' | 'assist' = 'goal';
  announcements: Announcement[] = [];
  dismissedAnnouncements = new Set<number>();
  visibleAnnouncements: Announcement[] = [];
  hasStats = false;
  displayList: TopScorer[] = [];

  constructor(
    private router: Router,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.updateCountdown();
    // Hors zone Angular : le setInterval ne declenche plus un cycle CD complet
    // toutes les secondes sur l'arbre entier
    this.ngZone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        this.updateCountdown();
        this.cdr.detectChanges();
      }, 1000);
    });
    this.loadTopScorers();
    this.loadAnnouncements();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private updateCountdown(): void {
    const now = new Date().getTime();
    const distance = this.tournamentDate.getTime() - now;
    if (distance <= 0) {
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }
    this.countdown = {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((distance % (1000 * 60)) / 1000),
    };
  }

  loadTopScorers(): void {
    this.tournamentService.getTopScorers().subscribe({
      next: data => {
        this.scorers = data.scorers.slice(0, 8);
        this.assisters = data.assisters.slice(0, 8);
        this.hasStats = this.scorers.length > 0 || this.assisters.length > 0;
        this.displayList = this.scorerTab === 'goal' ? this.scorers : this.assisters;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  loadAnnouncements(): void {
    this.tournamentService.getAnnouncements().subscribe({
      next: list => {
        this.announcements = list;
        this._refreshVisible();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  setTab(tab: 'goal' | 'assist'): void {
    this.scorerTab = tab;
    this.displayList = tab === 'goal' ? this.scorers : this.assisters;
    this.cdr.markForCheck();
  }

  dismiss(id: number): void {
    this.dismissedAnnouncements.add(id);
    this._refreshVisible();
    this.cdr.markForCheck();
  }

  private _refreshVisible(): void {
    this.visibleAnnouncements = this.announcements.filter(a => !this.dismissedAnnouncements.has(a.id));
  }

  goRegister(): void {
    this.router.navigate(['/inscription']);
  }

  trackByAnnouncementId(_: number, a: Announcement): number { return a.id; }
}
