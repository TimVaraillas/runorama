import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import type { LoginPayload, RegisterPayload, User } from '../../../core/models';

/**
 * Service d'authentification.
 *
 * L'état de l'utilisateur courant est exposé via des signaux. Le jeton d'accès
 * est géré côté serveur dans un cookie HttpOnly ; ce service ne manipule donc
 * jamais de token directement, mais s'appuie sur `withCredentials` pour que le
 * cookie soit transmis à l'API.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/auth';

  private readonly currentUserSig = signal<User | null>(null);
  /** Utilisateur actuellement connecté (ou `null`). */
  readonly currentUser = this.currentUserSig.asReadonly();
  /** Vrai si un utilisateur est connecté. */
  readonly isAuthenticated = computed(() => this.currentUserSig() !== null);
  /** Vrai si l'utilisateur connecté est administrateur. */
  readonly isAdmin = computed(() => this.currentUserSig()?.role === 'admin');

  register(payload: RegisterPayload): Observable<User> {
    return this.http
      .post<User>(`${this.baseUrl}/register`, payload)
      .pipe(tap((user) => this.currentUserSig.set(user)));
  }

  login(payload: LoginPayload): Observable<User> {
    return this.http
      .post<User>(`${this.baseUrl}/login`, payload)
      .pipe(tap((user) => this.currentUserSig.set(user)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/logout`, {})
      .pipe(tap(() => this.currentUserSig.set(null)));
  }

  /** Récupère l'utilisateur courant depuis le cookie de session. */
  fetchMe(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/me`)
      .pipe(tap((user) => this.currentUserSig.set(user)));
  }

  /** Réinitialise l'état local (utilisé par l'intercepteur sur 401). */
  clear(): void {
    this.currentUserSig.set(null);
  }
}
