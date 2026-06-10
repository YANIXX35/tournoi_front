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
  loading = true;
  hasError = false;
  expandedTeam: number | null = null;

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
        this.cdr.detectChanges();
      });
    });
  }

  toggleTeam(id: number): void {
    this.expandedTeam = this.expandedTeam === id ? null : id;
  }

  trackByTeamId(_: number, team: Team): number { return team.id; }
  trackByIndex(index: number): number { return index; }
}
