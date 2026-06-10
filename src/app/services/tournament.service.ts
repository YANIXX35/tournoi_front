import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { Match, Standing, TopScorer, Announcement, GalleryPhoto, TeamDetail } from '../models/match.model';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/api`;

interface CacheEntry { obs: Observable<any>; expires: number; }

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private _cache = new Map<string, CacheEntry>();

  constructor(private http: HttpClient) {}

  private cached<T>(key: string, source: Observable<T>, ttl = 60_000): Observable<T> {
    const hit = this._cache.get(key);
    if (hit && Date.now() < hit.expires) return hit.obs as Observable<T>;
    const obs = source.pipe(shareReplay(1));
    this._cache.set(key, { obs, expires: Date.now() + ttl });
    return obs;
  }

  getMatches(): Observable<Match[]> {
    return this.cached('matches', this.http.get<Match[]>(`${API}/matches`));
  }

  getResults(): Observable<{ finished_matches: Match[]; standings: Standing[] }> {
    return this.cached('results', this.http.get<{ finished_matches: Match[]; standings: Standing[] }>(`${API}/results`));
  }

  getTopScorers(): Observable<{ scorers: TopScorer[]; assisters: TopScorer[] }> {
    return this.cached('scorers', this.http.get<{ scorers: TopScorer[]; assisters: TopScorer[] }>(`${API}/goals`));
  }

  getAnnouncements(): Observable<Announcement[]> {
    return this.cached('announcements', this.http.get<Announcement[]>(`${API}/announcements`));
  }

  getGallery(): Observable<GalleryPhoto[]> {
    return this.cached('gallery', this.http.get<GalleryPhoto[]>(`${API}/gallery`), 300_000);
  }

  getTeamDetail(id: number): Observable<TeamDetail> {
    return this.cached(`team-${id}`, this.http.get<TeamDetail>(`${API}/teams/${id}/detail`), 120_000);
  }

  /** Vide le cache (appele apres une inscription ou modification) */
  invalidate(key?: string): void {
    if (key) this._cache.delete(key);
    else this._cache.clear();
  }
}
