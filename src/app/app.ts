import { Component, signal, HostListener } from '@angular/core';
import { PerformanceService } from './services/performance.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
  menuOpen = false;
  scrolled = false;

  constructor(private perf: PerformanceService) {
    this.perf.init();
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void  { this.menuOpen = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.menuOpen = false; }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled = window.scrollY > 48; }
}
