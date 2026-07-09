import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { PlannedSession } from '../../../core/models';

/**
 * Service d'accès aux séances planifiées via l'API REST.
 */
@Injectable({ providedIn: 'root' })
export class PlanningService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/planned-sessions';

  /** Liste les séances planifiées entre deux dates ISO (YYYY-MM-DD). */
  list(from?: string, to?: string): Observable<PlannedSession[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<PlannedSession[]>(this.baseUrl, { params });
  }

  schedule(payload: Partial<PlannedSession>): Observable<PlannedSession> {
    return this.http.post<PlannedSession>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<PlannedSession>): Observable<PlannedSession> {
    return this.http.put<PlannedSession>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
