import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import type {
  ForgotPasswordPayload,
  LoginPayload,
  MessageResponse,
  RegisterPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  User,
  VerifyEmailPayload,
} from '../../../core/models';

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

  register(payload: RegisterPayload): Observable<MessageResponse> {
    // L'inscription ne connecte plus automatiquement : l'utilisateur doit d'abord
    // confirmer son adresse e-mail via le lien reçu.
    return this.http.post<MessageResponse>(`${this.baseUrl}/register`, payload);
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

  /** Demande l'envoi d'un lien de réinitialisation de mot de passe. */
  forgotPassword(payload: ForgotPasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, payload);
  }

  /** Réinitialise le mot de passe à partir d'un token reçu par e-mail. */
  resetPassword(payload: ResetPasswordPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, payload);
  }

  /**
   * Confirme l'adresse e-mail à partir du token reçu à l'inscription. En cas de
   * succès, l'utilisateur est automatiquement connecté (cookie de session posé).
   */
  verifyEmail(payload: VerifyEmailPayload): Observable<User> {
    return this.http
      .post<User>(`${this.baseUrl}/verify-email`, payload)
      .pipe(tap((user) => this.currentUserSig.set(user)));
  }

  /** Renvoie l'e-mail de confirmation d'adresse. */
  resendVerification(payload: ResendVerificationPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.baseUrl}/resend-verification`, payload);
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
