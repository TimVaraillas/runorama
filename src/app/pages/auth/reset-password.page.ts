import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { TextInputComponent } from '../../components/atoms/text-input/text-input.component';
import { PasswordStrengthComponent } from '../../components/molecules/password-strength/password-strength.component';
import { ToastService } from '../../core/services/toast.service';
import { passwordStrengthValidator } from '../../core/utils/password-policy';
import { AuthService } from '../../features/auth/services/auth.service';

/** Validateur de groupe vérifiant que les deux mots de passe sont identiques. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password === confirm ? null : { mismatch: true };
}

/**
 * Page de réinitialisation de mot de passe. Le token est lu depuis le
 * paramètre de requête `token`. Le nouveau mot de passe doit respecter la
 * politique de robustesse et être confirmé avant l'envoi.
 */
@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, TextInputComponent, PasswordStrengthComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
        <p class="mt-1 text-sm text-slate-500">Choisissez un nouveau mot de passe sécurisé.</p>

        @if (!token()) {
          <div
            class="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            Lien de réinitialisation invalide ou incomplet.
          </div>
          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/forgot-password" class="font-semibold text-brand-600 hover:underline">
              Demander un nouveau lien
            </a>
          </p>
        } @else {
          <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
            <div>
              <ui-text-input
                formControlName="password"
                label="Nouveau mot de passe"
                type="password"
                autocomplete="new-password"
                [hideError]="true"
              />
              <ui-password-strength [value]="passwordValue()" />
            </div>

            <div>
              <ui-text-input
                formControlName="confirm"
                label="Confirmer le mot de passe"
                type="password"
                autocomplete="new-password"
              />
              @if (form.get('confirm')?.touched && form.errors?.['mismatch']) {
                <p class="mt-1 text-xs text-rose-600">Les mots de passe ne correspondent pas.</p>
              }
            </div>

            <ui-button type="submit" color="primary" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Enregistrement…' : 'Réinitialiser' }}
            </ui-button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  /** Valeur réactive du mot de passe, pour l'indicateur de robustesse. */
  protected readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  protected submit(): void {
    if (this.form.invalid || this.loading() || !this.token()) {
      return;
    }
    this.loading.set(true);
    this.auth
      .resetPassword({ token: this.token(), password: this.form.getRawValue().password })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.toast.success(res.message);
          void this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Réinitialisation impossible');
        },
      });
  }
}
