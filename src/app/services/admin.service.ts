import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Match, Goal } from '../models/match.model';
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

  // --- Joueurs ---
  addPlayer(teamId: number, playerName: string, photoPath: string | null): Observable<any> {
    return this.http.post(`${API}/teams/${teamId}/players`,
      { player_name: playerName, photo_path: photoPath },
      { headers: this.headers() });
  }

  updatePlayer(playerId: number, playerName: string, photoPath?: string | null): Observable<any> {
    const body: any = { player_name: playerName };
    if (photoPath !== undefined) body.photo_path = photoPath;
    return this.http.put(`${API}/players/${playerId}`, body, { headers: this.headers() });
  }

  deletePlayer(playerId: number): Observable<any> {
    return this.http.delete(`${API}/players/${playerId}`, { headers: this.headers() });
  }

  uploadPlayerPhoto(file: File): Observable<{ photo_path: string }> {
    const form = new FormData();
    form.append('photo', file);
    return this.http.post<{ photo_path: string }>(`${API}/uploads/photo`, form, { headers: this.headers() });
  }

  // --- Buteurs & Passeurs ---
  getMatchGoals(matchId: number): Observable<Goal[]> {
    return this.http.get<Goal[]>(`${API}/matches/${matchId}/goals`, { headers: this.headers() });
  }

  addGoal(matchId: number, data: Partial<Goal>): Observable<Goal> {
    return this.http.post<Goal>(`${API}/matches/${matchId}/goals`, data, { headers: this.headers() });
  }

  updateGoal(goalId: number, data: Partial<Goal>): Observable<any> {
    return this.http.put(`${API}/goals/${goalId}`, data, { headers: this.headers() });
  }

  deleteGoal(goalId: number): Observable<any> {
    return this.http.delete(`${API}/goals/${goalId}`, { headers: this.headers() });
  }
}
