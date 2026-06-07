import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { TopScorer, Announcement } from '../../models/match.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false,
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

  constructor(
    private router: Router,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.updateCountdown();
    this.timer = setInterval(() => this.updateCountdown(), 1000);
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
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  get hasStats(): boolean {
    return this.scorers.length > 0 || this.assisters.length > 0;
  }

  get displayList(): TopScorer[] {
    return this.scorerTab === 'goal' ? this.scorers : this.assisters;
  }

  loadAnnouncements(): void {
    this.tournamentService.getAnnouncements().subscribe({
      next: list => { this.announcements = list; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  dismiss(id: number): void {
    this.dismissedAnnouncements.add(id);
    this.cdr.detectChanges();
  }

  get visibleAnnouncements(): Announcement[] {
    return this.announcements.filter(a => !this.dismissedAnnouncements.has(a.id));
  }

  goRegister(): void {
    this.router.navigate(['/inscription']);
  }
}
