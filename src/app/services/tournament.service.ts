import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match, Standing, TopScorer, Announcement, GalleryPhoto, TeamDetail } from '../models/match.model';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/api`;

@Injectable({ providedIn: 'root' })
export class TournamentService {

  constructor(private http: HttpClient) {}

  getMatches(): Observable<Match[]> {
    return this.http.get<Match[]>(`${API}/matches`);
  }

  getResults(): Observable<{ finished_matches: Match[]; standings: Standing[] }> {
    return this.http.get<{ finished_matches: Match[]; standings: Standing[] }>(`${API}/results`);
  }

  getTopScorers(): Observable<{ scorers: TopScorer[]; assisters: TopScorer[] }> {
    return this.http.get<{ scorers: TopScorer[]; assisters: TopScorer[] }>(`${API}/goals`);
  }

  getAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${API}/announcements`);
  }

  getGallery(): Observable<GalleryPhoto[]> {
    return this.http.get<GalleryPhoto[]>(`${API}/gallery`);
  }

  getTeamDetail(id: number): Observable<TeamDetail> {
    return this.http.get<TeamDetail>(`${API}/teams/${id}/detail`);
  }
}
