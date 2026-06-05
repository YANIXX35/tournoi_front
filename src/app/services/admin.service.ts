import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Match } from '../models/match.model';
import { Team } from '../models/team.model';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/api/admin`;

@Injectable({ providedIn: 'root' })
export class AdminService {

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders(this.auth.getAuthHeaders());
  }

  // --- Équipes ---
  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${API}/teams`, { headers: this.headers() });
  }

  validateTeam(id: number, validated: boolean): Observable<any> {
    return this.http.put(`${API}/teams/${id}`, { validated }, { headers: this.headers() });
  }

  deleteTeam(id: number): Observable<any> {
    return this.http.delete(`${API}/teams/${id}`, { headers: this.headers() });
  }

  // --- Matchs ---
  createMatch(data: Partial<Match>): Observable<any> {
    return this.http.post(`${API}/matches`, data, { headers: this.headers() });
  }

  updateMatch(id: number, data: Partial<Match>): Observable<any> {
    return this.http.put(`${API}/matches/${id}`, data, { headers: this.headers() });
  }

  deleteMatch(id: number): Observable<any> {
    return this.http.delete(`${API}/matches/${id}`, { headers: this.headers() });
  }
}
