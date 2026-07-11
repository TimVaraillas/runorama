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
          (edit)="edit.emit($event)"
          (delete)="delete.emit($event)"
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

  readonly edit = output<NutritionProduct>();
  readonly delete = output<NutritionProduct>();

  protected labelFor(categoryId: string): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '';
  }
}
