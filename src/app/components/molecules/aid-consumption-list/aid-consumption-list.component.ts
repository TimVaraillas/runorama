import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import type {
  AidConsumption,
  RaceStrategyItem,
  NutritionProduct,
} from '../../../core/models';
import { newAidConsumptionId } from '../../../core/utils/aid-station.util';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

/**
 * Molecule contrôlée : édite les consommations prévues **sur place** à un
 * ravitaillement. Chaque consommation distingue son origine :
 * - `FROM_INVENTORY` : un produit de l'inventaire du coureur ;
 * - `AT_AID_STATION` : un produit fourni sur place (catalogue ou hors catalogue
 *   avec des macros libres facultatives).
 *
 * Composant piloté : reçoit `consumptions` et émet la nouvelle liste via
 * `consumptionsChange` à chaque modification.
 */
@Component({
  selector: 'ui-aid-consumption-list',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      @if (consumptions().length === 0) {
        <p class="text-xs text-slate-400">Aucune consommation prévue sur place.</p>
      } @else {
        <ul class="space-y-1.5">
          @for (item of consumptions(); track item.id) {
            <li class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <ui-badge [tone]="item.source === 'FROM_INVENTORY' ? 'brand' : 'accent'">
                {{ item.source === 'FROM_INVENTORY' ? 'Inventaire' : 'Sur place' }}
              </ui-badge>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm text-slate-800">{{ displayLabel(item) }}</div>
              </div>
              <span class="shrink-0 text-xs tabular-nums text-slate-500">{{ amount(item) }}</span>
              <button
                type="button"
                class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                (click)="removeById(item.id)"
                aria-label="Retirer la consommation"
              >
                <ui-icon [icon]="faTrash" size="sm" />
              </button>
            </li>
          }
        </ul>
      }

      <!-- Ligne d'ajout -->
      <div class="space-y-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-2.5">
        <div class="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
          <button type="button" [class]="tabClass(source() === 'FROM_INVENTORY')" (click)="source.set('FROM_INVENTORY')">
            Depuis l'inventaire
          </button>
          <button type="button" [class]="tabClass(source() === 'AT_AID_STATION')" (click)="source.set('AT_AID_STATION')">
            Fourni sur place
          </button>
        </div>

        @if (source() === 'FROM_INVENTORY') {
          @if (inventoryOptions().length === 0) {
            <p class="text-xs text-slate-400">L'inventaire est vide : ajoutez des produits emportés.</p>
          } @else {
            <div class="flex items-center gap-2">
              <select
                [class]="selectClass"
                [value]="invProductId()"
                (change)="invProductId.set($any($event.target).value)"
                aria-label="Produit de l'inventaire"
              >
                <option value="">Choisir un produit emporté…</option>
                @for (option of inventoryOptions(); track option.id) {
                  <option [value]="option.id">{{ option.name }}</option>
                }
              </select>
              <input
                type="number"
                min="1"
                step="1"
                [class]="qtyClass"
                [value]="qty()"
                (input)="qty.set(toInt($any($event.target).value, 1))"
                aria-label="Quantité"
              />
              <button type="button" [class]="addBtnClass" [disabled]="!invProductId()" (click)="addFromInventory()">
                <ui-icon [icon]="faPlus" size="sm" /> Ajouter
              </button>
            </div>
          }
        } @else {
          <div class="ml-1 inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-[11px]">
            <button type="button" [class]="subTabClass(atMode() === 'catalog')" (click)="atMode.set('catalog')">
              Catalogue
            </button>
            <button type="button" [class]="subTabClass(atMode() === 'free')" (click)="atMode.set('free')">
              Libre
            </button>
          </div>

          @if (atMode() === 'catalog') {
            <div class="flex items-center gap-2">
              <select
                [class]="selectClass"
                [value]="catProductId()"
                (change)="catProductId.set($any($event.target).value)"
                aria-label="Produit du catalogue"
              >
                <option value="">Choisir un produit…</option>
                @for (product of sortedProducts(); track product.id) {
                  <option [value]="product.id">{{ product.brand }} — {{ product.name }}</option>
                }
              </select>
              <input
                type="number"
                min="1"
                step="1"
                [class]="qtyClass"
                [value]="qty()"
                (input)="qty.set(toInt($any($event.target).value, 1))"
                aria-label="Quantité"
              />
              <button type="button" [class]="addBtnClass" [disabled]="!catProductId()" (click)="addFromCatalog()">
                <ui-icon [icon]="faPlus" size="sm" /> Ajouter
              </button>
            </div>
          } @else {
            <div class="space-y-2">
              <input
                type="text"
                [class]="inputClass"
                [value]="label()"
                (input)="label.set($any($event.target).value)"
                placeholder="Ex : Coca, bouillon, banane…"
                aria-label="Nom du produit sur place"
              />
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-1.5 text-xs text-slate-500">
                  Quantité
                  <input
                    type="number"
                    min="0"
                    step="1"
                    [class]="qtyClass"
                    [value]="qty()"
                    (input)="qty.set(toInt($any($event.target).value, 1))"
                    aria-label="Quantité"
                  />
                </label>
                <label class="flex items-center gap-1.5 text-xs text-slate-500">
                  Volume (ml)
                  <input
                    type="number"
                    min="0"
                    step="10"
                    [class]="qtyClass"
                    [value]="ml() ?? ''"
                    (input)="ml.set(toNullableNumber($any($event.target).value))"
                    aria-label="Volume en millilitres"
                  />
                </label>
              </div>

              <button
                type="button"
                class="text-xs font-medium text-brand-600 hover:text-brand-700"
                (click)="showMacros.set(!showMacros())"
              >
                {{ showMacros() ? 'Masquer' : 'Détails nutritionnels (facultatif)' }}
              </button>
              @if (showMacros()) {
                <div class="grid grid-cols-3 gap-2">
                  <label class="text-xs text-slate-500">
                    Glucides (g)
                    <input type="number" min="0" step="1" [class]="qtyClass" [value]="carbs() ?? ''" (input)="carbs.set(toNullableNumber($any($event.target).value))" />
                  </label>
                  <label class="text-xs text-slate-500">
                    Énergie (kcal)
                    <input type="number" min="0" step="1" [class]="qtyClass" [value]="energy() ?? ''" (input)="energy.set(toNullableNumber($any($event.target).value))" />
                  </label>
                  <label class="text-xs text-slate-500">
                    Sodium (mg)
                    <input type="number" min="0" step="10" [class]="qtyClass" [value]="sodium() ?? ''" (input)="sodium.set(toNullableNumber($any($event.target).value))" />
                  </label>
                  <label class="text-xs text-slate-500">
                    Protéines (g)
                    <input type="number" min="0" step="1" [class]="qtyClass" [value]="proteins() ?? ''" (input)="proteins.set(toNullableNumber($any($event.target).value))" />
                  </label>
                  <label class="text-xs text-slate-500">
                    Lipides (g)
                    <input type="number" min="0" step="1" [class]="qtyClass" [value]="fats() ?? ''" (input)="fats.set(toNullableNumber($any($event.target).value))" />
                  </label>
                  <label class="text-xs text-slate-500">
                    Eau (ml)
                    <input type="number" min="0" step="10" [class]="qtyClass" [value]="waterMl() ?? ''" (input)="waterMl.set(toNullableNumber($any($event.target).value))" />
                  </label>
                </div>
              }

              <button type="button" [class]="addBtnClass + ' w-full justify-center'" [disabled]="!label().trim()" (click)="addFree()">
                <ui-icon [icon]="faPlus" size="sm" /> Ajouter
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class AidConsumptionListComponent {
  /** Consommations prévues courantes. */
  readonly consumptions = input<AidConsumption[]>([]);
  /** Catalogue des produits (source « sur place »). */
  readonly products = input<NutritionProduct[]>([]);
  /** Inventaire de l'évènement (source « depuis l'inventaire »). */
  readonly inventoryItems = input<RaceStrategyItem[]>([]);

  /** Émis avec la nouvelle liste à chaque modification. */
  readonly consumptionsChange = output<AidConsumption[]>();

  protected readonly faTrash = faTrash;
  protected readonly faPlus = faPlus;

  protected readonly source = signal<'FROM_INVENTORY' | 'AT_AID_STATION'>('AT_AID_STATION');
  protected readonly atMode = signal<'catalog' | 'free'>('catalog');
  protected readonly invProductId = signal('');
  protected readonly catProductId = signal('');
  protected readonly qty = signal(1);
  protected readonly ml = signal<number | null>(null);
  protected readonly label = signal('');
  protected readonly showMacros = signal(false);
  protected readonly carbs = signal<number | null>(null);
  protected readonly energy = signal<number | null>(null);
  protected readonly sodium = signal<number | null>(null);
  protected readonly proteins = signal<number | null>(null);
  protected readonly fats = signal<number | null>(null);
  protected readonly waterMl = signal<number | null>(null);

  protected readonly selectClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
  protected readonly inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
  protected readonly qtyClass =
    'w-20 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm tabular-nums text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
  protected readonly addBtnClass =
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-40';

  private readonly productMap = computed(
    () => new Map(this.products().map((product) => [product.id, product])),
  );

  protected readonly sortedProducts = computed(() =>
    [...this.products()].sort(
      (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
    ),
  );

  /** Produits de l'inventaire (résolus) proposés en source « inventaire ». */
  protected readonly inventoryOptions = computed(() =>
    this.inventoryItems()
      .map((item) => {
        const product = item.product ?? this.productMap().get(item.productId);
        return product ? { id: item.productId, name: `${product.brand} — ${product.name}` } : null;
      })
      .filter((option): option is { id: string; name: string } => option !== null),
  );

  protected tabClass(active: boolean): string {
    return active
      ? 'rounded-md bg-white px-2.5 py-1 font-medium text-slate-900 shadow-sm'
      : 'rounded-md px-2.5 py-1 font-medium text-slate-500 hover:text-slate-700';
  }

  /** Classe du toggle imbriqué « Catalogue / Libre », visuellement plus discret
   * que le toggle parent « Depuis l'inventaire / Fourni sur place » dont il dépend. */
  protected subTabClass(active: boolean): string {
    return active
      ? 'rounded bg-brand-50 px-2 py-0.5 font-medium text-brand-700'
      : 'rounded px-2 py-0.5 font-medium text-slate-400 hover:text-slate-600';
  }

  /** Libellé affiché d'une consommation (produit résolu ou libellé libre). */
  protected displayLabel(item: AidConsumption): string {
    if (item.productId) {
      const product = this.productMap().get(item.productId);
      if (product) return `${product.brand} — ${product.name}`;
    }
    return item.label ?? 'Produit';
  }

  /** Décrit la quantité consommée (unités et/ou volume). */
  protected amount(item: AidConsumption): string {
    const parts: string[] = [];
    if (item.quantity) parts.push(`×${item.quantity}`);
    if (item.amountMl != null) parts.push(`${item.amountMl} ml`);
    return parts.join(' · ') || '—';
  }

  protected toInt(value: string, fallback: number): number {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  protected toNullableNumber(value: string): number | null {
    if (value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  protected addFromInventory(): void {
    const productId = this.invProductId();
    if (!productId) return;
    this.emit({ id: newAidConsumptionId(), source: 'FROM_INVENTORY', productId, quantity: this.qty() });
    this.resetAdd();
  }

  protected addFromCatalog(): void {
    const productId = this.catProductId();
    if (!productId) return;
    this.emit({ id: newAidConsumptionId(), source: 'AT_AID_STATION', productId, quantity: this.qty() });
    this.resetAdd();
  }

  protected addFree(): void {
    const label = this.label().trim();
    if (!label) return;
    this.emit({
      id: newAidConsumptionId(),
      source: 'AT_AID_STATION',
      label,
      quantity: this.qty(),
      amountMl: this.ml() ?? undefined,
      carbs: this.carbs() ?? undefined,
      energy: this.energy() ?? undefined,
      sodium: this.sodium() ?? undefined,
      proteins: this.proteins() ?? undefined,
      fats: this.fats() ?? undefined,
      waterMl: this.waterMl() ?? undefined,
    });
    this.resetAdd();
  }

  protected removeById(id: string): void {
    this.consumptionsChange.emit(this.consumptions().filter((item) => item.id !== id));
  }

  private emit(consumption: AidConsumption): void {
    this.consumptionsChange.emit([...this.consumptions(), consumption]);
  }

  private resetAdd(): void {
    this.invProductId.set('');
    this.catProductId.set('');
    this.qty.set(1);
    this.ml.set(null);
    this.label.set('');
    this.showMacros.set(false);
    this.carbs.set(null);
    this.energy.set(null);
    this.sodium.set(null);
    this.proteins.set(null);
    this.fats.set(null);
    this.waterMl.set(null);
  }
}
