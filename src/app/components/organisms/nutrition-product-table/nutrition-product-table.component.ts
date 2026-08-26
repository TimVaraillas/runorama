import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { ProductStatusBadgeComponent } from '../../atoms/product-status-badge/product-status-badge.component';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';
import { productCapabilities, type ProductCapabilities } from '../../../core/utils/product-moderation.util';
import { faAppleWhole, faBoxArchive, faCheck, faHeartPulse, faPen, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarSolid, faNoteSticky as faNoteSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular, faNoteSticky as faNoteRegular } from '@fortawesome/free-regular-svg-icons';

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
  imports: [IconComponent, BadgeComponent, ProductStatusBadgeComponent],
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
            @if (showStatus() && mode() !== 'picker') {
              <th class="px-4 py-3 font-medium">Statut</th>
            }
            <th class="px-4 py-3 text-right font-medium">Poids</th>
            <th class="px-4 py-3 text-right font-medium">Énergie</th>
            <th class="px-4 py-3 text-right font-medium">Gluc.</th>
            @if (mode() !== 'picker') {
              <th class="px-4 py-3 text-right font-medium">Lip.</th>
              <th class="px-4 py-3 text-right font-medium">Prot.</th>
              <th class="px-4 py-3 text-right font-medium">Sodium</th>
              @if (!readonly()) {
                <th class="px-4 py-3"></th>
              }
            }
            @if (showPersonalActions() && mode() === 'picker') {
              <th class="w-12 px-4 py-3 text-center font-medium"></th>
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
                    @if (mode() !== 'picker' && (product.taste != null || product.tolerance != null)) {
                      <div class="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                        @if (product.taste != null) {
                          <span
                            class="flex items-center gap-1"
                            [title]="'Appréciation gustative moyenne'"
                          >
                            <ui-icon [icon]="faStarSolid" size="xs" class="text-amber-400" />
                            {{ product.taste }}/5
                          </span>
                        }
                        @if (product.tolerance != null) {
                          <span
                            class="flex items-center gap-1"
                            [title]="'Tolérance digestive moyenne'"
                          >
                            <ui-icon [icon]="faHeartPulse" size="xs" class="text-emerald-400" />
                            {{ product.tolerance }}/5
                          </span>
                        }
                        @if (product.eventCount) {
                          <span [title]="'Nombre de courses'">· {{ product.eventCount }} course(s)</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <ui-badge tone="accent">{{ labelFor(product.categoryId) }}</ui-badge>
              </td>
              @if (showStatus() && mode() !== 'picker') {
                <td class="px-4 py-3">
                  <ui-product-status-badge
                    [status]="product.moderationStatus"
                    [showApproved]="isAdmin()"
                  />
                </td>
              }
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.unitWeight }} g</td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.energy }} kcal</td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.carbs }} g</td>
              @if (mode() !== 'picker') {
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.fats }} g</td>
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.proteins }} g</td>
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">{{ product.sodium }} mg</td>
                @if (!readonly()) {
                  <td class="px-4 py-3">
                    @let caps = capabilities(product);
                    <div class="flex items-center justify-end gap-1">
                      @if (showPersonalActions()) {
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-amber-50"
                          [class.text-amber-400]="product.favorite"
                          [class.text-slate-300]="!product.favorite"
                          [class.hover:text-amber-400]="!product.favorite"
                          (click)="toggleFavorite.emit(product)"
                          [attr.aria-pressed]="product.favorite"
                          [attr.aria-label]="product.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                          [title]="product.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                        >
                          <ui-icon [icon]="product.favorite ? faStarSolid : faStarRegular" size="sm" />
                        </button>
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-brand-50 hover:text-brand-600"
                          [class.text-brand-500]="product.comment"
                          [class.text-slate-300]="!product.comment"
                          (click)="editNote.emit(product)"
                          [attr.aria-label]="product.comment ? 'Modifier ma note' : 'Ajouter une note'"
                          [title]="product.comment ? 'Modifier ma note' : 'Ajouter une note'"
                        >
                          <ui-icon [icon]="product.comment ? faNoteSolid : faNoteRegular" size="sm" />
                        </button>
                      }
                      @if (caps.canApprove) {
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                          (click)="approve.emit(product)"
                          aria-label="Valider le produit"
                          title="Valider"
                        >
                          <ui-icon [icon]="faCheck" size="sm" />
                        </button>
                      }
                      @if (caps.canReject) {
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          (click)="reject.emit(product)"
                          aria-label="Refuser le produit"
                          title="Refuser"
                        >
                          <ui-icon [icon]="faXmark" size="sm" />
                        </button>
                      }
                      @if (caps.canArchive) {
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                          (click)="archive.emit(product)"
                          aria-label="Archiver le produit"
                          title="Archiver"
                        >
                          <ui-icon [icon]="faBoxArchive" size="sm" />
                        </button>
                      }
                      @if (caps.canEdit) {
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                          (click)="edit.emit(product)"
                          aria-label="Modifier le produit"
                        >
                          <ui-icon [icon]="faPen" size="sm" />
                        </button>
                      }
                      @if (caps.canDelete) {
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          (click)="delete.emit(product)"
                          aria-label="Supprimer le produit"
                        >
                          <ui-icon [icon]="faTrash" size="sm" />
                        </button>
                      }
                    </div>
                  </td>
                }
              }
              @if (showPersonalActions() && mode() === 'picker') {
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    class="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-amber-50 mx-auto"
                    [class.text-amber-400]="product.favorite"
                    [class.text-slate-300]="!product.favorite"
                    [class.hover:text-amber-400]="!product.favorite"
                    (click)="$event.stopPropagation(); toggleFavorite.emit(product)"
                    [attr.aria-pressed]="product.favorite"
                    [attr.aria-label]="product.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                    [title]="product.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                  >
                    <ui-icon [icon]="product.favorite ? faStarSolid : faStarRegular" size="sm" />
                  </button>
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
  /** Masque la colonne d'actions (lecture seule). */
  readonly readonly = input(false);
  /** Affiche la colonne de statut de modération. */
  readonly showStatus = input(false);
  /** Identifiant de l'utilisateur courant (droits par ligne). */
  readonly currentUserId = input<string | null>(null);
  /** Vrai si l'utilisateur courant est administrateur. */
  readonly isAdmin = input(false);
  /** Identifiants des produits sélectionnés (mode `picker`). */
  readonly selectedIds = input<Set<string>>(new Set());
  /** Affiche les actions personnelles (favori + note) par ligne. */
  readonly showPersonalActions = input(false);

  readonly edit = output<NutritionProduct>();
  readonly delete = output<NutritionProduct>();
  /** Validation d'un produit (admin). */
  readonly approve = output<NutritionProduct>();
  /** Refus d'un produit (admin). */
  readonly reject = output<NutritionProduct>();
  /** Archivage d'un produit (admin). */
  readonly archive = output<NutritionProduct>();
  /** Bascule de sélection d'un produit (mode `picker`). */
  readonly toggleSelect = output<NutritionProduct>();
  /** Bascule le produit dans les favoris de l'utilisateur. */
  readonly toggleFavorite = output<NutritionProduct>();
  /** Demande d'édition de la note personnelle. */
  readonly editNote = output<NutritionProduct>();

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
  protected readonly faBoxArchive = faBoxArchive;
  protected readonly faHeartPulse = faHeartPulse;
  protected readonly faStarSolid = faStarSolid;
  protected readonly faStarRegular = faStarRegular;
  protected readonly faNoteSolid = faNoteSolid;
  protected readonly faNoteRegular = faNoteRegular;

  protected labelFor(categoryId: string): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '—';
  }

  /** Capacités d'action sur un produit pour l'utilisateur courant. */
  protected capabilities(product: NutritionProduct): ProductCapabilities {
    return productCapabilities(product, this.currentUserId(), this.isAdmin());
  }

  /** Indique si un produit est sélectionné (mode `picker`). */
  protected isSelected(productId: string): boolean {
    return this.selectedIds().has(productId);
  }
}
