import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../atoms/icon/icon.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import {
  faPersonRunning,
  faAppleWhole,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../../features/auth/services/auth.service';

/**
 * Organism : barre de navigation principale.
 */
@Component({
  selector: 'ui-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <a routerLink="/" class="flex items-center gap-2">
            <span class="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
              <ui-icon [icon]="logo" size="lg" />
            </span>
            <span class="font-display text-lg font-bold text-slate-900">Runorama</span>
          </a>

          <nav class="flex items-center gap-1 border-l border-slate-100 ml-6 pl-6">
            @for (link of links; track link.path) {
              <a
                [routerLink]="link.path"
                routerLinkActive="bg-brand-50 text-brand-700"
                [routerLinkActiveOptions]="{ exact: link.exact }"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <ui-icon [icon]="link.icon" fixedWidth />
                <span class="hidden sm:inline">{{ link.label }}</span>
              </a>
            }
          </nav>
        </div>

        @if (auth.currentUser(); as user) {
          <div class="flex items-center gap-3">
            <span class="hidden text-sm text-slate-500 sm:inline">
              {{ user.displayName || user.email }}
              @if (auth.isAdmin()) {
                <span
                  class="ml-1 rounded bg-brand-100 px-1.5 py-0.5 text-xs font-semibold text-brand-700"
                  >admin</span
                >
              }
            </span>
            <ui-button
              color="default"
              variant="ghost"
              size="sm"
              [icon]="faRightFromBracket"
              tooltipContent="Se déconnecter"
              tooltipPosition="bottom"
              (clicked)="logout()"
            >
            </ui-button>
          </div>
        }
      </div>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly logo = faPersonRunning;
  protected readonly faRightFromBracket = faRightFromBracket;

  // NOTE : le lien « Séances » est temporairement masqué (partie sportive non fonctionnelle).
  readonly links = [
    { path: '/nutrition', label: 'Nutrition', icon: faAppleWhole, exact: false },
  ];

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
