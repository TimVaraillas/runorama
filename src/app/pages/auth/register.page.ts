import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Page d'inscription (création de compte email + mot de passe).
 */
@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold text-slate-900">Créer un compte</h1>
        <p class="mt-1 text-sm text-slate-500">
          Créez votre espace pour gérer vos propres stratégies alimentaires.
        </p>

        <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
          <div>
            <label for="displayName" class="mb-1 block text-sm font-medium text-slate-700">
              Nom affiché <span class="text-slate-400">(facultatif)</span>
            </label>
            <input
              id="displayName"
              type="text"
              formControlName="displayName"
              autocomplete="nickname"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label for="email" class="mb-1 block text-sm font-medium text-slate-700">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label for="password" class="mb-1 block text-sm font-medium text-slate-700">
              Mot de passe <span class="text-slate-400">(8 caractères minimum)</span>
            </label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
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
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    const { displayName, email, password } = this.form.getRawValue();
    this.auth
      .register({ email, password, displayName: displayName.trim() || undefined })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.toast.success('Compte créé, bienvenue !');
          void this.router.navigate(['/nutrition']);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Inscription impossible');
        },
      });
  }
}
