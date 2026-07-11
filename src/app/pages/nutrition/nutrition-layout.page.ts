import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import { faAppleWhole, faUtensils } from '@fortawesome/free-solid-svg-icons';

/**
 * Page layout du volet Nutrition.
 * Fournit l'en-tête et la navigation entre les sous-pages « Produits » et
 * « Stratégies alimentaires », puis affiche la sous-page routée.
 */
@Component({
  selector: 'app-nutrition-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <nav
        class="sticky top-0 z-30 -mt-6 mx-[calc(50%-50vw)] w-screen border-b border-slate-200 bg-white"
      >
        <div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <a
            routerLink="products"
            routerLinkActive="!bg-brand-50 !text-brand-700"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <ui-icon [icon]="faAppleWhole" size="sm" />
            Produits
          </a>
          <a
            routerLink="strategies"
            routerLinkActive="!bg-brand-50 !text-brand-700"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <ui-icon [icon]="faUtensils" size="sm" />
            Stratégies alimentaires
          </a>
        </div>
      </nav>

      <router-outlet />
    </div>
  `,
})
export class NutritionLayoutPage {
  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faUtensils = faUtensils;
}
