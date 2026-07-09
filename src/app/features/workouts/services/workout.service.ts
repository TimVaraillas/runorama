import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { Workout } from '../../../core/models';

/**
 * Service d'accès aux séances via l'API REST.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/workouts';

  list(): Observable<Workout[]> {
    return this.http.get<Workout[]>(this.baseUrl);
  }

  getById(id: string): Observable<Workout> {
    return this.http.get<Workout>(`${this.baseUrl}/${id}`);
  }

  create(payload: Partial<Workout>): Observable<Workout> {
    return this.http.post<Workout>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Workout>): Observable<Workout> {
    return this.http.put<Workout>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** URL de téléchargement de l'export Garmin. */
  garminExportUrl(id: string): string {
    return `${this.baseUrl}/${id}/garmin`;
  }
}
