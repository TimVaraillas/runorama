import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { TextInputComponent } from '../../components/atoms/text-input/text-input.component';
import { PasswordStrengthComponent } from '../../components/molecules/password-strength/password-strength.component';
import { ToastService } from '../../core/services/toast.service';
import { passwordStrengthValidator } from '../../core/utils/password-policy';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Page d'inscription (création de compte email + mot de passe).
 *
 * L'inscription ne connecte pas immédiatement : un e-mail de confirmation est
 * envoyé et l'utilisateur est redirigé vers une page dédiée l'invitant à
 * confirmer son adresse. La connexion reste bloquée tant qu'elle n'est pas vérifiée.
 */
@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, TextInputComponent, PasswordStrengthComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold text-slate-900">Créer un compte</h1>
        <p class="mt-1 text-sm text-slate-500">
          Créez votre espace pour gérer vos propres stratégies alimentaires.
        </p>

        <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ui-text-input formControlName="firstName" label="Prénom" autocomplete="given-name" />
            <ui-text-input
              formControlName="lastName"
              label="Nom de famille"
              autocomplete="family-name"
            />
          </div>

          <div class="grid gap-4">
            <ui-text-input
              formControlName="email"
              label="Adresse e-mail"
              type="email"
              autocomplete="email"
            />

            <div>
              <ui-text-input
                formControlName="password"
                label="Mot de passe"
                type="password"
                autocomplete="new-password"

              />
              <ui-password-strength [value]="passwordValue()" />
            </div>
          </div>

          <ui-button type="submit" color="primary" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Création…' : 'Créer mon compte' }}
          </ui-button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-500">
          Déjà un compte ?
          <a routerLink="/login" class="font-semibold text-brand-600 hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrengthValidator]],
  });

  /** Valeur réactive du mot de passe, pour l'indicateur de robustesse. */
  protected readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    const { firstName, lastName, email, password } = this.form.getRawValue();
    const normalizedEmail = email.trim().toLowerCase();
    this.auth
      .register({ email, password, firstName: firstName.trim(), lastName: lastName.trim() })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigate(['/registration-success'], {
            queryParams: { email: normalizedEmail },
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Inscription impossible');
        },
      });
  }
}
