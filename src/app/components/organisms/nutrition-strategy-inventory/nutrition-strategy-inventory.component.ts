import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { NutrientStatComponent } from '../../atoms/nutrient-stat/nutrient-stat.component';
import { SearchInputComponent } from '../../atoms/search-input/search-input.component';
import { FilterBarComponent } from '../../molecules/filter-bar/filter-bar.component';
import { SidePanelComponent } from '../../molecules/side-panel/side-panel.component';
import { NutritionTargetGaugeComponent } from '../../molecules/nutrition-target-gauge/nutrition-target-gauge.component';
import { NutritionProductTableComponent } from '../nutrition-product-table/nutrition-product-table.component';
import { QuantityStepperComponent } from '../../atoms/quantity-stepper/quantity-stepper.component';
import { DividerComponent } from '../../atoms/divider/divider.component';
import type {
  NutritionCategory,
  NutritionEvent,
  NutritionEventItem,
  NutritionProduct,
} from '../../../core/models';
import { faPlus, faTrash, faWeightHanging, faBoxOpen, faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';

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
    SearchInputComponent,
    FilterBarComponent,
    SidePanelComponent,
    NutritionTargetGaugeComponent,
    NutritionProductTableComponent,
    QuantityStepperComponent,
    DividerComponent,
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

      <ui-divider class="my-10" variant="solid" />

      <!-- Produits emportés -->
      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-slate-700">Produits emportés</h2>
          <ui-button [icon]="faPlus" [disabled]="products().length === 0" (clicked)="openPicker()">
            Ajouter des produits
          </ui-button>
        </div>

        @if (resolvedItems().length === 0) {
          <div class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
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
            @for (item of resolvedItems(); track item.productId) {
              <li class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-slate-900">{{ item.product.name }}</div>
                  <div class="truncate text-xs text-slate-500">
                    {{ item.product.brand }} ·
                    <span class="inline-flex items-center gap-1">
                      {{ item.product.unitWeight }} g
                    </span>
                    · {{ item.product.energy }} kcal · {{ item.product.carbs }} g gluc.
                  </div>
                </div>

                <div class="hidden w-28 mr-4 text-right text-xs tabular-nums text-slate-400 sm:block">
                  <div>{{ item.product.energy * item.quantity | number: '1.0-0' }} kcal</div>
                  <div>{{ item.product.carbs * item.quantity | number: '1.0-0' }} g gluc.</div>
                </div>

                <ui-quantity-stepper
                  [value]="item.quantity"
                  (valueChange)="onSetQuantity(item.productId, $event)"
                />

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
      </section>
    </div>

    <!-- Panneau : sélecteur de produits -->
    <ui-side-panel [open]="pickerOpen()" ariaLabel="Ajouter des produits" (close)="closePicker()">
      @if (pickerOpen()) {
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 class="font-display text-lg font-bold text-slate-900">Ajouter des produits</h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="closePicker()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>
          <div class="flex-1 space-y-4 overflow-y-auto p-6">
            @if (products().length === 0) {
              <p class="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                Aucun produit dans votre base. Créez-en dans l'onglet Produits.
              </p>
            } @else {
              <ui-filter-bar>
                <ui-search-input
                  [(value)]="pickerSearch"
                  placeholder="Rechercher par titre ou marque…"
                  ariaLabel="Rechercher un produit à ajouter"
                />
                <select
                  [ngModel]="pickerCategory()"
                  (ngModelChange)="pickerCategory.set($event)"
                  [class]="selectClass"
                  aria-label="Filtrer par catégorie"
                >
                  <option value="">Toutes les catégories</option>
                  @for (category of categories(); track category.id) {
                    <option [value]="category.id">{{ category.name }}</option>
                  }
                </select>
              </ui-filter-bar>

              @if (filteredPickerProducts().length === 0) {
                <p class="px-1 py-6 text-center text-sm text-slate-400">
                  Aucun produit ne correspond à votre recherche.
                </p>
              } @else {
                <ui-nutrition-product-table
                  mode="picker"
                  [products]="filteredPickerProducts()"
                  [categories]="categories()"
                  [selectedIds]="selectedIds()"
                  (toggleSelect)="onToggleSelect($event.id)"
                />
              }
            }
          </div>

          @if (products().length > 0) {
            <div class="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <span class="text-sm text-slate-500">
                {{ selectedIds().size }} produit{{ selectedIds().size > 1 ? 's' : '' }} sélectionné{{ selectedIds().size > 1 ? 's' : '' }}
              </span>
              <ui-button [icon]="faCheck" (clicked)="confirmSelection()">Enregistrer</ui-button>
            </div>
          }
        </div>
      }
    </ui-side-panel>
  `,
})
export class NutritionStrategyInventoryComponent {
  /** Évènement dont on gère l'inventaire. */
  readonly event = input.required<NutritionEvent>();
  /** Catalogue des produits disponibles (pour l'ajout). */
  readonly products = input<NutritionProduct[]>([]);
  /** Catégories disponibles (pour filtrer le sélecteur de produits). */
  readonly categories = input<NutritionCategory[]>([]);

  /** Demande de mise à jour de l'inventaire à partir de la sélection. */
  readonly applySelection = output<string[]>();
  /** Changement de quantité d'une ligne. */
  readonly setQuantity = output<{ productId: string; quantity: number }>();
  /** Retrait d'un produit. */
  readonly remove = output<string>();

  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;
  protected readonly faWeightHanging = faWeightHanging;
  protected readonly faBoxOpen = faBoxOpen;
  protected readonly faXmark = faXmark;
  protected readonly faCheck = faCheck;

  protected readonly selectClass =
    'min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  /** Ouverture du panneau de sélection de produits. */
  protected readonly pickerOpen = signal(false);
  /** Recherche texte du sélecteur de produits (titre ou marque). */
  protected readonly pickerSearch = signal('');
  /** Filtre catégorie du sélecteur de produits. */
  protected readonly pickerCategory = signal('');
  /** Identifiants des produits sélectionnés dans le panneau. */
  protected readonly selectedIds = signal<Set<string>>(new Set());

  /** Produits filtrés par recherche (titre/marque) et catégorie. */
  protected readonly filteredPickerProducts = computed(() => {
    const term = this.pickerSearch().trim().toLowerCase();
    const categoryId = this.pickerCategory();
    return this.products().filter((product) => {
      const matchesCategory = !categoryId || product.categoryId === categoryId;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  });

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

  /** Bascule la sélection d'un produit dans le panneau. */
  onToggleSelect(productId: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    this.selectedIds.set(next);
  }

  /** Valide la sélection : met à jour l'inventaire puis ferme le panneau. */
  confirmSelection(): void {
    this.applySelection.emit(Array.from(this.selectedIds()));
    this.pickerOpen.set(false);
  }

  /** Ouvre le panneau de sélection de produits. */
  openPicker(): void {
    this.selectedIds.set(new Set(this.event().items.map((item) => item.productId)));
    this.pickerOpen.set(true);
  }

  /** Ferme le panneau de sélection de produits. */
  closePicker(): void {
    this.pickerOpen.set(false);
  }

  onSetQuantity(productId: string, quantity: number): void {
    if (quantity < 1) return;
    this.setQuantity.emit({ productId, quantity });
  }
}
