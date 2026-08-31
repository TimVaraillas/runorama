import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon.component';
import { QuantityStepperComponent } from '../../atoms/quantity-stepper/quantity-stepper.component';
import type { RaceStrategyItem, NutritionProduct } from '../../../core/models';
import { faAppleWhole, faTrash } from '@fortawesome/free-solid-svg-icons';

/** Item d'inventaire dont le produit a été résolu (jamais `null`). */
export type ResolvedInventoryItem = RaceStrategyItem & { product: NutritionProduct };

/**
 * Molecule : une ligne de l'inventaire des produits emportés.
 *
 * Affiche le produit, ses valeurs cumulées (énergie/glucides selon la
 * quantité), un sélecteur de quantité et un bouton de retrait.
 */
@Component({
  selector: 'ui-inventory-item',
  standalone: true,
  imports: [DecimalPipe, IconComponent, QuantityStepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div
        class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-300"
      >
        @if (item().product.image) {
          <img
            [src]="item().product.image"
            [alt]="item().product.name"
            class="h-full w-full object-cover"
          />
        } @else {
          <ui-icon [icon]="faAppleWhole" size="lg" />
        }
      </div>

      <div class="min-w-0 flex-1">
        <div class="truncate font-medium text-slate-900">{{ item().product.name }}</div>
        <div class="truncate text-xs text-slate-500">
          {{ item().product.brand }} ·
          <span class="inline-flex items-center gap-1">{{ item().product.unitWeight }} g</span>
          · {{ item().product.energy }} kcal · {{ item().product.carbs }} g gluc.
        </div>
      </div>

      <div class="mr-4 hidden w-28 text-right text-xs tabular-nums text-slate-400 sm:block">
        <div>{{ item().product.energy * item().quantity | number: '1.0-0' }} kcal</div>
        <div>{{ item().product.carbs * item().quantity | number: '1.0-0' }} g gluc.</div>
      </div>

      <ui-quantity-stepper [value]="item().quantity" (valueChange)="quantityChange.emit($event)" />

      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        (click)="remove.emit()"
        aria-label="Retirer le produit"
      >
        <ui-icon [icon]="faTrash" size="sm" />
      </button>
    </div>
  `,
})
export class InventoryItemComponent {
  /** Item d'inventaire à afficher (produit résolu). */
  readonly item = input.required<ResolvedInventoryItem>();

  /** Émis quand la quantité change. */
  readonly quantityChange = output<number>();
  /** Émis quand l'utilisateur retire le produit. */
  readonly remove = output<void>();

  protected readonly faTrash = faTrash;
  protected readonly faAppleWhole = faAppleWhole;
}
