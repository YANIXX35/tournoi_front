import { Component, OnInit } from '@angular/core';
import { TeamService } from '../../services/team.service';
import { Team } from '../../models/team.model';

@Component({
  selector: 'app-teams',
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss'],
  standalone: false,
})
export class TeamsComponent implements OnInit {
  teams: Team[] = [];
  loading = true;
  expandedTeam: number | null = null;

  constructor(public teamService: TeamService) {}

  ngOnInit(): void {
    this.teamService.getTeams().subscribe({
      next: (data) => { this.teams = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  toggleTeam(id: number): void {
    this.expandedTeam = this.expandedTeam === id ? null : id;
  }
}
