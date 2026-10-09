import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPreview, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { ButtonComponent } from '../../atoms/button/button.component';
import { QuantityStepperComponent } from '../../atoms/quantity-stepper/quantity-stepper.component';
import { TooltipComponent } from '../../atoms/tooltip/tooltip.component';
import type { RaceStrategy, NutritionProduct, Flask } from '../../../core/models';
import { FLASK_DEFAULT_VOLUME_ML } from '../../../core/models';
import {
  START_LOCATION_ID,
  buildInventoryLocations,
  moveUnit,
  removeProductEverywhere,
  setPortionWeight,
  setStartQuantity,
  setStationQuantity,
  type AllocationResult,
  type InventoryLocation,
  type InventoryLocationItem,
} from '../../../core/utils/inventory-allocation.util';
import { resolvePortionGrams } from '../../../core/utils/portion.util';
import { resolveFlask, type ResolvedFlask } from '../../../core/utils/flask.util';
import { newLocalId } from '../../../core/utils/aid-station.util';
import {
  faAppleWhole,
  faDroplet,
  faFlag,
  faFlask,
  faGripVertical,
  faLocationDot,
  faPlus,
  faTrash,
  faXmark,
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
    CdkDragHandle,
    CdkDragPreview,
    IconComponent,
    BadgeComponent,
    ButtonComponent,
    QuantityStepperComponent,
    TooltipComponent,
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
            <div class="flex shrink-0 items-center gap-2">
              <span class="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                {{ unitCount(location) }} unité{{ unitCount(location) > 1 ? 's' : '' }}
              </span>
              <ui-button
                color="secondary"
                variant="outlined"
                size="sm"
                [icon]="faAppleWhole"
                [disabled]="!canAdd()"
                (clicked)="addProduct.emit(location.id)"
              >
                Ajouter un produit
              </ui-button>
              <ui-button
                color="secondary"
                variant="outlined"
                size="sm"
                [icon]="faDroplet"
                (clicked)="addFlask(location.id)"
              >
                Ajouter une flasque
              </ui-button>
            </div>
          </header>

          <!-- Produits de l'emplacement (zone de dépôt) -->
          <div
            cdkDropList
            [cdkDropListData]="location.id"
            [cdkDropListEnterPredicate]="acceptProduct"
            (cdkDropListDropped)="onDrop($event)"
            class="min-h-16 space-y-2 p-3"
          >
            @for (item of location.items; track item.productId) {
              <div
                cdkDrag
                [cdkDragData]="item.productId"
                class="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <ui-icon [icon]="faGripVertical" size="sm" class="shrink-0 cursor-grab text-slate-300" />
                <div class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-300">
                  @if (item.product.image) {
                    <img [src]="item.product.image" [alt]="item.product.name" class="h-full w-full object-cover" />
                  } @else {
                    <ui-icon [icon]="faAppleWhole" size="sm" />
                  }
                </div>
                <ui-tooltip
                  class="min-w-0 flex-1"
                  [text]="nutrientTooltip(item.product)"
                  position="bottom"
                  escapeOverflow
                >
                  <div class="min-w-0">
                    <div class="truncate text-sm font-medium text-slate-900">{{ item.product.name }}</div>
                    <div class="truncate text-xs text-slate-400">{{ item.product.brand }}</div>
                  </div>
                </ui-tooltip>
                <label
                  class="flex shrink-0 items-center gap-1 text-xs text-slate-500"
                  [title]="'Taille de portion (une prise au plan). Defaut : 1 paquet = ' + item.product.unitWeight + ' g'"
                >
                  Portion
                  <input
                    type="number"
                    min="1"
                    step="1"
                    [value]="portionGrams(item)"
                    (change)="onPortion(item, $any($event.target).value)"
                    class="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-right tabular-nums text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    aria-label="Taille d'une portion en grammes"
                  />
                  g
                </label>
                <ui-quantity-stepper
                  [value]="item.quantity"
                  [min]="1"
                  (valueChange)="onQuantity(location, item, $event)"
                />
                <button
                  type="button"
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  (click)="onRemove(location, item)"
                  [attr.aria-label]="'Retirer ' + item.product.name"
                >
                  <ui-icon [icon]="faTrash" size="sm" />
                </button>

                <!-- Aperçu de glissement -->
                <div *cdkDragPreview class="rounded-md border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-lg">
                  {{ item.product.name }}
                </div>
              </div>
            } @empty {
              <p class="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                @if (location.kind === 'start') {
                  Ajoutez des produits pour composer votre sac de départ.
                } @else {
                  Glissez un produit ici pour le récupérer à ce ravitaillement.
                }
              </p>
            }
          </div>

          <!-- Flasques (hydratation) : zone de dépôt (glisser entre emplacements) -->
          <div
            cdkDropList
            [cdkDropListData]="location.id"
            [cdkDropListEnterPredicate]="acceptFlask"
            (cdkDropListDropped)="onFlaskDrop($event)"
            class="space-y-2 border-t border-slate-100 bg-sky-50/20 px-3 py-3"
          >
            @for (flask of flasksAt(location.id); track flask.id) {
              <div
                cdkDrag
                [cdkDragData]="{ flaskId: flask.id }"
                class="flex flex-wrap items-center gap-3 rounded-md border border-sky-200 bg-white px-3 py-2"
              >
                <div cdkDragHandle class="shrink-0 cursor-grab text-sky-300" aria-label="Déplacer la flasque">
                  <ui-icon [icon]="faGripVertical" size="sm" />
                </div>
                <div class="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-sky-200 bg-sky-50 text-sky-500">
                  <ui-icon [icon]="flask.productId ? faFlask : faDroplet" size="sm" />
                </div>

                    <!-- Boisson : via l'écran de sélection de produits -->
                    @if (flask.boisson; as boisson) {
                      <div
                        class="flex min-w-48 flex-1 items-center gap-1 rounded-md border border-slate-300 bg-white pl-3 pr-1 text-sm transition-colors focus-within:border-brand-400 hover:border-brand-400"
                      >
                        <button
                          type="button"
                          class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left transition-colors hover:text-brand-600"
                          (click)="pickFlaskProduct.emit(flask.id)"
                        >
                          <span class="truncate font-medium text-slate-900">{{ boisson.name }}</span>
                          @if (boisson.brand) {
                            <span class="truncate text-xs text-slate-400">· {{ boisson.brand }}</span>
                          }
                        </button>
                        <button
                          type="button"
                          class="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          (click)="onFlaskProduct(flask, '')"
                          aria-label="Retirer la boisson (eau pure)"
                        >
                          <ui-icon [icon]="faXmark" size="sm" />
                        </button>
                      </div>
                    } @else {
                      <div class="min-w-48 flex-1">
                        <ui-button
                          color="info"
                          variant="outlined"
                          [icon]="faFlask"
                          (clicked)="pickFlaskProduct.emit(flask.id)"
                        >
                          Associer un produit
                        </ui-button>
                      </div>
                    }

                    <!-- Dose : quantité du produit contenu dans la flasque -->
                    @if (flask.boisson; as boisson) {
                      <label
                        class="flex shrink-0 items-center gap-1 text-xs text-slate-500"
                        [title]="'Quantité de ' + boisson.name + ' dans la flasque. Defaut : 1 portion = ' + boisson.unitWeight + ' g'"
                      >
                        Dose
                        <input
                          type="number"
                          min="0"
                          step="1"
                          [value]="flaskDoseGrams(flask)"
                          (change)="onFlaskDose(flask, $any($event.target).value)"
                          class="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-right tabular-nums text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                          [attr.aria-label]="'Quantité de ' + boisson.name + ' par flasque en grammes'"
                        />
                        <span class="whitespace-nowrap font-medium text-slate-600">g</span>
                      </label>
                    }

                    <span class="text-xs text-slate-500 mx-2">-</span>

                    <label class="flex shrink-0 items-center gap-1 text-xs text-slate-500" title="Volume du contenant">
                      Volume
                      <input
                        type="number"
                        min="0"
                        step="50"
                        [value]="flask.volumeMl"
                        (change)="onFlaskVolume(flask, $any($event.target).value)"
                        class="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right tabular-nums text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                        aria-label="Volume de la flasque en millilitres"
                      />
                      mL
                    </label>

                    <ui-quantity-stepper
                      [value]="flask.quantity"
                      [min]="1"
                      (valueChange)="onFlaskQuantity(flask, $event)"
                    />
                    <button
                      type="button"
                      class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      (click)="removeFlask(flask)"
                      aria-label="Retirer la flasque"
                    >
                      <ui-icon [icon]="faTrash" size="sm" />
                    </button>

                    <div *cdkDragPreview class="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-800 shadow-lg">
                      {{ flask.boisson?.name ?? 'Eau pure' }} · {{ flask.volumeMl }} mL
                    </div>
                  </div>
            } @empty {
              <p class="rounded-md border border-dashed border-sky-200 px-3 py-4 text-center text-xs text-slate-400">
                Aucune flasque — ajoutez-en une ou glissez-en ici.
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
  /** Demande d'ajout de produits à un emplacement (identifiant de l'emplacement). */
  readonly addProduct = output<string>();
  /** Liste complète des flasques après modification. */
  readonly flasksChange = output<Flask[]>();
  /** Demande d'association d'une boisson à une flasque (via l'écran produits). */
  readonly pickFlaskProduct = output<string>();

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faDroplet = faDroplet;
  protected readonly faFlag = faFlag;
  protected readonly faFlask = faFlask;
  protected readonly faGripVertical = faGripVertical;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;
  protected readonly faXmark = faXmark;

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

  /** N'accepte que les produits (donnée = identifiant texte) dans la zone produits. */
  protected readonly acceptProduct = (drag: CdkDrag): boolean => typeof drag.data === 'string';

  /** N'accepte que les flasques (donnée = objet `{ flaskId }`) dans la zone flasques. */
  protected readonly acceptFlask = (drag: CdkDrag): boolean =>
    typeof drag.data === 'object' && drag.data !== null && 'flaskId' in drag.data;

  /** Déplace une flasque vers l'emplacement de dépôt (glisser-déposer). */
  protected onFlaskDrop(event: CdkDragDrop<string>): void {
    const data = event.item.data as { flaskId?: string };
    if (data?.flaskId) this.moveFlask(data.flaskId, event.container.data);
  }

  /** Change l'emplacement d'une flasque et émet la liste mise à jour. */
  private moveFlask(flaskId: string, locationId: string): void {
    const flasks = this.currentFlasks();
    const source = flasks.find((f) => f.id === flaskId);
    if (!source || source.location === locationId) return;

    // Flasque identique (même volume/boisson/dose) déjà présente à destination.
    const sibling = flasks.find(
      (f) =>
        f.id !== source.id &&
        f.location === locationId &&
        f.volumeMl === source.volumeMl &&
        (f.productId ?? '') === (source.productId ?? '') &&
        (f.doseGrams ?? null) === (source.doseGrams ?? null),
    );

    // Dernière recharge sans fusion : on déplace la ligne (préserve id + plan).
    if (source.quantity <= 1 && !sibling) {
      this.flasksChange.emit(
        flasks.map((f) => (f.id === source.id ? { ...f, location: locationId } : f)),
      );
      return;
    }

    // Transfert d'une seule recharge : décrémente la source, incrémente/crée la cible.
    const next: Flask[] = [];
    for (const f of flasks) {
      if (f.id === source.id) {
        if (f.quantity > 1) next.push({ ...f, quantity: f.quantity - 1 });
        continue;
      }
      next.push(f);
    }
    if (sibling) {
      const index = next.findIndex((f) => f.id === sibling.id);
      next[index] = { ...next[index], quantity: next[index].quantity + 1 };
    } else {
      next.push({
        id: newLocalId('flask'),
        name: source.name,
        volumeMl: source.volumeMl,
        productId: source.productId,
        doseGrams: source.doseGrams,
        location: locationId,
        quantity: 1,
      });
    }
    this.flasksChange.emit(next);
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

  /** Taille de portion affichée (g) : valeur définie ou, par défaut, le poids d'un paquet. */
  protected portionGrams(item: InventoryLocationItem): number {
    return Math.round(resolvePortionGrams(item.portionWeight, item.product.unitWeight));
  }

  /** Fixe la taille de portion (g) d'un produit pour la stratégie. */
  protected onPortion(item: InventoryLocationItem, raw: string): void {
    const grams = Math.max(0, Math.round(Number(raw)));
    this.allocationChange.emit(setPortionWeight(this.event(), item.productId, grams));
  }

  /** Formate un temps en minutes vers `Xh YY`. */
  protected formatTime(total: number): string {
    const hours = Math.floor(total / 60);
    const minutes = Math.round(total % 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }

  /** Composition nutritionnelle par unité, affichée au survol d'un produit. */
  protected nutrientTooltip(product: NutritionProduct): string {
    return `${product.energy} kcal · ${product.carbs} g glucides · ${product.fats} g lipides · ${product.proteins} g protéines · ${product.sodium} mg sodium`;
  }

  // --- Flasques (hydratation) ---

  /** Flasques résolues (boisson incluse) d'un emplacement. */
  protected flasksAt(locationId: string): ResolvedFlask[] {
    const map = this.productMap();
    return (this.event().flasks ?? [])
      .filter((flask) => flask.location === locationId)
      .map((flask) => resolveFlask(flask, map));
  }

  /** Dose de boisson affichée (g) : valeur définie ou, par défaut, une portion. */
  protected flaskDoseGrams(flask: ResolvedFlask): number {
    return Math.round(flask.doseGrams ?? flask.boisson?.unitWeight ?? 0);
  }

  /** Flasques courantes réduites à leur charge utile (sans produit dénormalisé). */
  private currentFlasks(): Flask[] {
    return (this.event().flasks ?? []).map((flask) => ({
      id: flask.id,
      name: flask.name,
      volumeMl: flask.volumeMl,
      productId: flask.productId,
      doseGrams: flask.doseGrams,
      location: flask.location,
      quantity: flask.quantity,
    }));
  }

  /** Applique une modification à une flasque donnée. */
  private patchFlask(id: string, patch: Partial<Flask>): void {
    this.flasksChange.emit(
      this.currentFlasks().map((flask) => (flask.id === id ? { ...flask, ...patch } : flask)),
    );
  }

  /** Ajoute une flasque d'eau pure (500 mL) à l'emplacement. */
  protected addFlask(locationId: string): void {
    const flask: Flask = {
      id: newLocalId('flask'),
      volumeMl: FLASK_DEFAULT_VOLUME_ML,
      location: locationId,
      quantity: 1,
    };
    this.flasksChange.emit([...this.currentFlasks(), flask]);
  }

  /** Associe (ou retire) une boisson à la flasque. */
  protected onFlaskProduct(flask: ResolvedFlask, productId: string): void {
    this.patchFlask(flask.id, { productId: productId || undefined, doseGrams: undefined });
  }

  /** Fixe le volume (mL) de la flasque. */
  protected onFlaskVolume(flask: ResolvedFlask, raw: string): void {
    const volumeMl = Math.max(0, Math.round(Number(raw))) || FLASK_DEFAULT_VOLUME_ML;
    this.patchFlask(flask.id, { volumeMl });
  }

  /** Fixe la dose de boisson (g) de la flasque (0 = une portion par défaut). */
  protected onFlaskDose(flask: ResolvedFlask, raw: string): void {
    const grams = Math.max(0, Math.round(Number(raw)));
    this.patchFlask(flask.id, { doseGrams: grams > 0 ? grams : undefined });
  }

  /** Fixe le nombre de recharges à préparer. */
  protected onFlaskQuantity(flask: ResolvedFlask, quantity: number): void {
    this.patchFlask(flask.id, { quantity: Math.max(1, Math.round(quantity)) });
  }

  /** Retire la flasque. */
  protected removeFlask(flask: ResolvedFlask): void {
    this.flasksChange.emit(this.currentFlasks().filter((f) => f.id !== flask.id));
  }
}
