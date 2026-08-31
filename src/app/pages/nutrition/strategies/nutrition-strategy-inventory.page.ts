import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { NutritionExportService } from '../../../features/nutrition/services/nutrition-export.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { DropdownMenuComponent } from '../../../components/molecules/dropdown-menu/dropdown-menu.component';
import { DropdownMenuItemComponent } from '../../../components/atoms/dropdown-menu-item/dropdown-menu-item.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import { TabsComponent, type TabItem } from '../../../components/molecules/tabs/tabs.component';
import { ConfirmDeleteModalComponent } from '../../../components/molecules/confirm-delete-modal/confirm-delete-modal.component';
import { NutritionEventFormPanelComponent } from '../../../components/organisms/nutrition-event-form-panel/nutrition-event-form-panel.component';
import { NutritionStrategyInventoryComponent } from '../../../components/organisms/nutrition-strategy-inventory/nutrition-strategy-inventory.component';
import { ConsumptionPlanComponent } from '../../../components/organisms/consumption-plan/consumption-plan.component';
import { AidStationTableComponent } from '../../../components/organisms/aid-station-table/aid-station-table.component';
import { AidStationFormPanelComponent } from '../../../components/organisms/aid-station-form-panel/aid-station-form-panel.component';
import {
  RouteProfilePanelComponent,
  type GpxSelection,
} from '../../../components/organisms/route-profile-panel/route-profile-panel.component';
import { GpxReconciliationModalComponent } from '../../../components/molecules/gpx-reconciliation-modal/gpx-reconciliation-modal.component';
import type {
  AidStation,
  GpxDiscrepancies,
  GpxTrack,
  NutritionCategory,
  NutritionEvent,
  NutritionGoals,
  NutritionIntake,
  NutritionProduct,
  PlanSequenceMinutes,
} from '../../../core/models';
import { newAidStationId } from '../../../core/utils/aid-station.util';
import { enrichAidStationFromTrack } from '../../../core/utils/route-point.util';
import { estimatePassageTimeByKmRatio } from '../../../core/utils/passage-time.util';
import { pruneUnavailableIntakes } from '../../../core/utils/product-availability.util';
import type { AllocationResult } from '../../../core/utils/inventory-allocation.util';
import {
  faArrowLeft,
  faCompress,
  faEllipsisVertical,
  faExpand,
  faFilePdf,
  faFlag,
  faLocationDot,
  faPen,
  faRoute,
  faStopwatch,
  faTrash,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Sous-page Nutrition : détail d'une stratégie alimentaire (`strategies/:id`).
 *
 * Deux volets : l'« Inventaire » (produits emportés et couverture des besoins)
 * et le « Plan de consommation » (répartition des prises sur le parcours par
 * glisser-déposer).
 */
@Component({
  selector: 'app-nutrition-strategy-inventory-page',
  standalone: true,
  imports: [
    ButtonComponent,
    IconComponent,
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    PageHeaderComponent,
    TabsComponent,
    ConfirmDeleteModalComponent,
    NutritionEventFormPanelComponent,
    NutritionStrategyInventoryComponent,
    ConsumptionPlanComponent,
    AidStationTableComponent,
    AidStationFormPanelComponent,
    RouteProfilePanelComponent,
    GpxReconciliationModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [class]="
        activeTab() === 'plan'
          ? 'lg:flex lg:h-[calc(100vh-186px)] lg:flex-col'
          : ''
      "
    >
      <ui-page-header
        [title]="event()?.name ?? 'Stratégie alimentaire'"
        subtitle="Quelle est la composition de votre stratégie alimentaire ?"
        [icon]="faFlag"
      >

        <ui-button
          actions
          color="primary"
          variant="full"
          size="sm"
          [icon]="faPen"
          [disabled]="!event()"
          (clicked)="editEvent()"
        >
          Éditer
        </ui-button>

        @if (activeTab() === 'plan') {
          <ui-button
            actions
            [class]="planFullscreen() ? 'fixed right-6 top-6 z-60' : ''"
            color="default"
            [variant]="planFullscreen() ? 'full' : 'outlined'"
            size="sm"
            [icon]="planFullscreen() ? faCompress : faExpand"
            [attr.aria-pressed]="planFullscreen()"
            (clicked)="planFullscreen.set(!planFullscreen())"
          >
            @if (!planFullscreen()) {
              Plein écran
            }
          </ui-button>
        }

        <ui-dropdown-menu actions>
          <ui-button
            trigger
            color="default"
            variant="outlined"
            size="sm"
            [icon]="faEllipsisVertical"
            [disabled]="!event()"
            aria-label="Plus d'actions"
          />
          <ui-dropdown-menu-item [icon]="faFilePdf" (selected)="exportPdf()">
            Exporter
          </ui-dropdown-menu-item>
          <ui-dropdown-menu-item [icon]="faTrash" color="danger" (selected)="requestDelete()">
            Supprimer
          </ui-dropdown-menu-item>
        </ui-dropdown-menu>

         <ui-button actions color="default" variant="ghost" size="sm" [icon]="faArrowLeft" (clicked)="goBack()" tooltipContent="Retour aux stratégies" />
      </ui-page-header>

      @if (event(); as ev) {
        <ui-tabs [tabs]="tabs" [(active)]="activeTab" />

        @if (activeTab() === 'inventory') {
          <ui-nutrition-strategy-inventory
            [event]="ev"
            [products]="products()"
            [categories]="categories()"
            (applySelection)="applySelection($event)"
            (setQuantity)="setQuantity($event)"
            (remove)="removeProduct($event)"
            (allocationChange)="onAllocationChange($event)"
            (goalsChange)="saveGoals($event)"
            (toggleFavorite)="toggleFavorite($event)"
          />
        } @else if (activeTab() === 'aid-stations') {
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-slate-500">
                Positionnez vos ravitaillements depuis le départ de la course.
              </p>
              <ui-button
                color="primary"
                variant="full"
                size="sm"
                [icon]="faLocationDot"
                (clicked)="openNewAidStation()"
              >
                Ajouter un ravitaillement
              </ui-button>
            </div>
            <ui-aid-station-table
              [stations]="ev.aidStations ?? []"
              (select)="editAidStation($event)"
              (edit)="editAidStation($event)"
              (delete)="deleteAidStation($event)"
            />
          </div>
        } @else if (activeTab() === 'route') {
          <ui-route-profile-panel
            [track]="gpxTrack()"
            [aidStations]="ev.aidStations ?? []"
            [uploading]="gpxUploading()"
            (gpxSelected)="onGpxSelected($event)"
            (removeTrack)="removeGpx()"
            (selectAidStation)="editAidStationById($event)"
            (addAidStationAt)="addAidStationAtDistance($event)"
            (moveAidStation)="moveAidStationToDistance($event)"
            (fileError)="onFileError($event)"
          />
        } @else {
          <div class="lg:min-h-0 lg:flex-1">
            <ui-consumption-plan
              [event]="ev"
              [products]="products()"
              [(fullscreen)]="planFullscreen"
              (intakesChange)="onIntakesChange($event)"
              (planSequenceChange)="onPlanSequenceChange($event)"
              (selectAidStation)="onSelectAidStationFromPlan($event)"
            />
          </div>
        }
      } @else if (notFound()) {
        <div
          class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
        >
          <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
            <ui-icon [icon]="faUtensils" size="xl" />
          </div>
          <p class="text-slate-600">Cette stratégie est introuvable.</p>
          <ui-button color="secondary" variant="outlined" [icon]="faArrowLeft" (clicked)="goBack()">
            Retour aux stratégies
          </ui-button>
        </div>
      } @else {
        <p class="text-slate-400">Chargement de la stratégie…</p>
      }
    </section>

    <!-- Panneau : formulaire évènement -->
    <ui-nutrition-event-form-panel
      [open]="panelOpen()"
      [event]="event()"
      (save)="saveEvent($event)"
      (close)="closePanel()"
    />

    <!-- Panneau : formulaire ravitaillement -->
    <ui-aid-station-form-panel
      [open]="aidStationPanelOpen()"
      [station]="editingAidStation()"
      [products]="products()"
      [inventoryItems]="event()?.items ?? []"
      [pickupElsewhere]="editingPickupElsewhere()"
      (save)="saveAidStation($event)"
      (close)="closeAidStationPanel()"
    />

    <!-- Modale : confirmation de suppression -->
    <ui-confirm-delete-modal
      [open]="deleteModalOpen()"
      [itemName]="event()?.name ?? ''"
      title="Supprimer la stratégie"
      entityLabel="de la stratégie"
      placeholder="Nom de la stratégie"
      [deleting]="deleting()"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()"
    />

    <!-- Modale : réconciliation des écarts GPX / évènement -->
    <ui-gpx-reconciliation-modal
      [open]="reconcileOpen()"
      [discrepancies]="reconcileDiscrepancies()"
      (confirm)="applyReconciliation($event)"
      (close)="closeReconciliation()"
    />
  `,
})
export class NutritionStrategyInventoryPage implements OnInit {
  private readonly service = inject(NutritionService);
  private readonly exportService = inject(NutritionExportService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Identifiant de l'évènement, lié au paramètre de route `:id`. */
  readonly id = input.required<string>();

  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faFilePdf = faFilePdf;
  protected readonly faFlag = faFlag;
  protected readonly faUtensils = faUtensils;
  protected readonly faExpand = faExpand;
  protected readonly faCompress = faCompress;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;
  protected readonly faEllipsisVertical = faEllipsisVertical;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faRoute = faRoute;

  protected readonly tabs: TabItem[] = [
    { id: 'inventory', label: 'Inventaire', icon: faUtensils },
    { id: 'aid-stations', label: 'Ravitaillements', icon: faLocationDot },
    { id: 'route', label: 'Parcours', icon: faRoute },
    { id: 'plan', label: 'Plan de consommation', icon: faStopwatch },
  ];
  protected readonly activeTab = signal<'inventory' | 'aid-stations' | 'route' | 'plan'>(
    'inventory',
  );

  /** État plein écran du plan de consommation (piloté depuis l'en-tête). */
  protected readonly planFullscreen = signal(false);

  protected readonly event = signal<NutritionEvent | null>(null);
  protected readonly products = signal<NutritionProduct[]>([]);
  protected readonly categories = signal<NutritionCategory[]>([]);
  protected readonly notFound = signal(false);

  /** Trace GPX de la stratégie (parcours réel), `null` si aucune. */
  protected readonly gpxTrack = signal<GpxTrack | null>(null);
  /** Import GPX en cours. */
  protected readonly gpxUploading = signal(false);
  /** État d'ouverture de la modale de réconciliation des écarts GPX. */
  protected readonly reconcileOpen = signal(false);
  /** Écarts GPX / évènement à réconcilier. */
  protected readonly reconcileDiscrepancies = signal<GpxDiscrepancies | null>(null);

  /** État d'ouverture du panneau d'édition de l'évènement. */
  protected readonly panelOpen = signal(false);

  /** État d'ouverture du panneau d'édition d'un ravitaillement. */
  protected readonly aidStationPanelOpen = signal(false);
  /** Ravitaillement en cours d'édition (`null` pour une création). */
  protected readonly editingAidStation = signal<AidStation | null>(null);

  /**
   * Quantités de produits déjà réparties en « à récupérer » sur les ravitos
   * **autres** que celui en cours d'édition. Plafonne ce que l'on peut encore
   * allouer (le total réparti ne peut pas dépasser la quantité en inventaire).
   */
  protected readonly editingPickupElsewhere = computed<Record<string, number>>(() => {
    const editing = this.editingAidStation();
    const map: Record<string, number> = {};
    for (const station of this.event()?.aidStations ?? []) {
      if (editing && station.id === editing.id) continue;
      for (const item of station.pickup ?? []) {
        if (item.kind === 'product' && item.productId) {
          map[item.productId] = (map[item.productId] ?? 0) + item.quantity;
        }
      }
    }
    return map;
  });

  /** État d'ouverture de la modale de confirmation de suppression. */
  protected readonly deleteModalOpen = signal(false);
  /** Suppression en cours (désactive les actions de la modale). */
  protected readonly deleting = signal(false);

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.loadEvent();
  }

  private loadEvent(): void {
    this.notFound.set(false);
    this.service.getEvent(this.id()).subscribe({
      next: (event) => {
        this.event.set(event);
        if (event.gpxTrackId) {
          this.loadGpx();
        }
      },
      error: () => this.notFound.set(true),
    });
  }

  /** Charge la trace GPX associée à la stratégie (si elle existe). */
  private loadGpx(): void {
    this.service.getGpx(this.id()).subscribe({
      next: (track) => this.gpxTrack.set(track),
      error: () => this.gpxTrack.set(null),
    });
  }

  private loadProducts(): void {
    this.service.listProducts().subscribe({
      next: (products) => this.products.set(products),
      error: () => this.toast.error('Impossible de charger les produits.'),
    });
  }

  /** Ajoute/retire un produit des favoris (mise à jour optimiste + persistance). */
  toggleFavorite(product: NutritionProduct): void {
    const next = !product.favorite;
    this.products.set(
      this.products().map((p) => (p.id === product.id ? { ...p, favorite: next } : p)),
    );
    this.service.setProductFeedback(product.id, { favorite: next }).subscribe({
      error: () => {
        this.products.set(
          this.products().map((p) => (p.id === product.id ? { ...p, favorite: !next } : p)),
        );
        this.toast.error('Impossible de mettre à jour vos favoris. Veuillez réessayer.');
      },
    });
  }

  private loadCategories(): void {
    this.service.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.toast.error('Impossible de charger les catégories.'),
    });
  }

  goBack(): void {
    this.router.navigate(['/nutrition/strategies']);
  }

  // --- Édition de l'évènement ---

  /** Ouvre le panneau d'édition de la stratégie courante. */
  editEvent(): void {
    if (!this.event()) return;
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  saveEvent(payload: Partial<NutritionEvent>): void {
    const current = this.event();
    if (!current) return;
    this.service.updateEvent(current.id, payload).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.closePanel();
      },
      error: () => this.toast.error("Impossible d'enregistrer la stratégie. Veuillez réessayer."),
    });
  }

  /** Enregistre les objectifs nutritionnels modifiés en ligne (sans le formulaire). */
  saveGoals(goals: NutritionGoals): void {
    const current = this.event();
    if (!current) return;
    this.service.updateEvent(current.id, { goals }).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.toast.success('Objectifs nutritionnels mis à jour.');
      },
      error: () => this.toast.error("Impossible d'enregistrer les objectifs. Veuillez réessayer."),
    });
  }

  // --- Ravitaillements ---

  /** Ouvre le panneau pour créer un nouveau ravitaillement. */
  openNewAidStation(): void {
    this.editingAidStation.set(null);
    this.aidStationPanelOpen.set(true);
  }

  /** Ouvre le panneau pour modifier un ravitaillement existant. */
  editAidStation(station: AidStation): void {
    this.editingAidStation.set(station);
    this.aidStationPanelOpen.set(true);
  }

  closeAidStationPanel(): void {
    this.aidStationPanelOpen.set(false);
    this.editingAidStation.set(null);
  }

  /**
   * Enregistre un ravitaillement (création ou mise à jour). Les listes
   * logistiques et consommations existantes sont préservées ; seules les
   * informations de base sont mises à jour par le formulaire.
   */
  saveAidStation(payload: Partial<AidStation>): void {
    const event = this.event();
    if (!event) return;
    const editing = this.editingAidStation();
    const current = event.aidStations ?? [];

    let aidStations: AidStation[];
    if (editing) {
      aidStations = current.map((station) =>
        station.id === editing.id ? { ...station, ...payload, id: editing.id } : station,
      );
    } else {
      const created: AidStation = {
        id: newAidStationId(),
        name: payload.name ?? '',
        note: payload.note,
        accessInfo: payload.accessInfo,
        types: payload.types ?? [],
        distanceFromStart: payload.distanceFromStart,
        elevationGainFromStart: payload.elevationGainFromStart,
        estimatedDurationFromStart: payload.estimatedDurationFromStart ?? 0,
        pickup: payload.pickup ?? [],
        drop: payload.drop ?? [],
        logisticVia: payload.logisticVia,
        todo: payload.todo ?? [],
        consumptions: payload.consumptions ?? [],
      };
      aidStations = [...current, created];
    }

    this.persistAidStations(event.id, aidStations, editing ? 'Ravitaillement mis à jour.' : 'Ravitaillement ajouté.');
    this.closeAidStationPanel();
  }

  /** Ouvre le formulaire d'un ravitaillement depuis un repère de la timeline. */
  onSelectAidStationFromPlan(id: string): void {
    const station = (this.event()?.aidStations ?? []).find((s) => s.id === id);
    if (station) this.editAidStation(station);
  }

  /** Supprime un ravitaillement. */
  deleteAidStation(station: AidStation): void {
    const event = this.event();
    if (!event) return;
    const aidStations = (event.aidStations ?? []).filter((s) => s.id !== station.id);
    this.persistAidStations(event.id, aidStations, 'Ravitaillement supprimé.');
  }

  /** Persiste la liste des ravitaillements et met à jour l'état local. */
  private persistAidStations(eventId: string, aidStations: AidStation[], successMessage: string): void {
    const event = this.event();
    const productMap = new Map(this.products().map((p) => [p.id, p]));
    const { intakes, removedProductNames } = pruneUnavailableIntakes(
      event?.intakes ?? [],
      event?.items ?? [],
      aidStations,
      productMap,
    );

    this.service.updateEvent(eventId, { aidStations, intakes }).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.toast.success(successMessage);
        if (removedProductNames.length > 0) {
          this.toast.warning(
            `Retirés du plan de consommation (produit non disponible à cet instant) : ${removedProductNames.join(', ')}.`,
          );
        }
      },
      error: () =>
        this.toast.error("Impossible d'enregistrer le ravitaillement. Veuillez réessayer."),
    });
  }

  // --- Trace GPX (parcours réel) ---

  /** Ouvre le formulaire d'un ravitaillement à partir de son identifiant. */
  editAidStationById(id: string): void {
    const station = (this.event()?.aidStations ?? []).find((s) => s.id === id);
    if (station) this.editAidStation(station);
  }

  /**
   * Crée un ravitaillement à une distance précise (clic sur le profil / le
   * tracé), enrichi depuis la trace, puis ouvre le formulaire pour le détailler.
   */
  addAidStationAtDistance(distanceKm: number): void {
    const event = this.event();
    const track = this.gpxTrack();
    if (!event || !track) return;
    const rounded = Math.round(distanceKm * 100) / 100;
    // Temps de passage estimé (V1) : ratio kilométrique sur le temps cible.
    const estimatedDurationFromStart = estimatePassageTimeByKmRatio(
      rounded,
      event.targetTimeMinutes,
      track.distance,
    );
    let station: AidStation = {
      id: newAidStationId(),
      name: 'Nouveau ravitaillement',
      types: [],
      distanceFromStart: rounded,
      estimatedDurationFromStart,
      pickup: [],
      drop: [],
      todo: [],
      consumptions: [],
    };
    station = enrichAidStationFromTrack(station, track, { overwrite: true });
    const aidStations = [...(event.aidStations ?? []), station];
    this.persistAidStations(event.id, aidStations, 'Ravitaillement ajouté.');
    this.editAidStation(station);
  }

  /**
   * Repositionne un ravitaillement à une nouvelle distance (glisser sur le
   * profil / le tracé) et recalcule ses valeurs dérivées depuis la trace.
   */
  moveAidStationToDistance(payload: { id: string; distance: number }): void {
    const event = this.event();
    if (!event) return;
    const track = this.gpxTrack();
    const rounded = Math.round(payload.distance * 100) / 100;
    const aidStations = (event.aidStations ?? []).map((s) => {
      if (s.id !== payload.id) return s;
      const moved: AidStation = { ...s, distanceFromStart: rounded };
      return track ? enrichAidStationFromTrack(moved, track, { overwrite: true }) : moved;
    });
    this.persistAidStations(event.id, aidStations, 'Ravitaillement repositionné.');
  }

  /** Importe (ou remplace) la trace GPX de la stratégie. */
  onGpxSelected(selection: GpxSelection): void {
    const event = this.event();
    if (!event || this.gpxUploading()) return;
    this.gpxUploading.set(true);
    this.service.uploadGpx(event.id, selection.content, selection.fileName).subscribe({
      next: (result) => {
        this.gpxUploading.set(false);
        this.gpxTrack.set(result.track);
        this.event.update((ev) =>
          ev
            ? {
                ...ev,
                gpxTrackId: result.track.id,
                gpxDistance: result.track.distance,
                gpxElevationGain: result.track.elevationGain,
                gpxElevationLoss: result.track.elevationLoss,
              }
            : ev,
        );
        this.toast.success('Trace GPX importée.');
        this.enrichAidStationsFromTrack(result.track);
        this.maybeOpenReconciliation(result.discrepancies);
      },
      error: (err: { error?: { code?: string; message?: string } }) => {
        this.gpxUploading.set(false);
        this.toast.error(this.gpxErrorMessage(err?.error?.code, err?.error?.message));
      },
    });
  }

  /** Supprime la trace GPX de la stratégie. */
  removeGpx(): void {
    const event = this.event();
    if (!event) return;
    this.service.removeGpx(event.id).subscribe({
      next: () => {
        this.gpxTrack.set(null);
        this.event.update((ev) =>
          ev
            ? {
                ...ev,
                gpxTrackId: undefined,
                gpxDistance: undefined,
                gpxElevationGain: undefined,
                gpxElevationLoss: undefined,
              }
            : ev,
        );
        this.toast.success('Trace GPX retirée.');
      },
      error: () => this.toast.error('Impossible de retirer la trace GPX. Veuillez réessayer.'),
    });
  }

  /** Signale un fichier GPX illisible côté client. */
  onFileError(message: string): void {
    this.toast.error(message);
  }

  /** Applique le patch de réconciliation choisi (mise à jour explicite). */
  applyReconciliation(patch: Partial<NutritionEvent>): void {
    this.reconcileOpen.set(false);
    const event = this.event();
    if (!event || Object.keys(patch).length === 0) return;
    this.service.updateEvent(event.id, patch).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.toast.success("Données de l'évènement mises à jour.");
      },
      error: () => this.toast.error("Impossible de mettre à jour l'évènement. Veuillez réessayer."),
    });
  }

  /** Ferme la modale de réconciliation sans modifier l'évènement. */
  closeReconciliation(): void {
    this.reconcileOpen.set(false);
  }

  /** Ouvre la réconciliation si un écart significatif (≥ 2 %) est détecté. */
  private maybeOpenReconciliation(discrepancies: GpxDiscrepancies): void {
    const significant = [
      discrepancies.distance,
      discrepancies.elevationGain,
      discrepancies.elevationLoss,
    ].some((d) => d != null && Math.abs(d.deltaPct) >= 2);
    if (significant) {
      this.reconcileDiscrepancies.set(discrepancies);
      this.reconcileOpen.set(true);
    }
  }

  /**
   * Complète (sans écraser) altitude, D+ cumulé et coordonnées des
   * ravitaillements à partir de la trace, puis persiste si des valeurs ont été
   * dérivées.
   */
  private enrichAidStationsFromTrack(track: GpxTrack): void {
    const event = this.event();
    if (!event) return;
    const stations = event.aidStations ?? [];
    if (stations.length === 0) return;
    const enriched = stations.map((s) => enrichAidStationFromTrack(s, track));
    const changed = enriched.some((s, i) => s !== stations[i]);
    if (!changed) return;
    this.service.updateEvent(event.id, { aidStations: enriched }).subscribe({
      next: (updated) => this.event.set(updated),
      error: () => {
        /* Enrichissement best-effort : l'affichage interpole déjà l'altitude. */
      },
    });
  }

  /** Message d'erreur lisible selon le code renvoyé par l'import GPX. */
  private gpxErrorMessage(code: string | undefined, fallback: string | undefined): string {
    switch (code) {
      case 'EMPTY':
        return 'Le fichier GPX est vide.';
      case 'INVALID':
        return "Le fichier n'est pas un GPX valide.";
      case 'NO_TRACKPOINTS':
        return 'Le GPX ne contient aucun point de trace.';
      case 'NO_ALTITUDE':
        return "La trace GPX ne contient pas d'altitude.";
      default:
        return fallback ?? "Impossible d'importer la trace GPX. Veuillez réessayer.";
    }
  }

  // --- Suppression de l'évènement ---

  /** Ouvre la modale de confirmation de suppression. */
  requestDelete(): void {
    if (!this.event()) return;
    this.deleteModalOpen.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.deleteModalOpen.set(false);
  }

  confirmDelete(): void {
    const current = this.event();
    if (!current || this.deleting()) return;
    this.deleting.set(true);
    this.service.removeEvent(current.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteModalOpen.set(false);
        this.toast.success('Stratégie supprimée.');
        this.router.navigate(['/nutrition/strategies']);
      },
      error: () => {
        this.deleting.set(false);
        this.toast.error('Impossible de supprimer la stratégie.');
      },
    });
  }

  /** Exporte la stratégie (inventaire + plan) en PDF via l'aperçu d'impression. */
  exportPdf(): void {
    const event = this.event();
    if (!event) return;
    const opened = this.exportService.exportStrategyToPdf(event, this.products());
    if (!opened) {
      this.toast.error("Autorisez les fenêtres pop-up pour exporter la stratégie en PDF.");
    }
  }

  // --- Inventaire (association de produits) ---

  /**
   * Réconcilie l'inventaire avec la sélection du panneau : conserve les
   * produits toujours cochés (avec leur quantité), ajoute les nouveaux
   * (quantité 1) et retire ceux décochés.
   */
  applySelection(productIds: string[]): void {
    const event = this.event();
    if (!event) return;
    const selected = new Set(productIds);
    const items = event.items
      .filter((item) => selected.has(item.productId))
      .map((item) => this.toPayloadItem(item));
    const kept = new Set(items.map((item) => item.productId));
    for (const productId of productIds) {
      if (!kept.has(productId)) {
        items.push({ productId, quantity: 1 });
      }
    }
    this.persistItems(event.id, items);
  }

  setQuantity(change: { productId: string; quantity: number }): void {
    const event = this.event();
    if (!event) return;
    const items = event.items.map((item) =>
      item.productId === change.productId
        ? { productId: change.productId, quantity: change.quantity }
        : this.toPayloadItem(item),
    );
    this.persistItems(event.id, items);
  }

  removeProduct(productId: string): void {
    const event = this.event();
    if (!event) return;
    const items = event.items
      .filter((item) => item.productId !== productId)
      .map((item) => this.toPayloadItem(item));
    this.persistItems(event.id, items);
  }

  /** Réduit une ligne d'inventaire à sa charge utile API (`productId` + `quantity`). */
  private toPayloadItem(item: { productId: string; quantity: number }): {
    productId: string;
    quantity: number;
  } {
    return { productId: item.productId, quantity: item.quantity };
  }

  private persistItems(eventId: string, items: { productId: string; quantity: number }[]): void {
    this.service.updateEvent(eventId, { items }).subscribe({
      next: (updated) => this.event.set(updated),
      error: () => this.toast.error("Impossible de mettre à jour l'inventaire."),
    });
  }

  /**
   * Applique une réaffectation de l'inventaire par emplacement (départ ↔
   * ravitos). Comme les points de récupération changent, on purge du plan les
   * prises devenues indisponibles et on en informe l'utilisateur.
   */
  onAllocationChange(result: AllocationResult): void {
    const event = this.event();
    if (!event) return;
    const productMap = new Map(this.products().map((p) => [p.id, p]));
    const { intakes, removedProductNames } = pruneUnavailableIntakes(
      event.intakes ?? [],
      result.items,
      result.aidStations,
      productMap,
    );

    this.service
      .updateEvent(event.id, { items: result.items, aidStations: result.aidStations, intakes })
      .subscribe({
        next: (updated) => {
          this.event.set(updated);
          if (removedProductNames.length > 0) {
            this.toast.warning(
              `Retirés du plan de consommation (produit non disponible à cet instant) : ${removedProductNames.join(', ')}.`,
            );
          }
        },
        error: () => this.toast.error("Impossible de mettre à jour l'inventaire."),
      });
  }

  // --- Plan de consommation ---

  onIntakesChange(intakes: NutritionIntake[]): void {
    const event = this.event();
    if (!event) return;
    // Mise à jour optimiste : la timeline reste fluide même si l'appel échoue.
    this.event.set({ ...event, intakes });
    this.service.updateEvent(event.id, { intakes }).subscribe({
      error: () => this.toast.error('Impossible de mettre à jour le plan de consommation.'),
    });
  }

  onPlanSequenceChange(planSequenceMinutes: PlanSequenceMinutes): void {
    const event = this.event();
    if (!event) return;
    this.event.set({ ...event, planSequenceMinutes });
    this.service.updateEvent(event.id, { planSequenceMinutes }).subscribe({
      error: () => this.toast.error('Impossible de mettre à jour le découpage des séquences.'),
    });
  }
}
