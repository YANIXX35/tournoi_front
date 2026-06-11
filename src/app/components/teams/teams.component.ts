import { Component, OnInit, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { TeamService } from '../../services/team.service';
import { Team } from '../../models/team.model';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsComponent implements OnInit {
  teams: Team[] = [];
  filteredTeams: Team[] = [];
  searchQuery = '';
  loading = true;
  hasError = false;
  expandedTeam: number | null = null;
  page = 1;
  readonly pageSize = 12;

  get paginatedTeams(): Team[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredTeams.slice(start, start + this.pageSize);
  }

  constructor(
    public teamService: TeamService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.hasError = false;
    this.teamService.getTeams().pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe(data => {
      this.ngZone.run(() => {
        this.loading = false;
        if (!data) { this.hasError = true; this.cdr.detectChanges(); return; }
        this.teams = data;
        this.filteredTeams = data;
        this.cdr.detectChanges();
      });
    });
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.expandedTeam = null;
    this.page = 1;
    if (!query.trim()) { this.filteredTeams = this.teams; this.cdr.markForCheck(); return; }
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = normalize(query);
    this.filteredTeams = this.teams.filter(t =>
      normalize(t.name).includes(q) || normalize(t.captain_name).includes(q)
    );
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredTeams = this.teams;
    this.expandedTeam = null;
    this.page = 1;
    this.cdr.markForCheck();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.expandedTeam = null;
    this.cdr.markForCheck();
  }

  toggleTeam(id: number): void {
    this.expandedTeam = this.expandedTeam === id ? null : id;
  }

  trackByTeamId(_: number, team: Team): number { return team.id; }
  trackByIndex(index: number): number { return index; }
}
