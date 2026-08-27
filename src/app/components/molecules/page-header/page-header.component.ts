import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Molecule : en-tête de page générique et réutilisable.
 *
 * Affiche un titre, un sous-titre optionnel et un emplacement projeté pour les
 * boutons d'action, alignés à droite. Une icône optionnelle est présentée dans
 * une pastille en dégradé de marque. Les actions sont projetées via l'attribut
 * `actions` :
 *
 * ```html
 * <ui-page-header title="Titre" subtitle="Sous-titre" [icon]="faBookOpen">
 *   <ui-button actions>Action</ui-button>
 * </ui-page-header>
 * ```
 */
@Component({
  selector: 'ui-page-header',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1 items-center gap-4">
        @if (icon(); as ic) {
          <span
            class="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-600 to-secondary-500 text-white shadow-sm sm:grid"
          >
            <ui-icon [icon]="ic" size="xl" />
          </span>
        }
        <div class="min-w-0">
          <h1 class="truncate font-display text-4xl font-bold text-slate-600">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="truncate mt-0.5 text-sm text-slate-400 italic">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <ng-content select="[actions]" />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  /** Titre principal de la page. */
  readonly title = input.required<string>();
  /** Sous-titre optionnel affiché sous le titre. */
  readonly subtitle = input('');
  /** Icône optionnelle affichée dans une pastille en dégradé de marque. */
  readonly icon = input<IconDefinition | null>(null);
}
