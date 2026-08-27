import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { ModalComponent } from '../../molecules/modal/modal.component';
import { LogisticItemListComponent } from '../../molecules/logistic-item-list/logistic-item-list.component';
import { AidConsumptionListComponent } from '../../molecules/aid-consumption-list/aid-consumption-list.component';
import {
  AID_STATION_TYPES,
  type AidConsumption,
  type AidStation,
  type AidStationLogisticVia,
  type AidStationType,
  type LogisticItem,
  type NutritionEventItem,
  type NutritionProduct,
} from '../../../core/models';
import {
  faTurnDown,
  faTurnUp,
  faHandHoldingHeart,
  faListCheck,
  faPlus,
  faSuitcaseRolling,
  faTrash,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Valide qu'un temps estimé de passage strictement positif est renseigné
 * (heures + minutes). Appliqué au groupe pour couvrir les deux champs.
 */
function durationRequiredValidator(group: AbstractControl): ValidationErrors | null {
  const hours = group.get('durationHours')?.value ?? 0;
  const minutes = group.get('durationMinutes')?.value ?? 0;
  return hours * 60 + minutes > 0 ? null : { durationRequired: true };
}

/**
 * Organism : formulaire de création/modification d'un ravitaillement.
 *
 * Saisit uniquement les informations de base : nom, position **depuis le
 * départ** (km, D+, temps estimé), types cumulables et note libre. Émet `save`
 * avec la charge utile de base (les listes logistiques et consommations sont
 * préservées par la page lors de la fusion).
 */
@Component({
  selector: 'ui-aid-station-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    IconComponent,
    ModalComponent,
    LogisticItemListComponent,
    AidConsumptionListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label [class]="labelClass" for="aid-name">Nom du ravitaillement</label>
          <input
            id="aid-name"
            type="text"
            formControlName="name"
            [class]="inputClass"
            placeholder="Ex : Courmayeur"
          />
        </div>

        <div>
          <label [class]="labelClass">Types</label>
          <div class="flex flex-wrap gap-2">
            @for (type of types; track type.key) {
              <button
                type="button"
                [class]="typeChipClass(selectedTypes().has(type.key))"
                [attr.aria-pressed]="selectedTypes().has(type.key)"
                (click)="toggleType(type.key)"
              >
                {{ type.label }}
              </button>
            }
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-sm font-semibold text-slate-800">Position depuis le départ</h3>
        <p class="text-xs text-slate-400">
          Ces valeurs absolues sont la source de vérité. Les distances et durées entre deux
          ravitaillements sont calculées automatiquement.
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label [class]="labelClass" for="aid-distance">Distance (km)</label>
            <input
              id="aid-distance"
              type="number"
              min="0"
              step="0.1"
              formControlName="distanceFromStart"
              [class]="inputClass"
              placeholder="Ex : 42.5"
            />
          </div>
          <div>
            <label [class]="labelClass" for="aid-dplus">D+ cumulé (m)</label>
            <input
              id="aid-dplus"
              type="number"
              min="0"
              step="1"
              formControlName="elevationGainFromStart"
              [class]="inputClass"
              placeholder="Ex : 2150"
            />
          </div>
        </div>
        <div>
          <label [class]="labelClass">Temps estimé depuis le départ</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              formControlName="durationHours"
              [class]="inputClass"
              placeholder="Heures"
              aria-label="Heures"
            />
            <span class="text-slate-400">h</span>
            <input
              type="number"
              min="0"
              max="59"
              step="1"
              formControlName="durationMinutes"
              [class]="inputClass"
              placeholder="Minutes"
              aria-label="Minutes"
            />
            <span class="text-slate-400">min</span>
          </div>
          @if (form.hasError('durationRequired') && form.get('durationHours')?.touched) {
            <p class="mt-1 text-xs text-rose-600">
              Le temps estimé de passage est requis pour positionner le ravitaillement.
            </p>
          }
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label [class]="labelClass" for="aid-access">Accès — adresse / GPS (facultatif)</label>
          <input
            id="aid-access"
            type="text"
            formControlName="accessInfo"
            [class]="inputClass"
            placeholder="Ex : Place de l'église, Courmayeur — 45.7896, 6.9723"
          />
          <p class="mt-1 text-xs text-slate-400">
            Aide l'assistance et les supporters à rejoindre le ravitaillement.
          </p>
        </div>
        <div>
          <label [class]="labelClass" for="aid-note">Note (facultative)</label>
          <textarea
            id="aid-note"
            rows="3"
            formControlName="note"
            [class]="inputClass"
            placeholder="Ex : Mon frère sera présent. Prendre le temps de manger."
          ></textarea>
        </div>
      </section>

      <section class="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-slate-800">Logistique</h3>
          @if (logisticActive()) {
            @if (viaOptions().length > 1) {
              <div class="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  [class]="viaTabClass(effectiveVia() === 'ASSISTANCE')"
                  (click)="logisticVia.set('ASSISTANCE')"
                >
                  Assistance
                </button>
                <button
                  type="button"
                  [class]="viaTabClass(effectiveVia() === 'DROP_BAG')"
                  (click)="logisticVia.set('DROP_BAG')"
                >
                  Drop bag
                </button>
              </div>
            } @else {
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                <ui-icon [icon]="viaIcon()" size="xs" class="text-slate-400" />
                {{ viaLabel() }}
              </span>
            }
          }
        </div>

        @if (logisticActive()) {
          <div class="grid gap-4">
          <ui-logistic-item-list
            title="À récupérer"
            [icon]="faTurnUp"
            emptyLabel="Rien à récupérer ici."
            [items]="pickup()"
            [products]="inventoryProducts()"
            [inventoryMode]="true"
            [capByProduct]="pickupCapByProduct()"
            (itemsChange)="pickup.set($event)"
          />
          <ui-logistic-item-list
            title="À déposer"
            [icon]="faTurnDown"
            emptyLabel="Rien à déposer ici."
            [items]="drop()"
            [products]="products()"
            (itemsChange)="drop.set($event)"
          />
          </div>
        } @else {
          <p class="text-xs text-slate-400">
            Cochez le type « Assistance » ou « Drop bag » pour définir les éléments à récupérer et à
            déposer sur ce ravitaillement.
          </p>
        }

        <!-- À faire -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <ui-icon [icon]="faListCheck" size="sm" class="text-slate-400" />
            <h4 class="text-sm font-semibold text-slate-800">À faire</h4>
          </div>
          @if (todo().length === 0) {
            <p class="text-xs text-slate-400">Aucune tâche.</p>
          } @else {
            <ul class="space-y-1.5">
              @for (task of todo(); track $index) {
                <li class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span class="min-w-0 flex-1 truncate text-sm text-slate-800">{{ task }}</span>
                  <button
                    type="button"
                    class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    (click)="removeTask($index)"
                    aria-label="Retirer la tâche"
                  >
                    <ui-icon [icon]="faTrash" size="sm" />
                  </button>
                </li>
              }
            </ul>
          }
          <div class="flex items-center gap-2">
            <input
              type="text"
              [class]="inputClass"
              [value]="taskDraft()"
              (input)="taskDraft.set($any($event.target).value)"
              (keydown.enter)="addTask(); $event.preventDefault()"
              placeholder="Ex : Se brosser les dents, changer de chaussures…"
              aria-label="Nouvelle tâche"
            />
            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
              [disabled]="!taskDraft().trim()"
              (click)="addTask()"
            >
              <ui-icon [icon]="faPlus" size="sm" /> Ajouter
            </button>
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-center gap-2">
          <ui-icon [icon]="faUtensils" size="sm" class="text-slate-400" />
          <h3 class="text-sm font-semibold text-slate-800">Consommation sur place</h3>
        </div>
        <ui-aid-consumption-list
          [consumptions]="consumptions()"
          [products]="products()"
          [inventoryItems]="inventoryItems()"
          (consumptionsChange)="consumptions.set($event)"
        />
      </section>

      <div class="flex items-center justify-end gap-3">
        <ui-button type="button" color="default" variant="ghost" (clicked)="cancel.emit()">
          Annuler
        </ui-button>
        <ui-button type="submit" [disabled]="form.invalid">
          {{ station() ? 'Enregistrer' : 'Ajouter le ravitaillement' }}
        </ui-button>
      </div>
    </form>

    <ui-modal
      [open]="confirmClearOpen()"
      title="Vider la logistique ?"
      (close)="cancelClearLogistic()"
    >
      <p>
        Sans le type « Assistance » ni « Drop bag », ce ravitaillement ne peut plus porter
        d'éléments à récupérer ou à déposer. Les éléments logistiques déjà saisis seront
        <strong>supprimés</strong>.
      </p>
      <div modalFooter>
        <ui-button type="button" color="default" variant="ghost" (clicked)="cancelClearLogistic()">
          Annuler
        </ui-button>
        <ui-button type="button" color="danger" (clicked)="confirmClearLogistic()">
          Vider et continuer
        </ui-button>
      </div>
    </ui-modal>
  `,
})
export class AidStationFormComponent {
  private readonly fb = inject(FormBuilder);

  /** Ravitaillement à éditer (mode modification). Absent = création. */
  readonly station = input<AidStation | null>(null);
  /** Catalogue des produits (sélection logistique et consommation sur place). */
  readonly products = input<NutritionProduct[]>([]);
  /** Inventaire de l'évènement (consommation « depuis l'inventaire »). */
  readonly inventoryItems = input<NutritionEventItem[]>([]);
  /**
   * Quantités de produits déjà réparties en « à récupérer » sur les **autres**
   * ravitaillements, par identifiant de produit. Sert à plafonner ce que l'on
   * peut encore allouer ici (le total sur tous les ravitos ne peut pas dépasser
   * la quantité en inventaire).
   */
  readonly pickupElsewhere = input<Record<string, number>>({});

  readonly save = output<Partial<AidStation>>();
  readonly cancel = output<void>();

  protected readonly types = AID_STATION_TYPES;
  protected readonly faTurnUp = faTurnUp;
  protected readonly faTurnDown = faTurnDown;
  protected readonly faHandHoldingHeart = faHandHoldingHeart;
  protected readonly faSuitcaseRolling = faSuitcaseRolling;
  protected readonly faListCheck = faListCheck;
  protected readonly faUtensils = faUtensils;
  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;
  protected readonly labelClass = 'mb-1 block text-xs font-medium text-slate-600';
  protected readonly inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  /** Types sélectionnés (édition locale). */
  protected readonly selectedTypes = signal<Set<AidStationType>>(new Set());

  /** Listes logistiques et consommations (édition locale). */
  protected readonly pickup = signal<LogisticItem[]>([]);
  protected readonly drop = signal<LogisticItem[]>([]);
  /** Vecteur logistique choisi (utilisé quand les deux types sont disponibles). */
  protected readonly logisticVia = signal<AidStationLogisticVia>('ASSISTANCE');
  protected readonly todo = signal<string[]>([]);
  protected readonly consumptions = signal<AidConsumption[]>([]);
  /** Saisie en cours d'une nouvelle tâche « à faire ». */
  protected readonly taskDraft = signal('');

  /** Modal de confirmation de vidage de la section logistique. */
  protected readonly confirmClearOpen = signal(false);
  /** Types en attente d'application (si confirmation requise). */
  private readonly pendingTypes = signal<Set<AidStationType> | null>(null);

  /**
   * Vecteurs logistiques disponibles selon les types cochés (dans l'ordre
   * Assistance puis Drop bag). Vide si aucun des deux types n'est sélectionné.
   */
  protected readonly viaOptions = computed<AidStationLogisticVia[]>(() => {
    const types = this.selectedTypes();
    const options: AidStationLogisticVia[] = [];
    if (types.has('ASSISTANCE')) options.push('ASSISTANCE');
    if (types.has('DROP_BAG')) options.push('DROP_BAG');
    return options;
  });

  /** La section logistique est active si au moins un vecteur est disponible. */
  protected readonly logisticActive = computed(() => this.viaOptions().length > 0);

  /**
   * Vecteur logistique effectif : imposé quand un seul type est coché, sinon la
   * valeur choisie par l'utilisateur.
   */
  protected readonly effectiveVia = computed<AidStationLogisticVia>(() => {
    const options = this.viaOptions();
    if (options.length === 1) return options[0];
    return this.logisticVia();
  });

  /** Table produit par identifiant (résolution des libellés). */
  private readonly productMap = computed(
    () => new Map(this.products().map((product) => [product.id, product])),
  );

  /** Produits effectivement présents dans l'inventaire (source du « à récupérer »). */
  protected readonly inventoryProducts = computed<NutritionProduct[]>(() =>
    this.inventoryItems()
      .map((item) => item.product ?? this.productMap().get(item.productId))
      .filter((product): product is NutritionProduct => !!product),
  );

  /**
   * Plafond allouable ici, par produit : quantité en inventaire moins ce qui est
   * déjà réparti sur les autres ravitaillements. La liste « à récupérer » borne
   * ensuite sa propre consommation à l'intérieur de ce plafond.
   */
  protected readonly pickupCapByProduct = computed<Record<string, number>>(() => {
    const elsewhere = this.pickupElsewhere();
    const caps: Record<string, number> = {};
    for (const item of this.inventoryItems()) {
      caps[item.productId] = Math.max(0, item.quantity - (elsewhere[item.productId] ?? 0));
    }
    return caps;
  });

  readonly form = this.fb.group(
    {
      name: ['', Validators.required],
      distanceFromStart: [null as number | null, Validators.min(0)],
      elevationGainFromStart: [null as number | null, Validators.min(0)],
      durationHours: [null as number | null, Validators.min(0)],
      durationMinutes: [null as number | null, [Validators.min(0), Validators.max(59)]],
      note: [''],
      accessInfo: [''],
    },
    { validators: durationRequiredValidator },
  );

  constructor() {
    // Pré-remplit le formulaire quand un ravitaillement à éditer est fourni.
    effect(() => {
      const station = this.station();
      if (station) {
        const total = station.estimatedDurationFromStart ?? 0;
        this.form.reset({
          name: station.name,
          distanceFromStart: station.distanceFromStart ?? null,
          elevationGainFromStart: station.elevationGainFromStart ?? null,
          durationHours: total > 0 ? Math.floor(total / 60) : null,
          durationMinutes: total > 0 ? total % 60 : null,
          note: station.note ?? '',
          accessInfo: station.accessInfo ?? '',
        });
        this.selectedTypes.set(new Set(station.types));
        this.pickup.set([...(station.pickup ?? [])]);
        this.drop.set([...(station.drop ?? [])]);
        this.logisticVia.set(station.logisticVia ?? 'ASSISTANCE');
        this.todo.set([...(station.todo ?? [])]);
        this.consumptions.set([...(station.consumptions ?? [])]);
      } else {
        this.form.reset({
          name: '',
          distanceFromStart: null,
          elevationGainFromStart: null,
          durationHours: null,
          durationMinutes: null,
          note: '',
          accessInfo: '',
        });
        this.selectedTypes.set(new Set());
        this.pickup.set([]);
        this.drop.set([]);
        this.logisticVia.set('ASSISTANCE');
        this.todo.set([]);
        this.consumptions.set([]);
      }
      this.taskDraft.set('');
    });
  }

  /** Classe d'une puce de type selon son état sélectionné. */
  protected typeChipClass(selected: boolean): string {
    return selected
      ? 'rounded-full border border-brand-500 bg-brand-500 px-3 py-1 text-xs font-medium text-white transition-colors'
      : 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600';
  }

  /** Ajoute ou retire un type de la sélection. */
  protected toggleType(type: AidStationType): void {
    const next = new Set(this.selectedTypes());
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    // Désactiver la section logistique alors qu'elle contient des éléments
    // impose une confirmation avant de les supprimer.
    const willDeactivate = !this.hasViaOption(next) && this.hasLogisticItems();
    if (willDeactivate) {
      this.pendingTypes.set(next);
      this.confirmClearOpen.set(true);
      return;
    }
    this.selectedTypes.set(next);
  }

  /** Un vecteur logistique est disponible pour l'ensemble de types donné. */
  private hasViaOption(types: Set<AidStationType>): boolean {
    return types.has('ASSISTANCE') || types.has('DROP_BAG');
  }

  /** La section logistique contient au moins un élément à récupérer/déposer. */
  private hasLogisticItems(): boolean {
    return this.pickup().length > 0 || this.drop().length > 0;
  }

  /** Confirme le vidage : applique le décochage et efface pickup/drop. */
  protected confirmClearLogistic(): void {
    const next = this.pendingTypes();
    if (next) this.selectedTypes.set(next);
    this.pickup.set([]);
    this.drop.set([]);
    this.pendingTypes.set(null);
    this.confirmClearOpen.set(false);
  }

  /** Annule le vidage : conserve les types et les éléments logistiques. */
  protected cancelClearLogistic(): void {
    this.pendingTypes.set(null);
    this.confirmClearOpen.set(false);
  }

  /** Libellé du vecteur logistique effectif. */
  protected viaLabel(): string {
    return this.effectiveVia() === 'ASSISTANCE' ? 'Assistance' : 'Drop bag';
  }

  /** Icône du vecteur logistique effectif. */
  protected viaIcon() {
    return this.effectiveVia() === 'ASSISTANCE' ? faHandHoldingHeart : faSuitcaseRolling;
  }

  /** Classe d'un onglet de choix du vecteur logistique. */
  protected viaTabClass(active: boolean): string {
    return active
      ? 'rounded-md bg-white px-2.5 py-1 font-medium text-brand-600 shadow-sm'
      : 'rounded-md px-2.5 py-1 font-medium text-slate-500 transition-colors hover:text-slate-700';
  }

  /** Ajoute la tâche « à faire » en cours de saisie. */
  protected addTask(): void {
    const task = this.taskDraft().trim();
    if (!task) return;
    this.todo.set([...this.todo(), task]);
    this.taskDraft.set('');
  }

  /** Retire une tâche « à faire ». */
  protected removeTask(index: number): void {
    this.todo.set(this.todo().filter((_, i) => i !== index));
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    const hours = v.durationHours ?? 0;
    const minutes = v.durationMinutes ?? 0;
    const totalMinutes = hours * 60 + minutes;

    // Conserve l'ordre canonique des types pour un affichage stable.
    const orderedTypes = this.types
      .map((meta) => meta.key)
      .filter((key) => this.selectedTypes().has(key));

    const payload: Partial<AidStation> = {
      name: v.name!.trim(),
      note: v.note?.trim() || undefined,
      accessInfo: v.accessInfo?.trim() || undefined,
      types: orderedTypes,
      distanceFromStart: v.distanceFromStart ?? undefined,
      elevationGainFromStart: v.elevationGainFromStart ?? undefined,
      estimatedDurationFromStart: totalMinutes,
      pickup: this.logisticActive() ? this.pickup() : [],
      drop: this.logisticActive() ? this.drop() : [],
      logisticVia: this.logisticActive() ? this.effectiveVia() : undefined,
      todo: this.todo(),
      consumptions: this.consumptions(),
    };

    this.save.emit(payload);
  }
}
