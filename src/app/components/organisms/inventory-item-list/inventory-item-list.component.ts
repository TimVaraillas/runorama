import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import {
  InventoryItemComponent,
  type ResolvedInventoryItem,
} from '../../molecules/inventory-item/inventory-item.component';
import { faBoxOpen } from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : liste des items de l'inventaire.
 *
 * Rend l'état vide quand aucun produit n'est emporté, sinon la liste des
 * lignes `ui-inventory-item`, et relaie les évènements de quantité/retrait.
 */
@Component({
  selector: 'ui-inventory-item-list',
  standalone: true,
  imports: [IconComponent, InventoryItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <div
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"
      >
        <div class="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <ui-icon [icon]="faBoxOpen" size="lg" />
        </div>
        <p class="text-slate-600">Aucun produit emporté pour l'instant.</p>
        <p class="text-xs text-slate-400">
          Cliquez sur « Ajouter des produits » pour composer votre stratégie.
        </p>
      </div>
    } @else {
      <ul class="space-y-2">
        @for (item of items(); track item.productId) {
          <li>
            <ui-inventory-item
              [item]="item"
              (quantityChange)="setQuantity.emit({ productId: item.productId, quantity: $event })"
              (remove)="remove.emit(item.productId)"
            />
          </li>
        }
      </ul>
    }
  `,
})
export class InventoryItemListComponent {
  /** Items de l'inventaire (produits résolus). */
  readonly items = input.required<ResolvedInventoryItem[]>();

  /** Changement de quantité d'une ligne. */
  readonly setQuantity = output<{ productId: string; quantity: number }>();
  /** Retrait d'un produit. */
  readonly remove = output<string>();

  protected readonly faBoxOpen = faBoxOpen;
}
