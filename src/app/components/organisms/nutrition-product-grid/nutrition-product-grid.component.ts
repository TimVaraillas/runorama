import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NutritionProductCardComponent } from '../../molecules/nutrition-product-card/nutrition-product-card.component';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';

/**
 * Organism : affichage d'une liste de produits sous forme de grille de cartes.
 */
@Component({
  selector: 'ui-nutrition-product-grid',
  standalone: true,
  imports: [NutritionProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      @for (product of products(); track product.id) {
        <ui-nutrition-product-card
          [product]="product"
          [categoryLabel]="labelFor(product.categoryId)"
          [readonly]="readonly()"
          [showStatus]="showStatus()"
          [currentUserId]="currentUserId()"
          [isAdmin]="isAdmin()"
          (edit)="edit.emit($event)"
          (delete)="delete.emit($event)"
          (approve)="approve.emit($event)"
          (reject)="reject.emit($event)"
          (archive)="archive.emit($event)"
        />
      }
    </div>
  `,
})
export class NutritionProductGridComponent {
  /** Produits à afficher. */
  readonly products = input<NutritionProduct[]>([]);
  /** Catégories disponibles (pour résoudre le nom affiché). */
  readonly categories = input<NutritionCategory[]>([]);
  /** Masque les actions d'édition/suppression (lecture seule). */
  readonly readonly = input(false);
  /** Affiche le badge de statut de modération. */
  readonly showStatus = input(false);
  /** Identifiant de l'utilisateur courant (droits d'action). */
  readonly currentUserId = input<string | null>(null);
  /** Vrai si l'utilisateur courant est administrateur. */
  readonly isAdmin = input(false);

  readonly edit = output<NutritionProduct>();
  readonly delete = output<NutritionProduct>();
  /** Validation d'un produit (admin). */
  readonly approve = output<NutritionProduct>();
  /** Refus d'un produit (admin). */
  readonly reject = output<NutritionProduct>();
  /** Archivage d'un produit (admin). */
  readonly archive = output<NutritionProduct>();

  protected labelFor(categoryId: string): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '';
  }
}
