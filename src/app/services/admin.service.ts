import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Match, Goal, Announcement, GalleryPhoto, AdminLog } from '../models/match.model';
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

  getTeamsWithPhotos(): Observable<Team[]> {
    return this.http.get<Team[]>(`${API}/teams?photos=1`, { headers: this.headers() });
  }

  validateTeam(id: number, validated: boolean): Observable<any> {
    return this.http.put(`${API}/teams/${id}`, { validated }, { headers: this.headers() });
  }

  deleteTeam(id: number): Observable<any> {
    return this.http.delete(`${API}/teams/${id}`, { headers: this.headers() });
  }

  // --- Matchs ---
  getMatchesFresh(): Observable<Match[]> {
    // Timestamp param forces browser to bypass its HTTP cache (max-age=60 set by backend)
    return this.http.get<Match[]>(`${environment.apiUrl}/api/matches?_t=${Date.now()}`, { headers: this.headers() });
  }

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

  // --- Galerie ---
  getGallery(): Observable<GalleryPhoto[]> {
    return this.http.get<GalleryPhoto[]>(`${API}/gallery`, { headers: this.headers() });
  }
  addPhoto(data: { title?: string; photo_path: string }): Observable<GalleryPhoto> {
    return this.http.post<GalleryPhoto>(`${API}/gallery`, data, { headers: this.headers() });
  }
  updatePhoto(id: number, data: { title?: string }): Observable<any> {
    return this.http.patch(`${API}/gallery/${id}`, data, { headers: this.headers() });
  }
  deletePhoto(id: number): Observable<any> {
    return this.http.delete(`${API}/gallery/${id}`, { headers: this.headers() });
  }

  // --- Annonces ---
  getAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${API}/announcements`, { headers: this.headers() });
  }
  addAnnouncement(data: Partial<Announcement>): Observable<Announcement> {
    return this.http.post<Announcement>(`${API}/announcements`, data, { headers: this.headers() });
  }
  updateAnnouncement(id: number, data: Partial<Announcement>): Observable<any> {
    return this.http.put(`${API}/announcements/${id}`, data, { headers: this.headers() });
  }
  deleteAnnouncement(id: number): Observable<any> {
    return this.http.delete(`${API}/announcements/${id}`, { headers: this.headers() });
  }

  // --- Logs ---
  getLogs(): Observable<AdminLog[]> {
    return this.http.get<AdminLog[]>(`${API}/logs`, { headers: this.headers() });
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
