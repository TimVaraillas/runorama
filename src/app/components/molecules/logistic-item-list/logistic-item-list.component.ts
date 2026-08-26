import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { QuantityStepperComponent } from '../../atoms/quantity-stepper/quantity-stepper.component';
import type { LogisticItem, NutritionProduct } from '../../../core/models';
import { faBoxOpen, faPlus, faScrewdriverWrench, faTrash } from '@fortawesome/free-solid-svg-icons';

/**
 * Molecule contrôlée : édite une liste d'éléments logistiques (à récupérer ou à
 * déposer). Chaque élément est soit un produit du
 * catalogue, soit du matériel libre, avec une quantité.
 *
 * Composant piloté : reçoit `items` et émet la nouvelle liste via `itemsChange`
 * à chaque modification (ajout, retrait, quantité).
 */
@Component({
  selector: 'ui-logistic-item-list',
  standalone: true,
  imports: [IconComponent, QuantityStepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <ui-icon [icon]="icon()" size="sm" class="text-slate-400" />
        <h4 class="text-sm font-semibold text-slate-800">{{ title() }}</h4>
      </div>

      @if (items().length === 0) {
        <p class="text-xs text-slate-400">{{ emptyLabel() }}</p>
      } @else {
        <ul class="space-y-1.5">
          @for (item of items(); track $index) {
            <li class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm text-slate-800">{{ label(item) }}</div>
                @if (item.kind === 'product' && brand(item); as b) {
                  <div class="truncate text-xs text-slate-400">{{ b }}</div>
                }
              </div>
              <ui-quantity-stepper
                [value]="item.quantity"
                [max]="maxFor(item)"
                (valueChange)="setQuantity($index, $event)"
              />
              <button
                type="button"
                class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                (click)="removeAt($index)"
                aria-label="Retirer l'élément"
              >
                <ui-icon [icon]="faTrash" size="sm" />
              </button>
            </li>
          }
        </ul>
      }

      <!-- Ligne d'ajout -->
      <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-2.5">
        <div class="mb-2 inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            [class]="tabClass(addKind() === 'product')"
            (click)="addKind.set('product')"
          >
            Nutrition
          </button>
          <button
            type="button"
            [class]="tabClass(addKind() === 'gear')"
            (click)="addKind.set('gear')"
          >
            Matériel
          </button>
        </div>

        @if (addKind() === 'product') {
          @if (inventoryMode() && selectableProducts().length === 0) {
            <p class="px-1 py-1.5 text-xs text-slate-400">
              Tous les produits de l'inventaire sont déjà répartis sur les ravitaillements.
            </p>
          } @else {
            <div class="flex items-center gap-2">
              <select
                [class]="selectClass"
                [value]="selectedProductId()"
                (change)="selectedProductId.set($any($event.target).value)"
                aria-label="Choisir un produit"
              >
                <option value="">Choisir un produit…</option>
                @for (product of selectableProducts(); track product.id) {
                  <option [value]="product.id">{{ product.brand }} — {{ product.name }}</option>
                }
              </select>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
                [disabled]="!selectedProductId()"
                (click)="addProduct()"
              >
                <ui-icon [icon]="faPlus" size="sm" /> Ajouter
              </button>
            </div>
          }
        } @else {
          <div class="flex items-center gap-2">
            <input
              type="text"
              [class]="inputClass"
              [value]="gearLabel()"
              (input)="gearLabel.set($any($event.target).value)"
              (keydown.enter)="addGear(); $event.preventDefault()"
              placeholder="Ex : Lampe frontale, veste…"
              aria-label="Nom du matériel"
            />
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
              [disabled]="!gearLabel().trim()"
              (click)="addGear()"
            >
              <ui-icon [icon]="faPlus" size="sm" /> Ajouter
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class LogisticItemListComponent {
  /** Titre de la liste (ex : « À récupérer »). */
  readonly title = input.required<string>();
  /** Texte affiché quand la liste est vide. */
  readonly emptyLabel = input('Aucun élément.');
  /** Éléments logistiques courants. */
  readonly items = input<LogisticItem[]>([]);
  /** Catalogue des produits (pour la sélection). */
  readonly products = input<NutritionProduct[]>([]);
  /**
   * Mode inventaire : restreint la sélection de produits à ceux fournis via
   * `products` (l'inventaire) et plafonne les quantités selon `capByProduct`.
   * Utilisé pour « À récupérer », où l'on ne peut prendre que ce que l'on a
   * effectivement dans l'inventaire.
   */
  readonly inventoryMode = input(false);
  /**
   * Plafond total, par produit, autorisé dans **cette** liste (mode inventaire).
   * Typiquement : quantité en inventaire − quantité déjà répartie sur les
   * autres ravitaillements.
   */
  readonly capByProduct = input<Record<string, number>>({});

  /** Émis avec la nouvelle liste à chaque modification. */
  readonly itemsChange = output<LogisticItem[]>();

  protected readonly faTrash = faTrash;
  protected readonly faPlus = faPlus;
  protected readonly faBoxOpen = faBoxOpen;
  protected readonly faScrewdriverWrench = faScrewdriverWrench;

  /** Icône affichée en tête de liste (par défaut un carton). */
  readonly icon = input(faBoxOpen);

  protected readonly addKind = signal<'product' | 'gear'>('product');
  protected readonly selectedProductId = signal('');
  protected readonly gearLabel = signal('');

  protected readonly selectClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
  protected readonly inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  private readonly productMap = computed(
    () => new Map(this.products().map((product) => [product.id, product])),
  );

  /** Produits triés par marque puis nom pour la sélection. */
  protected readonly sortedProducts = computed(() =>
    [...this.products()].sort(
      (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
    ),
  );

  /** Quantité de produit déjà engagée dans cette liste, par produit. */
  private readonly usedByProduct = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.items()) {
      if (item.kind === 'product' && item.productId) {
        map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
      }
    }
    return map;
  });

  /**
   * Produits proposables à l'ajout. En mode inventaire, on exclut les produits
   * déjà présents dans la liste (une seule ligne par produit et par ravito) et
   * ceux dont le plafond est épuisé.
   */
  protected readonly selectableProducts = computed(() => {
    const sorted = this.sortedProducts();
    if (!this.inventoryMode()) return sorted;
    const caps = this.capByProduct();
    const present = new Set(
      this.items()
        .filter((item) => item.kind === 'product' && item.productId)
        .map((item) => item.productId),
    );
    return sorted.filter(
      (product) => !present.has(product.id) && (caps[product.id] ?? 0) >= 1,
    );
  });

  /** Quantité maximale autorisée pour un élément (plafond inventaire). */
  protected maxFor(item: LogisticItem): number {
    if (!this.inventoryMode() || item.kind !== 'product' || !item.productId) {
      return Number.MAX_SAFE_INTEGER;
    }
    return this.capByProduct()[item.productId] ?? Number.MAX_SAFE_INTEGER;
  }

  protected tabClass(active: boolean): string {
    return active
      ? 'rounded-md bg-white px-2.5 py-1 font-medium text-slate-900 shadow-sm'
      : 'rounded-md px-2.5 py-1 font-medium text-slate-500 hover:text-slate-700';
  }

  /** Libellé affiché d'un élément (produit résolu ou matériel libre). */
  protected label(item: LogisticItem): string {
    if (item.kind === 'gear') return item.label ?? 'Matériel';
    const product = item.productId ? this.productMap().get(item.productId) : undefined;
    return product?.name ?? item.label ?? 'Produit';
  }

  /** Marque du produit (élément « produit » uniquement). */
  protected brand(item: LogisticItem): string | null {
    const product = item.productId ? this.productMap().get(item.productId) : undefined;
    return product?.brand ?? null;
  }

  protected addProduct(): void {
    const productId = this.selectedProductId();
    if (!productId) return;
    this.itemsChange.emit([...this.items(), { kind: 'product', productId, quantity: 1 }]);
    this.selectedProductId.set('');
  }

  protected addGear(): void {
    const label = this.gearLabel().trim();
    if (!label) return;
    this.itemsChange.emit([...this.items(), { kind: 'gear', label, quantity: 1 }]);
    this.gearLabel.set('');
  }

  protected setQuantity(index: number, quantity: number): void {
    this.itemsChange.emit(
      this.items().map((item, i) => {
        if (i !== index) return item;
        const capped = Math.min(quantity, this.maxFor(item));
        return { ...item, quantity: Math.max(1, capped) };
      }),
    );
  }

  protected removeAt(index: number): void {
    this.itemsChange.emit(this.items().filter((_, i) => i !== index));
  }
}
