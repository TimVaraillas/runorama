import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';
import { faAppleWhole, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';

/** Mode d'affichage du tableau : gestion (édition/suppression) ou sélection. */
export type ProductTableMode = 'manage' | 'picker';

/**
 * Organism : affichage d'une liste de produits sous forme de tableau.
 *
 * Deux modes :
 * - `manage` (défaut) : toutes les colonnes nutritionnelles + actions
 *   d'édition et de suppression par ligne.
 * - `picker` : colonnes essentielles (poids, énergie, glucides) et case à
 *   cocher pour la sélection multiple (émet `toggleSelect`). Réutilisé dans
 *   l'inventaire d'une stratégie alimentaire.
 */
@Component({
  selector: 'ui-nutrition-product-table',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            @if (mode() === 'picker') {
              <th class="w-10 px-4 py-3"></th>
            }
            <th class="px-4 py-3 font-medium">Produit</th>
            <th class="px-4 py-3 font-medium">Catégorie</th>
            <th class="px-4 py-3 text-right font-medium">Poids</th>
            <th class="px-4 py-3 text-right font-medium">Énergie</th>
            <th class="px-4 py-3 text-right font-medium">Gluc.</th>
            @if (mode() !== 'picker') {
              <th class="px-4 py-3 text-right font-medium">Lip.</th>
              <th class="px-4 py-3 text-right font-medium">Prot.</th>
              <th class="px-4 py-3 text-right font-medium">Sel</th>
              <th class="px-4 py-3"></th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          @for (product of products(); track product.id) {
            <tr
              class="transition-colors hover:bg-slate-50"
              [class.cursor-pointer]="mode() === 'picker'"
              [class.bg-brand-50]="mode() === 'picker' && isSelected(product.id)"
              (click)="mode() === 'picker' ? toggleSelect.emit(product) : null"
            >
              @if (mode() === 'picker') {
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    [checked]="isSelected(product.id)"
                    tabindex="-1"
                    aria-hidden="true"
                    class="pointer-events-none h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                </td>
              }
              <td class="min-w-52 max-w-64 px-4 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-300"
                  >
                    @if (product.image) {
                      <img [src]="product.image" [alt]="product.name" class="h-full w-full object-cover" />
                    } @else {
                      <ui-icon [icon]="faAppleWhole" size="sm" />
                    }
                  </div>
                  <div class="min-w-0">
                    <div class="truncate font-medium text-slate-900">{{ product.name }}</div>
                    <div class="truncate text-xs text-slate-500">{{ product.brand }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <ui-badge tone="accent">{{ labelFor(product.categoryId) }}</ui-badge>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.unitWeight }} g</td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.energy }} kcal</td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.carbs }} g</td>
              @if (mode() !== 'picker') {
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.fats }} g</td>
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.proteins }} g</td>
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.salt }} mg</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                      (click)="edit.emit(product)"
                      aria-label="Modifier le produit"
                    >
                      <ui-icon [icon]="faPen" size="sm" />
                    </button>
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      (click)="delete.emit(product)"
                      aria-label="Supprimer le produit"
                    >
                      <ui-icon [icon]="faTrash" size="sm" />
                    </button>
                  </div>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class NutritionProductTableComponent {
  /** Produits à afficher. */
  readonly products = input<NutritionProduct[]>([]);
  /** Catégories disponibles (pour résoudre le nom affiché). */
  readonly categories = input<NutritionCategory[]>([]);
  /** Mode d'affichage (`manage` par défaut). */
  readonly mode = input<ProductTableMode>('manage');
  /** Identifiants des produits sélectionnés (mode `picker`). */
  readonly selectedIds = input<Set<string>>(new Set());

  readonly edit = output<NutritionProduct>();
  readonly delete = output<NutritionProduct>();
  /** Bascule de sélection d'un produit (mode `picker`). */
  readonly toggleSelect = output<NutritionProduct>();

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;

  protected labelFor(categoryId: string): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '—';
  }

  /** Indique si un produit est sélectionné (mode `picker`). */
  protected isSelected(productId: string): boolean {
    return this.selectedIds().has(productId);
  }
}
