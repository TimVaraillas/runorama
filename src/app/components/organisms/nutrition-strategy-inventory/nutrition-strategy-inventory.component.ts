import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../atoms/icon/icon.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { NutrientStatComponent } from '../../atoms/nutrient-stat/nutrient-stat.component';
import { SearchInputComponent } from '../../atoms/search-input/search-input.component';
import { FilterBarComponent } from '../../molecules/filter-bar/filter-bar.component';
import { SidePanelComponent } from '../../molecules/side-panel/side-panel.component';
import { NutritionTargetGaugeComponent } from '../../molecules/nutrition-target-gauge/nutrition-target-gauge.component';
import { NutritionProductTableComponent } from '../nutrition-product-table/nutrition-product-table.component';
import { DividerComponent } from '../../atoms/divider/divider.component';
import { InventoryItemListComponent } from '../inventory-item-list/inventory-item-list.component';
import { NutritionGoalsEditorComponent } from '../../molecules/nutrition-goals-editor/nutrition-goals-editor.component';
import {
  type NutritionCategory,
  type NutritionEvent,
  type NutritionEventItem,
  type NutritionGoals,
  type NutritionProduct,
} from '../../../core/models';
import { enabledGoals, resolveGoals } from '../../../core/utils/nutrition-goals.util';
import { faPlus, faWeightHanging, faXmark, faCheck, faSliders, faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';

/** Totaux cumulés de l'inventaire. */
interface InventoryTotals {
  weight: number;
  energy: number;
  carbs: number;
  fats: number;
  proteins: number;
  sodium: number;
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
    IconComponent,
    ButtonComponent,
    NutrientStatComponent,
    SearchInputComponent,
    FilterBarComponent,
    SidePanelComponent,
    NutritionTargetGaugeComponent,
    NutritionProductTableComponent,
    DividerComponent,
    InventoryItemListComponent,
    NutritionGoalsEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Objectifs nutritionnels : jauges (lecture) + édition inline -->
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-md font-semibold text-slate-700">Objectifs nutritionnels</h2>
          @if (!editingGoals()) {
            <button
              type="button"
              (click)="startEditGoals()"
              class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <ui-icon [icon]="faSliders" size="sm" />
              Ajuster
            </button>
          }
        </div>

        @if (editingGoals()) {
          <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <ui-nutrition-goals-editor
              [goals]="draftGoals()!"
              (goalsChange)="draftGoals.set($event)"
            />

            <div class="flex items-center justify-end gap-2 mt-3">
              <ui-button
                type="button"
                color="default"
                variant="ghost"
                (clicked)="cancelEditGoals()"
              >
                Annuler
              </ui-button>
              <ui-button type="button" color="secondary" [icon]="faCheck" (clicked)="saveGoals()">
                Enregistrer
              </ui-button>
            </div>
          </div>
        } @else if (goalGauges().length > 0) {
          <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            @for (gauge of goalGauges(); track gauge.key) {
              <ui-nutrition-target-gauge
                [label]="gauge.label"
                [unit]="gauge.unit"
                [carried]="gauge.carried"
                [target]="gauge.target"
              />
            }
          </div>

          @if (targetHours() === null && hasHourlyGoals()) {
            <p class="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              Définissez un chrono cible sur l'évènement pour comparer l'emporté à vos besoins.
            </p>
          }
        } @else {
          <p
            class="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-400"
          >
            Aucun objectif défini. Cliquez sur « Ajuster » pour en ajouter un.
          </p>
        }
      </section>

      <!-- Totaux -->
      <section class="grid grid-cols-3 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <ui-nutrient-stat label="Poids total" [value]="totals().weight" unit="g" />
        <ui-nutrient-stat label="Énergie" [value]="totals().energy" unit="kcal" />
        <ui-nutrient-stat label="Glucides" [value]="totals().carbs" unit="g" />
        <ui-nutrient-stat label="Lipides" [value]="totals().fats" unit="g" />
        <ui-nutrient-stat label="Protéines" [value]="totals().proteins" unit="g" />
        <ui-nutrient-stat label="Sodium" [value]="totals().sodium" unit="mg" />
      </section>

      <ui-divider class="my-10" variant="solid" />

      <!-- Produits emportés -->
      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-md font-semibold text-slate-700">Inventaire des produits emportés</h2>
          <ui-button [icon]="faPlus" [disabled]="products().length === 0" (clicked)="openPicker()">
            Ajouter des produits
          </ui-button>
        </div>

        <ui-inventory-item-list
          [items]="resolvedItems()"
          (setQuantity)="onSetQuantity($event.productId, $event.quantity)"
          (remove)="remove.emit($event)"
        />
      </section>
    </div>

    <!-- Panneau : sélecteur de produits -->
    <ui-side-panel [open]="pickerOpen()" ariaLabel="Ajouter des produits" (close)="closePicker()" size="xl">
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
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                  [class.border-amber-300]="pickerFavoritesOnly()"
                  [class.bg-amber-50]="pickerFavoritesOnly()"
                  [class.text-amber-700]="pickerFavoritesOnly()"
                  [class.border-slate-300]="!pickerFavoritesOnly()"
                  [class.text-slate-600]="!pickerFavoritesOnly()"
                  [class.hover:bg-slate-50]="!pickerFavoritesOnly()"
                  (click)="pickerFavoritesOnly.set(!pickerFavoritesOnly())"
                  [attr.aria-pressed]="pickerFavoritesOnly()"
                >
                  <ui-icon [icon]="pickerFavoritesOnly() ? faStarSolid : faStarRegular" size="sm" />
                  Favoris
                </button>
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
                  [showPersonalActions]="true"
                  (toggleSelect)="onToggleSelect($event.id)"
                  (toggleFavorite)="onToggleFavorite($event)"
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
  /** Demande de mise à jour des objectifs nutritionnels (édition inline). */
  readonly goalsChange = output<NutritionGoals>();
  /** Bascule un produit du catalogue dans les favoris de l'utilisateur. */
  readonly toggleFavorite = output<NutritionProduct>();

  protected readonly faPlus = faPlus;
  protected readonly faWeightHanging = faWeightHanging;
  protected readonly faXmark = faXmark;
  protected readonly faCheck = faCheck;
  protected readonly faSliders = faSliders;
  protected readonly faStarSolid = faStarSolid;
  protected readonly faStarRegular = faStarRegular;

  /** Édition inline des objectifs nutritionnels. */
  protected readonly editingGoals = signal(false);
  /** Copie de travail des objectifs pendant l'édition. */
  protected readonly draftGoals = signal<NutritionGoals | null>(null);

  protected readonly selectClass =
    'min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  /** Ouverture du panneau de sélection de produits. */
  protected readonly pickerOpen = signal(false);
  /** Recherche texte du sélecteur de produits (titre ou marque). */
  protected readonly pickerSearch = signal('');
  /** Filtre catégorie du sélecteur de produits. */
  protected readonly pickerCategory = signal('');
  /** Ne montrer que les produits favoris dans le sélecteur. */
  protected readonly pickerFavoritesOnly = signal(false);
  /** Identifiants des produits sélectionnés dans le panneau. */
  protected readonly selectedIds = signal<Set<string>>(new Set());

  /** Produits filtrés par recherche (titre/marque), catégorie et favoris. */
  protected readonly filteredPickerProducts = computed(() => {
    const term = this.pickerSearch().trim().toLowerCase();
    const categoryId = this.pickerCategory();
    const favoritesOnly = this.pickerFavoritesOnly();
    return this.products().filter((product) => {
      const matchesCategory = !categoryId || product.categoryId === categoryId;
      const matchesFavorite = !favoritesOnly || product.favorite === true;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term);
      return matchesCategory && matchesFavorite && matchesTerm;
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
        sodium: acc.sodium + product.sodium * quantity,
      }),
      { weight: 0, energy: 0, carbs: 0, fats: 0, proteins: 0, sodium: 0 },
    ),
  );

  /** Durée cible en heures (null si non définie). */
  protected readonly targetHours = computed(() => {
    const minutes = this.event().targetTimeMinutes;
    return minutes && minutes > 0 ? minutes / 60 : null;
  });

  /**
   * Jauges à afficher : une par objectif actif. Pour un objectif horaire, la
   * cible vaut le besoin horaire × chrono (ou null sans chrono) ; pour un
   * objectif « total » (poids), la cible est la valeur fixée directement.
   */
  protected readonly goalGauges = computed(() => {
    const hours = this.targetHours();
    const totals = this.totals();
    return enabledGoals(this.event()).map((goal) => ({
      key: goal.key,
      label: goal.label,
      unit: goal.unit,
      carried: totals[goal.key],
      target:
        goal.mode === 'total' ? goal.hourly : hours === null ? null : goal.hourly * hours,
    }));
  });

  /** Vrai si au moins un objectif horaire est actif (pour l'avertissement chrono). */
  protected readonly hasHourlyGoals = computed(() =>
    enabledGoals(this.event()).some((goal) => goal.mode === 'hourly'),
  );

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

  /** Relaye l'ajout/retrait d'un produit des favoris vers la page. */
  onToggleFavorite(product: NutritionProduct): void {
    this.toggleFavorite.emit(product);
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

  // --- Édition inline des objectifs nutritionnels ---

  /** Ouvre l'édition inline en partant des objectifs résolus de l'évènement. */
  protected startEditGoals(): void {
    this.draftGoals.set(resolveGoals(this.event()));
    this.editingGoals.set(true);
  }

  /** Annule l'édition inline sans enregistrer. */
  protected cancelEditGoals(): void {
    this.editingGoals.set(false);
    this.draftGoals.set(null);
  }

  /** Enregistre les objectifs édités : émet vers la page puis referme l'édition. */
  protected saveGoals(): void {
    const draft = this.draftGoals();
    if (draft) this.goalsChange.emit(draft);
    this.editingGoals.set(false);
    this.draftGoals.set(null);
  }
}
