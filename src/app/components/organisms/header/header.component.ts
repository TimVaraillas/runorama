import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../atoms/icon/icon.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { AuthService } from '../../../features/auth/services/auth.service';
import {
  faPersonRunning,
  faBookOpen,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : barre de navigation principale.
 */
@Component({
  selector: 'ui-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <a routerLink="/" class="flex items-center gap-2">
            <span class="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
              <ui-icon [icon]="logo" size="lg" />
            </span>
            <span class="font-display text-xl font-bold text-slate-600">Runorama</span>
          </a>

          <a
            routerLink="/guide"
            routerLinkActive="text-brand-600"
            class="hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 sm:inline"
          >
            Comment ça marche
          </a>

          @if (auth.isAuthenticated()) {
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
          }
        </div>

        <ui-user-menu />
      </div>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);

  readonly logo = faPersonRunning;

  readonly links = [
    { path: '/nutrition/products', label: 'Bibliothèque de produits', icon: faBookOpen, exact: false },
    { path: '/nutrition/strategies', label: 'Stratégies de nutrition', icon: faUtensils, exact: false },
  ];
}
