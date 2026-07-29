import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { TextInputComponent } from '../../components/atoms/text-input/text-input.component';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Page « Mot de passe oublié » : saisie de l'adresse e-mail pour recevoir un
 * lien de réinitialisation. La réponse est volontairement générique afin de ne
 * pas révéler l'existence (ou non) d'un compte.
 */
@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, TextInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold text-slate-900">Mot de passe oublié</h1>
        <p class="mt-1 text-sm text-slate-500">
          Saisissez votre adresse e-mail : nous vous enverrons un lien pour définir un nouveau
          mot de passe.
        </p>

        @if (sent()) {
          <div
            class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {{ message() }}
          </div>
          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/login" class="font-semibold text-brand-600 hover:underline">
              Retour à la connexion
            </a>
          </p>
        } @else {
          <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <ui-text-input
              formControlName="email"
              label="Adresse e-mail"
              type="email"
              autocomplete="email"
            />

            <ui-button type="submit" color="primary" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Envoi…' : 'Envoyer le lien' }}
            </ui-button>
          </form>

          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/login" class="font-semibold text-brand-600 hover:underline">
              Retour à la connexion
            </a>
          </p>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly message = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.auth.forgotPassword(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(res.message);
        this.sent.set(true);
      },
      error: () => {
        // Même en cas d'erreur on affiche un message générique (aucune fuite d'information).
        this.loading.set(false);
        this.message.set(
          'Si un compte est associé à cette adresse, un lien de réinitialisation vient d’être envoyé.',
        );
        this.sent.set(true);
      },
    });
  }
}
