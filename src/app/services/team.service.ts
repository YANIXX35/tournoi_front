import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team, TeamRegistration } from '../models/team.model';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/api`;

@Injectable({ providedIn: 'root' })
export class TeamService {

  constructor(private http: HttpClient) {}

  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${API}/teams`);
  }

  getTeam(id: number): Observable<Team> {
    return this.http.get<Team>(`${API}/teams/${id}`);
  }

  register(data: TeamRegistration): Observable<any> {
    return this.http.post(`${API}/register`, data);
  }

  uploadLogo(file: File): Observable<{ logo_path: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<{ logo_path: string }>(`${API}/uploads/logo`, formData);
  }

  getLogoUrl(path: string | null): string {
    if (!path) return '';
    return `${environment.apiUrl}/uploads/${path}`;
  }
}
