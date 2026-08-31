import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Molecule : barre de filtres réutilisable.
 *
 * Fournit l'habillage visuel commun à toutes les barres de filtres de
 * l'application (séparateur en bas, espacement horizontal, retour à la ligne
 * responsive). Le contenu (champ de recherche, sélecteurs, bascule de vue…)
 * est projeté via `<ng-content>`.
 *
 * `nowrap` force tout sur une seule ligne au lieu du retour à la ligne par
 * défaut. On évite `overflow` sur la barre : il créerait un contexte de rognage
 * qui masquerait les listes déroulantes des filtres (elles débordent vers le
 * bas).
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
  host: {
    class: 'flex items-center gap-3 border-b border-slate-200 pb-4',
    '[class.flex-wrap]': '!nowrap()',
    '[class.flex-nowrap]': 'nowrap()',
  },
  template: `<ng-content />`,
})
export class FilterBarComponent {
  /** Force l'affichage sur une seule ligne (pas de retour à la ligne). */
  readonly nowrap = input(false);
}
