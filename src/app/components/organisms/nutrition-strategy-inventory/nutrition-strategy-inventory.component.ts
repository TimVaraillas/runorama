import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { NutrientStatComponent } from '../../atoms/nutrient-stat/nutrient-stat.component';
import { NutritionTargetGaugeComponent } from '../../molecules/nutrition-target-gauge/nutrition-target-gauge.component';
import type { NutritionEvent, NutritionEventItem, NutritionProduct } from '../../../core/models';
import { faPlus, faMinus, faTrash, faWeightHanging, faBoxOpen } from '@fortawesome/free-solid-svg-icons';

/** Totaux cumulés de l'inventaire. */
interface InventoryTotals {
  weight: number;
  energy: number;
  carbs: number;
  fats: number;
  proteins: number;
  salt: number;
}

/**
 * Organism : inventaire des produits emportés pour un évènement.
 *
 * Permet d'ajouter/retirer des produits et d'ajuster les quantités, et met à
 * jour en continu les totaux (nutriments + poids) ainsi que la couverture des
 * besoins énergétique et glucidique cibles (jauges).
 */
@Component({
  selector: 'ui-nutrition-strategy-inventory',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    IconComponent,
    ButtonComponent,
    NutrientStatComponent,
    NutritionTargetGaugeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Cibles vs emporté -->
      <section class="grid gap-4 sm:grid-cols-2">
        <ui-nutrition-target-gauge
          label="Énergie"
          unit="kcal"
          [carried]="totals().energy"
          [target]="targetEnergy()"
        />
        <ui-nutrition-target-gauge
          label="Glucides"
          unit="g"
          [carried]="totals().carbs"
          [target]="targetCarbs()"
        />
      </section>

      @if (targetEnergy() === null) {
        <p class="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Définissez un chrono cible sur l'évènement pour comparer l'emporté à vos besoins.
        </p>
      }

      <!-- Totaux -->
      <section class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ui-nutrient-stat label="Poids total" [value]="totals().weight" unit="g" />
        <ui-nutrient-stat label="Énergie" [value]="totals().energy" unit="kcal" />
        <ui-nutrient-stat label="Glucides" [value]="totals().carbs" unit="g" />
        <ui-nutrient-stat label="Lipides" [value]="totals().fats" unit="g" />
        <ui-nutrient-stat label="Protéines" [value]="totals().proteins" unit="g" />
        <ui-nutrient-stat label="Sel" [value]="totals().salt" unit="mg" />
      </section>

      <!-- Ajout d'un produit -->
      <section class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select [(ngModel)]="pickerProductId" [class]="selectClass" aria-label="Choisir un produit à ajouter">
          <option value="">Ajouter un produit…</option>
          @for (product of products(); track product.id) {
            <option [value]="product.id">{{ product.brand }} — {{ product.name }}</option>
          }
        </select>
        <ui-button [icon]="faPlus" [disabled]="!pickerProductId" (clicked)="onAdd()">Ajouter</ui-button>
        @if (products().length === 0) {
          <p class="text-sm text-slate-400">Aucun produit dans votre base. Créez-en dans l'onglet Produits.</p>
        }
      </section>

      <!-- Liste des produits emportés -->
      @if (resolvedItems().length === 0) {
        <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div class="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
            <ui-icon [icon]="faBoxOpen" size="lg" />
          </div>
          <p class="text-slate-600">Aucun produit emporté pour l'instant.</p>
          <p class="text-xs text-slate-400">Ajoutez des produits ci-dessus pour composer votre stratégie.</p>
        </div>
      } @else {
        <ul class="space-y-2">
          @for (item of resolvedItems(); track item.productId) {
            <li class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div class="min-w-0 flex-1">
                <div class="truncate font-medium text-slate-900">{{ item.product.name }}</div>
                <div class="truncate text-xs text-slate-500">
                  {{ item.product.brand }} ·
                  <span class="inline-flex items-center gap-1">
                    <ui-icon [icon]="faWeightHanging" size="sm" />{{ item.product.unitWeight }} g
                  </span>
                  · {{ item.product.energy }} kcal · {{ item.product.carbs }} g gluc.
                </div>
              </div>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  [disabled]="item.quantity <= 1"
                  (click)="onSetQuantity(item.productId, item.quantity - 1)"
                  aria-label="Diminuer la quantité"
                >
                  <ui-icon [icon]="faMinus" size="sm" />
                </button>
                <span class="w-8 text-center text-sm font-semibold tabular-nums text-slate-800">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
                  (click)="onSetQuantity(item.productId, item.quantity + 1)"
                  aria-label="Augmenter la quantité"
                >
                  <ui-icon [icon]="faPlus" size="sm" />
                </button>
              </div>

              <div class="hidden w-28 text-right text-sm tabular-nums text-slate-600 sm:block">
                {{ item.product.energy * item.quantity | number: '1.0-0' }} kcal
              </div>

              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                (click)="remove.emit(item.productId)"
                aria-label="Retirer le produit"
              >
                <ui-icon [icon]="faTrash" size="sm" />
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class NutritionStrategyInventoryComponent {
  /** Évènement dont on gère l'inventaire. */
  readonly event = input.required<NutritionEvent>();
  /** Catalogue des produits disponibles (pour l'ajout). */
  readonly products = input<NutritionProduct[]>([]);

  /** Demande d'ajout d'un produit. */
  readonly add = output<string>();
  /** Changement de quantité d'une ligne. */
  readonly setQuantity = output<{ productId: string; quantity: number }>();
  /** Retrait d'un produit. */
  readonly remove = output<string>();

  protected readonly faPlus = faPlus;
  protected readonly faMinus = faMinus;
  protected readonly faTrash = faTrash;
  protected readonly faWeightHanging = faWeightHanging;
  protected readonly faBoxOpen = faBoxOpen;

  protected readonly selectClass =
    'flex-1 min-w-55 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  /** Produit sélectionné dans le sélecteur d'ajout. */
  protected pickerProductId = '';

  /** Items enrichis du produit résolu (via `item.product` ou le catalogue). */
  protected readonly resolvedItems = computed(() => {
    const catalog = this.products();
    return this.event()
      .items.map((item) => {
        const product = item.product ?? catalog.find((p) => p.id === item.productId);
        return product ? { ...item, product } : null;
      })
      .filter((item): item is NutritionEventItem & { product: NutritionProduct } => item !== null);
  });

  /** Totaux cumulés (nutriments + poids). */
  protected readonly totals = computed<InventoryTotals>(() =>
    this.resolvedItems().reduce<InventoryTotals>(
      (acc, { product, quantity }) => ({
        weight: acc.weight + product.unitWeight * quantity,
        energy: acc.energy + product.energy * quantity,
        carbs: acc.carbs + product.carbs * quantity,
        fats: acc.fats + product.fats * quantity,
        proteins: acc.proteins + product.proteins * quantity,
        salt: acc.salt + product.salt * quantity,
      }),
      { weight: 0, energy: 0, carbs: 0, fats: 0, proteins: 0, salt: 0 },
    ),
  );

  /** Durée cible en heures (null si non définie). */
  private readonly targetHours = computed(() => {
    const minutes = this.event().targetTimeMinutes;
    return minutes && minutes > 0 ? minutes / 60 : null;
  });

  /** Besoin énergétique total cible (kcal), null si pas de chrono. */
  protected readonly targetEnergy = computed(() => {
    const hours = this.targetHours();
    return hours === null ? null : this.event().hourlyEnergy * hours;
  });

  /** Besoin glucidique total cible (g), null si pas de chrono. */
  protected readonly targetCarbs = computed(() => {
    const hours = this.targetHours();
    return hours === null ? null : this.event().hourlyCarbs * hours;
  });

  onAdd(): void {
    if (!this.pickerProductId) return;
    this.add.emit(this.pickerProductId);
    this.pickerProductId = '';
  }

  onSetQuantity(productId: string, quantity: number): void {
    if (quantity < 1) return;
    this.setQuantity.emit({ productId, quantity });
  }
}
