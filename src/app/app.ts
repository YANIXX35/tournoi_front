import { Component, signal, HostListener, OnInit } from '@angular/core';
import { PerformanceService } from './services/performance.service';
import { TournamentService } from './services/tournament.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  menuOpen = false;
  scrolled = false;
  registrationOpen = false;

  constructor(private perf: PerformanceService, private tournament: TournamentService) {
    this.perf.init();
  }

  ngOnInit(): void {
    this.tournament.getRegistrationStatus().subscribe({
      next: status => { this.registrationOpen = status.open; },
      error: () => { this.registrationOpen = false; },
    });
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void  { this.menuOpen = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.menuOpen = false; }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled = window.scrollY > 48; }
}
