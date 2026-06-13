import { Component, signal, HostListener, OnInit } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';
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

  constructor(
    private perf: PerformanceService,
    private tournament: TournamentService,
    private swUpdate: SwUpdate,
  ) {
    this.perf.init();
  }

  ngOnInit(): void {
    this.tournament.getRegistrationStatus().subscribe({
      next: status => { this.registrationOpen = status.open; },
      error: () => { this.registrationOpen = false; },
    });
    this._handleSwUpdates();
  }

  private _handleSwUpdates(): void {
    if (!this.swUpdate.isEnabled) return;

    // Vérification proactive toutes les 60s
    interval(60_000).subscribe(() => this.swUpdate.checkForUpdate());

    // Activation immédiate + rechargement silencieux dès qu'une nouvelle version est prête
    this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
    ).subscribe(() => {
      this.swUpdate.activateUpdate().then(() => window.location.reload());
    });
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void  { this.menuOpen = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.menuOpen = false; }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled = window.scrollY > 48; }
}
