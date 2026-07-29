import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../features/auth/services/auth.service';

/** État courant du processus de confirmation d'adresse. */
type VerificationState = 'loading' | 'success' | 'error' | 'missing';

/**
 * Page de confirmation d'adresse e-mail. Le token est lu depuis le paramètre de
 * requête `token`. En cas de succès, l'utilisateur est connecté automatiquement
 * et redirigé vers l'application.
 */
@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        @switch (state()) {
          @case ('loading') {
            <h1 class="text-2xl font-bold text-slate-900">Confirmation en cours…</h1>
            <p class="mt-2 text-sm text-slate-500">
              Nous validons votre adresse e-mail, merci de patienter.
            </p>
          }
          @case ('success') {
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-6 w-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 class="mt-4 text-2xl font-bold text-slate-900">Adresse confirmée</h1>
            <p class="mt-2 text-sm text-slate-500">
              Votre compte est activé. Vous allez être redirigé vers l'application…
            </p>
          }
          @case ('missing') {
            <h1 class="text-2xl font-bold text-slate-900">Lien incomplet</h1>
            <p class="mt-2 text-sm text-slate-500">
              Ce lien de confirmation est invalide ou incomplet.
            </p>
            <div class="mt-6">
              <a routerLink="/login" class="font-semibold text-brand-600 hover:underline">
                Retour à la connexion
              </a>
            </div>
          }
          @default {
            <h1 class="text-2xl font-bold text-slate-900">Confirmation impossible</h1>
            <p class="mt-2 text-sm text-slate-500">
              Le lien de confirmation est invalide ou a expiré. Demandez un nouvel e-mail depuis
              la page de connexion.
            </p>
            <div class="mt-6 flex justify-center">
              <ui-button color="primary" (click)="goToLogin()">Retour à la connexion</ui-button>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class VerifyEmailPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly state = signal<VerificationState>('loading');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.state.set('missing');
      return;
    }

    this.auth.verifyEmail({ token }).subscribe({
      next: () => {
        this.state.set('success');
        this.toast.success('Adresse e-mail confirmée, bienvenue !');
        setTimeout(() => void this.router.navigate(['/nutrition']), 1500);
      },
      error: () => {
        this.state.set('error');
      },
    });
  }

  protected goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
