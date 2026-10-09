import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CdkDragDrop, CdkDragMove, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { PlanPaletteComponent } from '../plan-palette/plan-palette.component';
import { PlanTimelineComponent } from '../plan-timeline/plan-timeline.component';
import { ToastService } from '../../../core/services/toast.service';
import type {
  DragPayload,
  GhostBlock,
  RaceStrategy,
  NutritionIntake,
  NutritionProduct,
  PaletteEntry,
  PlanConstrainPosition,
  PlanHourlyRecap,
  PlanSequenceMinutes,
  PositionedAidStation,
  PositionedIntake,
  ResizeEdge,
  SequenceMark,
} from '../../../core/models';
import {
  buildAidStationMarks,
  buildHourlyRecap,
  buildSequenceMarks,
  computePlanLayout,
} from '../../../core/utils/plan-layout.util';
import type { DragOverState, ResizePreviewState } from '../../../core/utils/plan-layout.util';
import { enabledHourlyGoals } from '../../../core/utils/nutrition-goals.util';
import { portionUnits } from '../../../core/utils/portion.util';
import { isFlaskProductId, flaskIdFromProductId } from '../../../core/utils/water.util';
import {
  buildFlaskProductMap,
  flaskAvailableMinute,
  resolveFlask,
} from '../../../core/utils/flask.util';
import { FLASK_START_LOCATION } from '../../../core/models';
import {
  availableQuantityAt,
  buildAvailabilitySchedules,
  earliestAvailableMinute,
} from '../../../core/utils/product-availability.util';

const PX_PER_SEQUENCE = 30;
const SEQUENCE_OPTIONS: PlanSequenceMinutes[] = [5, 10, 15, 20];
/** Tolérance pour comparer des quantités fractionnaires (portions). */
const QUANTITY_EPSILON = 1e-6;
/** Rayon d'aimantation (px) autour d'un ravito/point de passage pendant un drag. */
const MAGNET_RADIUS_PX = 16;

/**
 * Organism : plan de nutrition d'une stratégie alimentaire.
 *
 * Permet de répartir, par glisser-déposer, les produits de l'inventaire sur
 * une timeline verticale découpée en séquences (5 à 20 min). Chaque prise
 * représente une unité consommée sur une fenêtre pouvant couvrir plusieurs
 * séquences (durée ajustable). Un récapitulatif horaire compare l'apport
 * planifié aux besoins cibles.
 */
@Component({
  selector: 'ui-consumption-plan',
  standalone: true,
  imports: [
    CdkDropListGroup,
    PlanPaletteComponent,
    PlanTimelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'exitFullscreen()',
  },
  template: `
    @if (totalMinutes() <= 0) {
      <p class="rounded-md bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
        Définissez un chrono cible sur l'évènement pour construire le plan de nutrition.
      </p>
    } @else if (paletteEntries().length === 0) {
      <p class="rounded-md bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
        Ajoutez des produits dans l'inventaire pour pouvoir les répartir sur le parcours.
      </p>
    } @else {
      <div [class]="containerClass()">
        <div
          cdkDropListGroup
          class="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,20rem)_1fr]"
        >
          <!-- Palette : produits à placer + récapitulatif (scroll indépendant) -->
        <div class="lg:flex lg:min-h-0 lg:flex-col">
          <ui-plan-palette
            [entries]="paletteEntries()"
            [unplacedUnits]="unplacedUnits()"
            [sequenceMinutes]="sequenceMinutes()"
            [sequenceOptions]="sequenceOptions"
            [recapRows]="hourlyRecap()"
            (sequenceChange)="onSequenceChange($event)"
            (paletteDropped)="onPaletteDrop($event)"
            (dragStarted)="dragging.set(true)"
            (dragMoved)="onDragMoved($event)"
            (dragEnded)="onDragEnded()"
          />
        </div>

        <!-- Timeline (scroll indépendant) -->
        <div class="space-y-6 lg:flex lg:min-h-0 lg:flex-col">
          <ui-plan-timeline
            [marks]="sequenceMarks()"
            [intakes]="positionedIntakes()"
            [ghost]="ghostBlock()"
            [aidStations]="aidStationMarks()"
            [trackHeight]="trackHeight()"
            [laneCount]="laneCount()"
            [dragging]="dragging()"
            [lockedZoneHeight]="lockedZoneHeight()"
            [magnetLineTop]="activeMagnetTop()"
            [constrainPosition]="constrainToSequence"
            (timelineDrop)="onTimelineDrop($event)"
            (dragStarted)="dragging.set(true)"
            (dragMoved)="onDragMoved($event)"
            (dragEnded)="onDragEnded()"
            (removeIntake)="removeIntake($event)"
            (resizeStart)="startResize($event.event, $event.intake, $event.edge)"
            (selectAidStation)="selectAidStation.emit($event)"
          />
        </div>
        </div>
      </div>
    }
  `,
})
export class ConsumptionPlanComponent implements OnDestroy {
  private readonly toast = inject(ToastService);

  /** Évènement dont on planifie la consommation. */
  readonly event = input.required<RaceStrategy>();
  /** Catalogue des produits (pour résoudre les identifiants). */
  readonly products = input<NutritionProduct[]>([]);

  /** Émis à chaque modification des prises. */
  readonly intakesChange = output<NutritionIntake[]>();
  /** Émis quand la granularité des séquences change. */
  readonly planSequenceChange = output<PlanSequenceMinutes>();
  /** Émis au clic sur un repère de ravitaillement (identifiant). */
  readonly selectAidStation = output<string>();

  private readonly timeline = viewChild(PlanTimelineComponent);

  /** Élément DOM de la piste (exposé par le composant timeline). */
  private trackElement(): HTMLElement | undefined {
    return this.timeline()?.trackElement();
  }

  protected readonly sequenceOptions = SEQUENCE_OPTIONS;

  /** Affichage du plan en superposition plein écran (pilotable par le parent). */
  readonly fullscreen = model(false);
  /** Classes du conteneur du plan selon le mode (normal / plein écran). */
  protected readonly containerClass = computed(() =>
    this.fullscreen()
      ? 'fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-50 p-4 lg:overflow-hidden lg:p-6'
      : 'relative flex flex-col lg:h-full',
  );

  /** Vrai pendant qu'un élément est glissé (indice visuel d'empilement). */
  protected readonly dragging = signal(false);
  /** Aperçu live d'une prise en cours de redimensionnement. */
  private readonly resizePreview = signal<ResizePreviewState | null>(null);
  /** Aperçu du créneau survolé pendant un drag (pour la superposition). */
  private readonly dragOverPreview = signal<DragOverState | null>(null);
  /** Identifiant du produit actuellement glissé (pour la zone verrouillée de la timeline). */
  private readonly draggedProductId = signal<string | null>(null);

  /** Granularité courante (min) : surcharge locale ou valeur de l'évènement. */
  private readonly sequenceOverride = signal<PlanSequenceMinutes | null>(null);
  protected readonly sequenceMinutes = computed<PlanSequenceMinutes>(
    () => this.sequenceOverride() ?? this.event().planSequenceMinutes ?? 10,
  );

  /** Durée totale du parcours en minutes. */
  protected readonly totalMinutes = computed(() => this.event().targetTimeMinutes ?? 0);

  /**
   * Planning de disponibilité par produit : instant depuis lequel chaque
   * quantité devient consommable, selon les affectations « à récupérer » /
   * « à déposer » des ravitaillements.
   */
  private readonly availabilitySchedules = computed(() =>
    buildAvailabilitySchedules(this.event().items, this.event().aidStations ?? []),
  );

  /** Portion (en unités) par produit de l'inventaire, dérivée de sa taille de portion (g). */
  private readonly portionUnitsByProduct = computed(() => {
    const map = this.productMap();
    const out = new Map<string, number>();
    for (const item of this.event().items) {
      const product = item.product ?? map.get(item.productId);
      if (!product) continue;
      out.set(item.productId, portionUnits(item.portionWeight, product.unitWeight));
    }
    return out;
  });

  /** Portion (en unités) d'un produit, 1 par défaut (produit hors inventaire ou eau). */
  private portionUnitsFor(productId: string): number {
    return this.portionUnitsByProduct().get(productId) ?? 1;
  }

  /** Quantité déjà placée sur le plan pour un produit, avant (ou à) un instant donné. */
  private placedQuantityBefore(productId: string, minute: number, excludeIntakeId?: string): number {    return (this.event().intakes ?? [])
      .filter(
        (i) =>
          i.kind !== 'water' &&
          i.productId === productId &&
          i.id !== excludeIntakeId &&
          i.startMinute <= minute,
      )
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  /**
   * Instant (minutes) à partir duquel la timeline devient une zone valide
   * pour le produit en cours de glissement, à titre indicatif (approximation
   * prudente basée sur le nombre d'unités déjà placées). La validation
   * définitive a lieu au dépôt, dans {@link onTimelineDrop}.
   */
  protected readonly lockedZoneMinute = computed<number | null>(() => {
    const productId = this.draggedProductId();
    if (!productId) return null;
    if (isFlaskProductId(productId)) {
      const flaskId = flaskIdFromProductId(productId);
      const entry = this.resolvedFlasks().find((f) => f.flask.id === flaskId);
      return entry && entry.availableMinute > 0 ? entry.availableMinute : null;
    }
    const schedule = this.availabilitySchedules().get(productId);
    if (!schedule) return null;
    const alreadyPlaced = (this.event().intakes ?? [])
      .filter((i) => i.kind !== 'water' && i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const unlock = earliestAvailableMinute(schedule, alreadyPlaced + this.portionUnitsFor(productId));
    return unlock && unlock.minute > 0 ? unlock.minute : null;
  });

  /** Hauteur (px) de la zone verrouillée affichée sur la timeline pendant le drag. */
  protected readonly lockedZoneHeight = computed(() => {
    const minute = this.lockedZoneMinute();
    const total = this.totalMinutes();
    if (!minute || total <= 0) return 0;
    return (minute / total) * this.trackHeight();
  });

  /** Table produit par identifiant (catalogue + produits dénormalisés + flasques). */
  private readonly productMap = computed(() => {
    const map = new Map<string, NutritionProduct>();
    for (const product of this.products()) map.set(product.id, product);
    for (const item of this.event().items) {
      if (item.product) map.set(item.productId, item.product);
    }
    for (const intake of this.event().intakes ?? []) {
      if (intake.product && intake.productId) map.set(intake.productId, intake.product);
    }
    // Produits synthétiques des flasques (volume + apports de la boisson).
    for (const [id, product] of buildFlaskProductMap(this.event().flasks ?? [], map)) {
      map.set(id, product);
    }
    return map;
  });

  /** Flasques résolues (produit synthétique + boisson + instant de disponibilité). */
  private readonly resolvedFlasks = computed(() => {
    const map = this.productMap();
    const stations = this.event().aidStations ?? [];
    return (this.event().flasks ?? []).map((flask) => ({
      flask: resolveFlask(flask, map),
      availableMinute: flaskAvailableMinute(flask, stations),
      locationName:
        flask.location === FLASK_START_LOCATION
          ? 'Départ'
          : (stations.find((s) => s.id === flask.location)?.name ?? 'Ravitaillement'),
    }));
  });

  /** Nombre de flasques placées sur le plan, par identifiant de flasque. */
  private readonly placedByFlask = computed(() => {
    const map = new Map<string, number>();
    for (const intake of this.event().intakes ?? []) {
      if (intake.kind === 'water' && intake.flaskId) {
        map.set(intake.flaskId, (map.get(intake.flaskId) ?? 0) + 1);
      }
    }
    return map;
  });

  /** Calcul du placement des prises (couloirs, superposition, fantôme). */
  private readonly layout = computed(() =>
    computePlanLayout({
      intakes: this.event().intakes ?? [],
      productMap: this.productMap(),
      total: this.totalMinutes(),
      trackHeight: this.trackHeight(),
      resizePreview: this.resizePreview(),
      dragOver: this.dragOverPreview(),
    }),
  );

  /** Prises résolues (avec produit) et positionnées sur la piste. */
  protected readonly positionedIntakes = computed<PositionedIntake[]>(() => this.layout().intakes);

  /** Emplacement fantôme prévisualisé (drag depuis la palette). */
  protected readonly ghostBlock = computed<GhostBlock | null>(() => this.layout().ghost);

  /** Nombre de couloirs utilisés (pour la largeur des blocs). */
  protected readonly laneCount = computed(() => this.layout().laneCount);

  /** Unités placées par produit. */
  private readonly placedByProduct = computed(() => {
    const map = new Map<string, number>();
    for (const intake of this.event().intakes ?? []) {
      if (intake.kind === 'water' || !intake.productId) continue;
      map.set(intake.productId, (map.get(intake.productId) ?? 0) + intake.quantity);
    }
    return map;
  });

  /** Flasques de la palette : une entrée par flasque (volume + boisson). */
  protected readonly flaskEntries = computed<PaletteEntry[]>(() => {
    const placed = this.placedByFlask();
    return this.resolvedFlasks().map(({ flask, availableMinute, locationName }) => {
      const carried = flask.quantity;
      const remaining = carried - (placed.get(flask.id) ?? 0);
      const locked = availableMinute > 0 && remaining > 0;
      return {
        product: flask.synthetic,
        carried,
        remaining,
        lockedNow: locked,
        unlock: locked ? { minute: availableMinute, stationName: locationName } : null,
      };
    });
  });

  /** Produits de la palette avec décompte emporté / restant. */
  protected readonly paletteEntries = computed<PaletteEntry[]>(() => {
    const map = this.productMap();
    const placed = this.placedByProduct();
    const schedules = this.availabilitySchedules();
    const intakes = this.event().intakes ?? [];
    const inventory = this.event()
      .items.map((item): PaletteEntry | null => {
        const product = item.product ?? map.get(item.productId);
        if (!product) return null;
        const carried = item.quantity;
        const schedule = schedules.get(item.productId);
        const remaining = carried - (placed.get(item.productId) ?? 0);
        const availableFromStart = schedule?.fromStart ?? carried;
        // Prochain ravito qui fournit ce produit (premier déblocage au-delà du stock initial).
        const nextUnlock = earliestAvailableMinute(
          schedule,
          availableFromStart + portionUnits(item.portionWeight, product.unitWeight),
        );
        // Verrouillé une fois le stock disponible avant ce ravito épuisé par
        // les prises déjà placées avant son passage.
        const usedBeforeUnlock = nextUnlock
          ? intakes
              .filter(
                (i) =>
                  i.kind !== 'water' && i.productId === item.productId && i.startMinute < nextUnlock.minute,
              )
              .reduce((sum, i) => sum + i.quantity, 0)
          : 0;
        const lockedNow = remaining > 0 && !!nextUnlock && usedBeforeUnlock >= availableFromStart;
        const unlock = lockedNow ? nextUnlock : null;
        return { product, carried, remaining, lockedNow, unlock };
      })
      .filter((entry): entry is PaletteEntry => entry !== null);
    // Les flasques (hydratation) en tête, puis l'inventaire solide.
    return [...this.flaskEntries(), ...inventory];
  });

  /** Total d'unités restant à placer (hors éléments illimités comme l'eau). */
  protected readonly unplacedUnits = computed(() =>
    this.paletteEntries().reduce(
      (sum, entry) => (entry.unlimited ? sum : sum + Math.max(0, entry.remaining)),
      0,
    ),
  );

  /** Nombre de séquences sur le parcours. */
  private readonly sequenceCount = computed(() =>
    Math.max(1, Math.ceil(this.totalMinutes() / this.sequenceMinutes())),
  );

  /** Hauteur totale de la piste en pixels. */
  protected readonly trackHeight = computed(() => this.sequenceCount() * PX_PER_SEQUENCE);

  /** Repères de séquence (position + libellé horaire). */
  protected readonly sequenceMarks = computed<SequenceMark[]>(() =>
    buildSequenceMarks({
      total: this.totalMinutes(),
      seq: this.sequenceMinutes(),
      trackHeight: this.trackHeight(),
    }),
  );

  /** Ravitaillements et points de passage positionnés sur la timeline. */
  protected readonly aidStationMarks = computed<PositionedAidStation[]>(() =>
    buildAidStationMarks({
      total: this.totalMinutes(),
      trackHeight: this.trackHeight(),
      aidStations: this.event().aidStations ?? [],
      waypoints: this.event().waypoints ?? [],
    }),
  );

  /** Minutes des ravitos/points de passage : cibles d'aimantation du drag. */
  private readonly magnetMinutes = computed<number[]>(() =>
    this.aidStationMarks().map((mark) => mark.minute),
  );

  /** Minute aimantée active pendant un drag (ravito/waypoint le plus proche), sinon null. */
  private readonly activeMagnetMinute = signal<number | null>(null);

  /** Position (px) du repère d'aimantation à surligner sur la piste (null = aucun). */
  protected readonly activeMagnetTop = computed<number | null>(() => {
    const minute = this.activeMagnetMinute();
    const total = this.totalMinutes();
    if (minute === null || total <= 0) return null;
    return (minute / total) * this.trackHeight();
  });

  /** Récapitulatif horaire (apports vs cible). */
  protected readonly hourlyRecap = computed<PlanHourlyRecap[]>(() =>
    buildHourlyRecap({
      total: this.totalMinutes(),
      goals: enabledHourlyGoals(this.event()),
      intakes: this.positionedIntakes(),
    }),
  );

  onSequenceChange(value: PlanSequenceMinutes): void {
    this.sequenceOverride.set(value);
    this.planSequenceChange.emit(value);
  }

  /** Quitte le plein écran (touche Échap). */
  protected exitFullscreen(): void {
    if (this.fullscreen()) this.fullscreen.set(false);
  }

  /** Dépose sur la timeline : crée une prise (produit) ou déplace (prise). */
  onTimelineDrop(event: CdkDragDrop<string>): void {
    const payload = event.item.data as DragPayload;
    const minute = this.minuteFromDrop(event);
    if (minute === null) return;
    const seq = this.sequenceMinutes();

    if (payload.kind === 'product') {
      const entry = this.paletteEntries().find((e) => e.product.id === payload.productId);
      if (!entry) return;
      const duration = seq;
      const start = this.clampStart(minute, duration);

      // Flasque : une prise d'hydratation qui consomme une recharge.
      if (isFlaskProductId(payload.productId)) {
        const flaskId = flaskIdFromProductId(payload.productId);
        const resolved = this.resolvedFlasks().find((f) => f.flask.id === flaskId);
        if (!resolved) return;
        if (entry.remaining < 1) return;
        if (start < resolved.availableMinute) {
          this.toast.warning(
            `Cette flasque n'est disponible qu'à partir de ${resolved.locationName}.`,
          );
          return;
        }
        const intake: NutritionIntake = {
          id: this.newId(),
          kind: 'water',
          flaskId,
          startMinute: start,
          durationMinutes: duration,
          quantity: 1,
        };
        this.emit([...(this.event().intakes ?? []), intake]);
        return;
      }

      const portion = this.portionUnitsFor(payload.productId);
      if (entry.remaining < portion - QUANTITY_EPSILON) return;

      const schedule = this.availabilitySchedules().get(payload.productId);
      const usedBefore = this.placedQuantityBefore(payload.productId, start);
      if (availableQuantityAt(schedule, start) - usedBefore < portion - QUANTITY_EPSILON) {
        this.toast.warning(
          `${entry.product.name} n'est pas encore disponible à cet instant : il doit d'abord être récupéré sur un ravitaillement.`,
        );
        return;
      }

      const intake: NutritionIntake = {
        id: this.newId(),
        productId: payload.productId,
        startMinute: start,
        durationMinutes: duration,
        quantity: portion,
      };
      this.emit([...(this.event().intakes ?? []), intake]);
    } else {
      // On applique la position prévisualisée (WYSIWYG) plutôt que de
      // recalculer depuis le pointeur : ce que l'utilisateur voit tombe.
      const preview = this.dragOverPreview();
      const current = (this.event().intakes ?? []).find((i) => i.id === payload.intakeId);
      if (!current) return;
      const start =
        preview && preview.excludeId === payload.intakeId
          ? preview.startMinute
          : this.clampStart(minute, current.durationMinutes);

      if (current.kind === 'water' && current.flaskId) {
        const resolved = this.resolvedFlasks().find((f) => f.flask.id === current.flaskId);
        if (resolved && start < resolved.availableMinute) {
          this.toast.warning(
            `Cette flasque n'est disponible qu'à partir de ${resolved.locationName}.`,
          );
          return;
        }
      } else if (current.kind !== 'water' && current.productId) {
        const schedule = this.availabilitySchedules().get(current.productId);
        const usedBefore = this.placedQuantityBefore(current.productId, start, current.id);
        if (availableQuantityAt(schedule, start) - usedBefore < current.quantity) {
          this.toast.warning(
            `Ce produit n'est pas encore disponible à cet instant : il doit d'abord être récupéré sur un ravitaillement.`,
          );
          return;
        }
      }

      this.updateIntake(payload.intakeId, (intake) => ({ ...intake, startMinute: start }));
    }
  }

  /** Dépose sur la palette : retire la prise concernée. */
  onPaletteDrop(event: CdkDragDrop<string>): void {
    const payload = event.item.data as DragPayload;
    if (payload.kind === 'intake') this.removeIntake(payload.intakeId);
  }

  removeIntake(id: string): void {
    this.emit((this.event().intakes ?? []).filter((intake) => intake.id !== id));
  }

  /**
   * Contraint la position du bloc déplacé pour qu'il s'aligne, en direct, sur
   * la grille de séquences. Ainsi ce que l'on voit pendant le drag correspond
   * exactement à l'emplacement de dépôt : plus d'effet de « saut » au lâcher.
   */
  protected readonly constrainToSequence: PlanConstrainPosition = (
    point,
    _drag,
    dimensions,
  ) => {
    const track = this.trackElement();
    if (!track) return point;
    const rect = track.getBoundingClientRect();
    const total = this.totalMinutes();
    if (total <= 0 || rect.height <= 0) return point;

    // Le haut du bloc suit directement le curseur (pas de décalage lié au
    // point de saisie) : l'aperçu correspond ainsi exactement au dépôt.
    const minute = ((point.y - rect.top) / rect.height) * total;
    const duration = (dimensions.height / rect.height) * total;

    // Aimantation vers le ravito/point de passage le plus proche, sinon
    // alignement sur la séquence ; borné pour rester dans le parcours.
    const snappedMinute = this.clampStart(this.snapMinute(minute, rect), duration);
    const snappedTop = (snappedMinute / total) * rect.height;

    // Avec `constrainPosition`, le CDK interprète le point renvoyé comme le
    // coin haut-gauche de l'élément (le verrou d'axe gère l'horizontale) : on
    // renvoie donc le haut aligné, sans réajouter de décalage.
    return { x: point.x, y: rect.top + snappedTop };
  };

  /** Dernière position pointeur d'un drag en cours (coordonnées viewport). */
  private lastDrag: { x: number; y: number; payload: DragPayload } | null = null;

  /** Met à jour l'aperçu du créneau survolé pendant un drag. */
  onDragMoved(event: CdkDragMove): void {
    const { x, y } = event.pointerPosition;
    const payload = event.source.data as DragPayload;
    this.lastDrag = { x, y, payload };
    this.draggedProductId.set(payload.kind === 'product' ? payload.productId : null);
    this.updateAutoScroll(y);
    this.refreshDragPreview();
  }

  /**
   * Recalcule l'aperçu (fantôme) à partir de la dernière position pointeur.
   * Réévalué aussi pendant l'auto-scroll pour que le fantôme suive la piste
   * qui défile sous un curseur immobile.
   */
  private refreshDragPreview(): void {
    const drag = this.lastDrag;
    const track = this.trackElement();
    if (!drag || !track) return;
    const rect = track.getBoundingClientRect();
    const { x, y } = drag;
    if (y < rect.top || y > rect.bottom || x < rect.left || x > rect.right) {
      this.dragOverPreview.set(null);
      this.activeMagnetMinute.set(null);
      return;
    }
    const payload = drag.payload;
    const seq = this.sequenceMinutes();
    const total = this.totalMinutes();
    let duration: number = seq;
    let excludeId: string | null = null;
    if (payload.kind === 'intake') {
      const found = (this.event().intakes ?? []).find((i) => i.id === payload.intakeId);
      if (found) {
        duration = found.durationMinutes;
        excludeId = payload.intakeId;
      }
    }
    // Le haut du bloc s'aligne directement sous le curseur : l'aperçu
    // (fantôme) coïncide donc avec l'emplacement de dépôt final.
    const pointerMin = ((y - rect.top) / rect.height) * total;
    this.activeMagnetMinute.set(this.nearestMagnet(pointerMin, rect));
    const start = this.clampStart(this.snapMinute(pointerMin, rect), duration);
    this.dragOverPreview.set({ startMinute: start, durationMinutes: duration, excludeId });
  }

  /** Fin de drag : réinitialise les aperçus. */
  onDragEnded(): void {
    this.dragging.set(false);
    this.dragOverPreview.set(null);
    this.activeMagnetMinute.set(null);
    this.draggedProductId.set(null);
    this.stopAutoScroll();
    this.lastDrag = null;
  }

  // --- Auto-scroll de la piste pendant un drag ---

  /** Zone (px) près des bords où l'auto-scroll s'enclenche. */
  private static readonly SCROLL_ZONE = 56;
  /** Vitesse max de défilement (px par frame). */
  private static readonly SCROLL_MAX_SPEED = 16;
  private autoScrollFrame = 0;
  private autoScrollSpeed = 0;

  /**
   * Conteneur défilant de la timeline : plus proche ancêtre scrollable de la
   * piste. Résolu dynamiquement (plus robuste qu'une `viewChild` sur la carte).
   */
  private scrollContainer(): HTMLElement | null {
    let el = this.trackElement()?.parentElement ?? null;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Détermine la vitesse d'auto-scroll selon la proximité du curseur avec le
   * haut/bas de la zone défilante, puis (dés)active la boucle d'animation.
   */
  private updateAutoScroll(pointerY: number): void {
    const scroller = this.scrollContainer();
    if (!scroller) {
      this.stopAutoScroll();
      return;
    }
    const rect = scroller.getBoundingClientRect();
    const zone = ConsumptionPlanComponent.SCROLL_ZONE;
    const max = ConsumptionPlanComponent.SCROLL_MAX_SPEED;
    let speed = 0;
    if (pointerY < rect.top + zone) {
      speed = -max * Math.min(1, (rect.top + zone - pointerY) / zone);
    } else if (pointerY > rect.bottom - zone) {
      speed = max * Math.min(1, (pointerY - (rect.bottom - zone)) / zone);
    }
    this.autoScrollSpeed = speed;
    if (speed !== 0) this.startAutoScroll();
    else this.stopAutoScroll();
  }

  private startAutoScroll(): void {
    if (this.autoScrollFrame) return;
    const step = () => {
      const scroller = this.scrollContainer();
      if (!scroller || this.autoScrollSpeed === 0) {
        this.autoScrollFrame = 0;
        return;
      }
      const before = scroller.scrollTop;
      scroller.scrollTop = before + this.autoScrollSpeed;
      // Le fantôme suit la piste qui défile sous le curseur immobile.
      if (scroller.scrollTop !== before) this.refreshDragPreview();
      this.autoScrollFrame = requestAnimationFrame(step);
    };
    this.autoScrollFrame = requestAnimationFrame(step);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollFrame) cancelAnimationFrame(this.autoScrollFrame);
    this.autoScrollFrame = 0;
    this.autoScrollSpeed = 0;
  }

  // --- Redimensionnement au pointeur ---

  private resizeState: {
    id: string;
    edge: ResizeEdge;
    startClientY: number;
    initStart: number;
    initDuration: number;
  } | null = null;
  private readonly onMove = (event: PointerEvent) => this.onResizeMove(event);
  private readonly onUp = () => this.onResizeEnd();

  /** Démarre le redimensionnement d'une prise par l'un de ses bords. */
  startResize(event: PointerEvent, intake: PositionedIntake, edge: ResizeEdge): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizeState = {
      id: intake.id,
      edge,
      startClientY: event.clientY,
      initStart: intake.startMinute,
      initDuration: intake.durationMinutes,
    };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
  }

  private onResizeMove(event: PointerEvent): void {
    const state = this.resizeState;
    const track = this.trackElement();
    if (!state || !track) return;
    const total = this.totalMinutes();
    const seq = this.sequenceMinutes();
    const rect = track.getBoundingClientRect();
    const deltaMinutes = ((event.clientY - state.startClientY) / rect.height) * total;

    if (state.edge === 'bottom') {
      // Le bord bas (fin de la prise) s'aimante vers le ravito/point de passage le plus proche.
      const rawEnd = state.initStart + state.initDuration + deltaMinutes;
      const magnet = this.nearestMagnet(rawEnd, rect);
      this.activeMagnetMinute.set(magnet);
      let end = magnet ?? Math.round(rawEnd / seq) * seq;
      end = Math.max(state.initStart + seq, Math.min(end, total));
      this.resizePreview.set({
        id: state.id,
        startMinute: state.initStart,
        durationMinutes: end - state.initStart,
      });
    } else {
      // Le bord haut (début de la prise) s'aimante vers le ravito/point de passage le plus proche.
      const end = state.initStart + state.initDuration;
      const rawStart = state.initStart + deltaMinutes;
      const magnet = this.nearestMagnet(rawStart, rect);
      this.activeMagnetMinute.set(magnet);
      let start = magnet ?? Math.round(rawStart / seq) * seq;
      start = Math.max(0, Math.min(start, end - seq));
      this.resizePreview.set({ id: state.id, startMinute: start, durationMinutes: end - start });
    }
  }

  private onResizeEnd(): void {
    const state = this.resizeState;
    const preview = this.resizePreview();
    this.cleanupResize();
    if (state && preview) {
      this.updateIntake(state.id, (intake) => ({
        ...intake,
        startMinute: preview.startMinute,
        durationMinutes: preview.durationMinutes,
      }));
    }
    this.resizePreview.set(null);
  }

  private cleanupResize(): void {
    this.resizeState = null;
    this.activeMagnetMinute.set(null);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
  }

  ngOnDestroy(): void {
    this.cleanupResize();
    this.stopAutoScroll();
  }

  private updateIntake(id: string, patch: (intake: NutritionIntake) => NutritionIntake): void {
    this.emit((this.event().intakes ?? []).map((intake) => (intake.id === id ? patch(intake) : intake)));
  }

  /** Émet la nouvelle liste de prises (débarrassée du produit dénormalisé). */
  private emit(intakes: NutritionIntake[]): void {
    this.intakesChange.emit(
      intakes.map(({ product: _product, ...rest }) => rest),
    );
  }

  /** Contraint le début pour que la prise tienne dans le parcours. */
  private clampStart(minute: number, duration: number): number {
    const max = Math.max(0, this.totalMinutes() - duration);
    return Math.min(max, Math.max(0, minute));
  }

  /**
   * Ravito/point de passage le plus proche d'une minute donnée, dans le rayon
   * d'aimantation ({@link MAGNET_RADIUS_PX}). `null` si aucun n'est assez proche.
   */
  private nearestMagnet(rawMinute: number, rect: DOMRect): number | null {
    const total = this.totalMinutes();
    if (total <= 0 || rect.height <= 0) return null;
    const radiusMin = (MAGNET_RADIUS_PX / rect.height) * total;
    let best: number | null = null;
    let bestDist = Infinity;
    for (const minute of this.magnetMinutes()) {
      const dist = Math.abs(minute - rawMinute);
      if (dist <= radiusMin && dist < bestDist) {
        best = minute;
        bestDist = dist;
      }
    }
    return best;
  }

  /** Aimante vers le ravito/point de passage le plus proche, sinon aligne sur la séquence. */
  private snapMinute(rawMinute: number, rect: DOMRect): number {
    const magnet = this.nearestMagnet(rawMinute, rect);
    if (magnet !== null) return magnet;
    const seq = this.sequenceMinutes();
    return Math.round(rawMinute / seq) * seq;
  }

  /** Déduit la minute (aimantée ou alignée séquence) du point de dépôt. */
  private minuteFromDrop(event: CdkDragDrop<string>): number | null {
    const track = this.trackElement();
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const native = event.event;
    const clientY =
      'changedTouches' in native ? native.changedTouches[0]?.clientY : native.clientY;
    if (clientY == null) return null;
    const ratio = (clientY - rect.top) / rect.height;
    const raw = ratio * this.totalMinutes();
    return this.snapMinute(raw, rect);
  }

  private newId(): string {
    const c = globalThis.crypto;
    return c?.randomUUID
      ? c.randomUUID()
      : `intake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
