import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { Team, TeamRegistration } from '../models/team.model';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/api`;

interface CacheEntry { obs: Observable<Team[]>; expires: number; }

@Injectable({ providedIn: 'root' })
export class TeamService {
  private _teamsCache: CacheEntry | null = null;

  constructor(private http: HttpClient) {}

  getTeams(): Observable<Team[]> {
    if (this._teamsCache && Date.now() < this._teamsCache.expires) return this._teamsCache.obs;
    const obs = this.http.get<Team[]>(`${API}/teams`).pipe(shareReplay(1));
    this._teamsCache = { obs, expires: Date.now() + 120_000 };
    return obs;
  }

  getTeam(id: number): Observable<Team> {
    return this.http.get<Team>(`${API}/teams/${id}`);
  }

  register(data: TeamRegistration): Observable<any> {
    this._teamsCache = null;
    return this.http.post(`${API}/register`, data);
  }

  uploadLogo(file: File): Observable<{ logo_path: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<{ logo_path: string }>(`${API}/uploads/logo`, formData);
  }

  getLogoUrl(path: string | null): string {
    if (!path) return '';
    if (path.startsWith('data:')) return path;
    return `${environment.apiUrl}/uploads/${path}`;
  }
}
