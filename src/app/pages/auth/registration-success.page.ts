import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Page de confirmation affichée après une inscription réussie.
 *
 * Elle rassure l'utilisateur sur le bon déroulement de l'inscription et l'invite
 * à consulter l'e-mail de confirmation. L'adresse est transmise via le paramètre
 * de requête `email` afin de permettre le renvoi de l'e-mail.
 */
@Component({
  selector: 'app-registration-success-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-6 w-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 class="mt-4 text-2xl font-bold text-slate-900">Compte créé avec succès</h1>
        <p class="mt-2 text-sm text-slate-500">
          @if (email()) {
            Un e-mail de confirmation a été envoyé à
            <span class="font-semibold text-slate-700">{{ email() }}</span>.
          } @else {
            Un e-mail de confirmation vient de vous être envoyé.
          }
          Ouvrez le lien qu'il contient pour activer votre compte, puis connectez-vous.
        </p>

        <div class="mt-6">
          <a
            routerLink="/login"
            class="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Aller à la connexion
          </a>
        </div>

        @if (email()) {
          <p class="mt-6 text-sm text-slate-500">
            Vous n'avez rien reçu ?
            <button
              type="button"
              class="font-semibold text-brand-600 hover:underline disabled:opacity-50"
              [disabled]="resending()"
              (click)="resend()"
            >
              {{ resending() ? 'Envoi…' : 'Renvoyer l’e-mail' }}
            </button>
          </p>
        }
      </div>
    </div>
  `,
})
export class RegistrationSuccessPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly resending = signal(false);
  /** Adresse e-mail utilisée pour l'inscription (transmise via le query param `email`). */
  protected readonly email = signal(
    (this.route.snapshot.queryParamMap.get('email') ?? '').trim().toLowerCase(),
  );

  protected resend(): void {
    if (this.resending() || !this.email()) {
      return;
    }
    this.resending.set(true);
    this.auth.resendVerification({ email: this.email() }).subscribe({
      next: (res) => {
        this.resending.set(false);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.resending.set(false);
        this.toast.error(err?.error?.message ?? 'Envoi impossible');
      },
    });
  }
}
