import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { Session } from '../../../core/models';

/**
 * Service d'accès aux séances via l'API REST.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/sessions';

  list(): Observable<Session[]> {
    return this.http.get<Session[]>(this.baseUrl);
  }

  getById(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<Session>): Observable<Session> {
    return this.http.post<Session>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Session>): Observable<Session> {
    return this.http.put<Session>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
