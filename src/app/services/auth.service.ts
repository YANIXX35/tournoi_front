import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/api`;

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<{ token: string; username: string }> {
    return this.http.post<{ token: string; username: string }>(`${API}/admin/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem('admin_token', res.token);
        localStorage.setItem('admin_username', res.username);
      })
    );
  }

  refresh(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${API}/admin/refresh`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap(res => localStorage.setItem('admin_token', res.token))
    );
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
  }

  getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUsername(): string {
    return localStorage.getItem('admin_username') || '';
  }

  getAuthHeaders(): { Authorization: string } {
    return { Authorization: `Bearer ${this.getToken()}` };
  }

  /** Retourne les minutes restantes avant expiration (0 si invalide/expiré). */
  getTokenRemainingMinutes(): number {
    const token = this.getToken();
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp: number = payload.exp ?? 0;
      return Math.max(0, Math.floor((exp * 1000 - Date.now()) / 60000));
    } catch {
      return 0;
    }
  }
}
