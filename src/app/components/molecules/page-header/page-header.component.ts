import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Molecule : en-tête de page générique et réutilisable.
 *
 * Affiche un titre, un sous-titre optionnel et un emplacement projeté pour les
 * boutons d'action, alignés à droite. Les actions sont projetées via
 * l'attribut `actions` :
 *
 * ```html
 * <ui-page-header title="Titre" subtitle="Sous-titre">
 *   <ui-button actions>Action</ui-button>
 * </ui-page-header>
 * ```
 */
@Component({
  selector: 'ui-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="truncate font-display text-2xl font-bold text-slate-900">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-0.5 text-sm text-slate-500">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
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
}
