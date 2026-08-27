import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { faEnvelope, faRightFromBracket, faUser } from '@fortawesome/free-solid-svg-icons';
import { AvatarComponent } from '../../components/atoms/avatar/avatar.component';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import { PageHeaderComponent } from '../../components/molecules/page-header/page-header.component';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Page de profil : affiche les informations de l'utilisateur connecté.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [AvatarComponent, ButtonComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl px-4 py-8">
      <ui-page-header title="Mon profil" subtitle="Vos informations personnelles" [icon]="faUser" />

      @if (auth.currentUser(); as user) {
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div class="flex items-center gap-4">
            <ui-avatar [initials]="initials()" size="lg" />
            <div class="min-w-0">
              <p class="truncate font-display text-xl font-bold text-slate-900">
                {{ user.firstName }} {{ user.lastName }}
              </p>
              @if (auth.isAdmin()) {
                <span
                  class="mt-1 inline-block rounded bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-700"
                  >Administrateur</span
                >
              }
            </div>
          </div>

          <dl class="mt-8 space-y-4 border-t border-slate-100 pt-6">
            <div class="flex items-start gap-3">
              <span class="mt-0.5 text-slate-400"><ui-icon [icon]="faUser" fixedWidth /></span>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Prénom
                </dt>
                <dd class="text-sm font-medium text-slate-900">{{ user.firstName }}</dd>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <span class="mt-0.5 text-slate-400"><ui-icon [icon]="faUser" fixedWidth /></span>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Nom de famille
                </dt>
                <dd class="text-sm font-medium text-slate-900">{{ user.lastName }}</dd>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <span class="mt-0.5 text-slate-400"><ui-icon [icon]="faEnvelope" fixedWidth /></span>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Adresse e-mail
                </dt>
                <dd class="text-sm font-medium text-slate-900">{{ user.email }}</dd>
              </div>
            </div>
          </dl>

          <div class="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <ui-button
              color="danger"
              variant="ghost"
              [icon]="faRightFromBracket"
              (clicked)="logout()"
            >
              Se déconnecter
            </ui-button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly faUser = faUser;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faRightFromBracket = faRightFromBracket;

  protected readonly initials = computed(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return '';
    }
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
