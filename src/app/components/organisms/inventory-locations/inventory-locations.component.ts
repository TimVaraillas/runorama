import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPreview, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { QuantityStepperComponent } from '../../atoms/quantity-stepper/quantity-stepper.component';
import type { RaceStrategy, NutritionProduct } from '../../../core/models';
import {
  START_LOCATION_ID,
  buildInventoryLocations,
  moveUnit,
  removeProductEverywhere,
  setStartQuantity,
  setStationQuantity,
  type AllocationResult,
  type InventoryLocation,
  type InventoryLocationItem,
} from '../../../core/utils/inventory-allocation.util';
import {
  faAppleWhole,
  faFlag,
  faGripVertical,
  faLocationDot,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : gestion panoramique de l'inventaire par emplacements.
 *
 * Affiche le sac de départ et chaque ravitaillement avec logistique comme des
 * colonnes de produits. Le glisser-déposer d'une ligne transfère **une** unité
 * d'un emplacement à l'autre (réaffectation du point de récupération), tandis
 * que le sélecteur de quantité ajuste le total emporté. Toute modification est
 * émise via `allocationChange` sous forme d'un nouvel état `{ items, aidStations }`.
 */
@Component({
  selector: 'ui-inventory-locations',
  standalone: true,
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPreview,
    IconComponent,
    BadgeComponent,
    ButtonComponent,
    QuantityStepperComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div cdkDropListGroup class="space-y-4">
      @for (location of locations(); track location.id) {
        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <!-- En-tête d'emplacement -->
          <header class="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
            <div class="flex min-w-0 items-center gap-2">
              <ui-icon
                [icon]="location.kind === 'start' ? faFlag : faLocationDot"
                size="sm"
                [class]="location.kind === 'start' ? 'text-brand-500' : 'text-slate-400'"
              />
              <h3 class="truncate text-sm font-semibold text-slate-800">{{ location.name }}</h3>
              @if (location.kind === 'station') {
                <span class="text-xs tabular-nums text-slate-400">
                  · {{ formatTime(location.minute ?? 0) }}
                </span>
                @if (location.via; as via) {
                  <ui-badge [tone]="via === 'ASSISTANCE' ? 'accent' : 'warning'">
                    {{ via === 'ASSISTANCE' ? 'Assistance' : 'Drop bag' }}
                  </ui-badge>
                }
              }
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <span class="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                {{ unitCount(location) }} unité{{ unitCount(location) > 1 ? 's' : '' }}
              </span>
              @if (location.kind === 'start') {
                <ui-button
                  color="secondary"
                  variant="outlined"
                  size="sm"
                  [icon]="faPlus"
                  [disabled]="!canAdd()"
                  (clicked)="addProduct.emit()"
                >
                  Ajouter
                </ui-button>
              }
            </div>
          </header>

          <!-- Produits de l'emplacement (zone de dépôt) -->
          <div
            cdkDropList
            [cdkDropListData]="location.id"
            (cdkDropListDropped)="onDrop($event)"
            class="min-h-16 space-y-2 p-3"
          >
            @for (item of location.items; track item.productId) {
              <div
                cdkDrag
                [cdkDragData]="item.productId"
                class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <ui-icon [icon]="faGripVertical" size="sm" class="shrink-0 cursor-grab text-slate-300" />
                <div class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-300">
                  @if (item.product.image) {
                    <img [src]="item.product.image" [alt]="item.product.name" class="h-full w-full object-cover" />
                  } @else {
                    <ui-icon [icon]="faAppleWhole" size="sm" />
                  }
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-slate-900">{{ item.product.name }}</div>
                  <div class="truncate text-xs text-slate-400">{{ item.product.brand }}</div>
                </div>
                <ui-quantity-stepper
                  [value]="item.quantity"
                  [min]="1"
                  (valueChange)="onQuantity(location, item, $event)"
                />
                <button
                  type="button"
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  (click)="onRemove(location, item)"
                  [attr.aria-label]="'Retirer ' + item.product.name"
                >
                  <ui-icon [icon]="faTrash" size="sm" />
                </button>

                <!-- Aperçu de glissement -->
                <div *cdkDragPreview class="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-lg">
                  {{ item.product.name }}
                </div>
              </div>
            } @empty {
              <p class="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                @if (location.kind === 'start') {
                  Ajoutez des produits pour composer votre sac de départ.
                } @else {
                  Glissez un produit ici pour le récupérer à ce ravitaillement.
                }
              </p>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class InventoryLocationsComponent {
  /** Évènement dont on gère l'inventaire. */
  readonly event = input.required<RaceStrategy>();
  /** Catalogue des produits (résolution des libellés). */
  readonly products = input<NutritionProduct[]>([]);
  /** Autorise l'ouverture du sélecteur d'ajout de produits. */
  readonly canAdd = input(true);

  /** Nouvel état d'inventaire après une opération. */
  readonly allocationChange = output<AllocationResult>();
  /** Demande d'ouverture du sélecteur de produits. */
  readonly addProduct = output<void>();

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faFlag = faFlag;
  protected readonly faGripVertical = faGripVertical;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;

  private readonly productMap = computed(
    () => new Map(this.products().map((product) => [product.id, product])),
  );

  /** Emplacements d'inventaire (départ + ravitaillements avec logistique). */
  protected readonly locations = computed<InventoryLocation[]>(() =>
    buildInventoryLocations(this.event(), this.productMap()),
  );

  /** Nombre total d'unités d'un emplacement. */
  protected unitCount(location: InventoryLocation): number {
    return location.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /** Déplace une unité vers l'emplacement de dépôt. */
  protected onDrop(event: CdkDragDrop<string>): void {
    const fromId = event.previousContainer.data;
    const toId = event.container.data;
    const productId = event.item.data as string;
    const result = moveUnit(this.event(), fromId, toId, productId);
    if (result) this.allocationChange.emit(result);
  }

  /** Ajuste le total emporté d'un produit depuis un emplacement. */
  protected onQuantity(location: InventoryLocation, item: InventoryLocationItem, quantity: number): void {
    const result =
      location.kind === 'start'
        ? setStartQuantity(this.event(), item.productId, quantity)
        : setStationQuantity(this.event(), location.id, item.productId, quantity);
    this.allocationChange.emit(result);
  }

  /** Retire un produit : de l'inventaire (départ) ou du ravitaillement (retour au départ). */
  protected onRemove(location: InventoryLocation, item: InventoryLocationItem): void {
    const result =
      location.id === START_LOCATION_ID
        ? removeProductEverywhere(this.event(), item.productId)
        : setStationQuantity(this.event(), location.id, item.productId, 0);
    this.allocationChange.emit(result);
  }

  /** Formate un temps en minutes vers `Xh YY`. */
  protected formatTime(total: number): string {
    const hours = Math.floor(total / 60);
    const minutes = Math.round(total % 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
}
