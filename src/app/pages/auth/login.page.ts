import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { faPersonRunning } from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import { TextInputComponent } from '../../components/atoms/text-input/text-input.component';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Page de connexion (email + mot de passe).
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, IconComponent, TextInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="relative bg-linear-to-br from-brand-600 to-secondary-500 px-8 py-10 text-white">
          <div
            class="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10"
          ></div>
          <div
            class="pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/10"
          ></div>
          <span
            class="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/30"
          >
            <ui-icon [icon]="faPersonRunning" size="xl" />
          </span>
          <h1 class="mt-4 font-display text-2xl font-bold">Content de vous revoir</h1>
          <p class="mt-1 text-sm text-white/80">
            Connectez-vous pour retrouver vos stratégies alimentaires.
          </p>
        </div>

        <div class="p-8">
        <form class="grid gap-4" [formGroup]="form" (ngSubmit)="submit()">
          <ui-text-input
            formControlName="email"
            label="Adresse e-mail"
            type="email"
            autocomplete="email"
          />

          <ui-text-input
            formControlName="password"
            label="Mot de passe"
            type="password"
            autocomplete="current-password"
          />

          <ui-button type="submit" color="primary" [loading]="loading()" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </ui-button>
        </form>

        <p class="mt-4 text-center text-sm">
          <a routerLink="/forgot-password" class="font-semibold text-brand-600 hover:underline">
            Mot de passe oublié ?
          </a>
        </p>

        <p class="mt-6 text-center text-sm text-slate-500">
          Pas encore de compte ?
          <a routerLink="/register" class="font-semibold text-brand-600 hover:underline">
            Créer un compte
          </a>
        </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly faPersonRunning = faPersonRunning;

  protected readonly loading = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/courses']);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Connexion impossible');
      },
    });
  }
}
