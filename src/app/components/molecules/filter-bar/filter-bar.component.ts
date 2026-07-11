import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Molecule : barre de filtres réutilisable.
 *
 * Fournit l'habillage visuel commun à toutes les barres de filtres de
 * l'application (séparateur en bas, espacement horizontal, retour à la ligne
 * responsive). Le contenu (champ de recherche, sélecteurs, bascule de vue…)
 * est projeté via `<ng-content>`.
 *
 * @example
 * ```html
 * <ui-filter-bar>
 *   <ui-search-input [(value)]="search" />
 *   <ui-view-toggle [mode]="viewMode()" (modeChange)="viewMode.set($event)" />
 * </ui-filter-bar>
 * ```
 */
@Component({
  selector: 'ui-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4' },
  template: `<ng-content />`,
})
export class FilterBarComponent {}
