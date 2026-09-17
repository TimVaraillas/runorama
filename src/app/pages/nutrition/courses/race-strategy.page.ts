import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { GpxService } from '../../../features/nutrition/services/gpx.service';
import { NutritionExportService } from '../../../features/nutrition/services/nutrition-export.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../components/atoms/spinner/spinner.component';
import { DropdownMenuComponent } from '../../../components/molecules/dropdown-menu/dropdown-menu.component';
import { DropdownMenuItemComponent } from '../../../components/atoms/dropdown-menu-item/dropdown-menu-item.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import {
  SideNavComponent,
  type NavSection,
} from '../../../components/molecules/side-nav/side-nav.component';
import { DashboardLayoutComponent } from '../../../components/templates/dashboard-layout/dashboard-layout.component';
import { ConfirmDeleteModalComponent } from '../../../components/molecules/confirm-delete-modal/confirm-delete-modal.component';
import { ModalComponent } from '../../../components/molecules/modal/modal.component';
import { RaceStrategyFormComponent } from '../../../components/organisms/race-strategy-form/race-strategy-form.component';
import { NutritionStrategyInventoryComponent } from '../../../components/organisms/nutrition-strategy-inventory/nutrition-strategy-inventory.component';
import { ConsumptionPlanComponent } from '../../../components/organisms/consumption-plan/consumption-plan.component';
import { AidStationTableComponent } from '../../../components/organisms/aid-station-table/aid-station-table.component';
import { AidStationFormPanelComponent } from '../../../components/organisms/aid-station-form-panel/aid-station-form-panel.component';
import {
  RouteProfilePanelComponent,
  type GpxSelection,
} from '../../../components/organisms/route-profile-panel/route-profile-panel.component';
import { GpxReconciliationModalComponent } from '../../../components/molecules/gpx-reconciliation-modal/gpx-reconciliation-modal.component';
import { WaypointFormPanelComponent } from '../../../components/organisms/waypoint-form-panel/waypoint-form-panel.component';
import { RoutePointFormPanelComponent } from '../../../components/organisms/route-point-form-panel/route-point-form-panel.component';
import {
  PacingPanelComponent,
  type PacingSavePayload,
} from '../../../components/organisms/pacing-panel/pacing-panel.component';
import { RaceOverviewPanelComponent } from '../../../components/organisms/race-overview-panel/race-overview-panel.component';
import type {
  AidStation,
  GpxDiscrepancies,
  GpxTrack,
  NutritionCategory,
  RaceStrategy,
  NutritionGoals,
  NutritionIntake,
  NutritionProduct,
  PlanSequenceMinutes,
  RoutePointKind,
  RouteWaypoint,
} from '../../../core/models';
import { newAidStationId, newLocalId } from '../../../core/utils/aid-station.util';
import {
  enrichAidStationFromTrack,
  enrichWaypointFromTrack,
  routePointKindLabel,
} from '../../../core/utils/route-point.util';
import { estimatePassageTimeByKmRatio } from '../../../core/utils/passage-time.util';
import { pruneUnavailableIntakes } from '../../../core/utils/product-availability.util';
import type { AllocationResult } from '../../../core/utils/inventory-allocation.util';
import {
  faArrowLeft,
  faBasketShopping,
  faCompress,
  faEllipsisVertical,
  faExpand,
  faFilePdf,
  faFlag,
  faGear,
  faGaugeHigh,
  faLocationDot,
  faRoute,
  faStopwatch,
  faTrash,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Sous-page Nutrition : détail d'une stratégie alimentaire (`strategies/:id`).
 *
 * Deux volets : l'« Inventaire » (produits emportés et couverture des besoins)
 * et le « Plan de nutrition » (répartition des prises sur le parcours par
 * glisser-déposer).
 */
@Component({
  selector: 'race-page',
  standalone: true,
  host: { class: 'flex flex-1 flex-col' },
  imports: [
    ButtonComponent,
    IconComponent,
    SpinnerComponent,
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    PageHeaderComponent,
    SideNavComponent,
    DashboardLayoutComponent,
    ConfirmDeleteModalComponent,
    ModalComponent,
    RaceStrategyFormComponent,
    NutritionStrategyInventoryComponent,
    ConsumptionPlanComponent,
    AidStationTableComponent,
    AidStationFormPanelComponent,
    RouteProfilePanelComponent,
    GpxReconciliationModalComponent,
    WaypointFormPanelComponent,
    RoutePointFormPanelComponent,
    PacingPanelComponent,
    RaceOverviewPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dashboard-layout>
      @if (event()) {
        <ui-side-nav
          sidenav
          class="lg:w-52 lg:shrink-0 lg:border-r lg:border-slate-200"
          [sections]="navSections"
          [(active)]="activeTab"
        />
      }

      <ui-page-header
        header
        flush
        [title]="event()?.name ?? 'Course'"
        [icon]="faFlag"
      >

          @if (activeTab() === 'route') {
            <ng-container actions>
              <ui-button
                color="primary"
                variant="full"
                size="sm"
                [icon]="faLocationDot"
                [attr.aria-pressed]="routeAddMode()"
                (clicked)="routeAddMode.set(!routeAddMode())"
              >
                Ajouter un point
              </ui-button>
              <ui-button
                color="default"
                variant="outlined"
                size="sm"
                [icon]="routeFullscreen() ? faCompress : faExpand"
                [attr.aria-pressed]="routeFullscreen()"
                (clicked)="routeFullscreen.set(!routeFullscreen())"
              >
                {{ routeFullscreen() ? 'Quitter le plein écran' : 'Plein écran' }}
              </ui-button>
            </ng-container>
          } @else if (activeTab() === 'aid-stations') {
            <ng-container actions>
              <ui-button
                color="primary"
                variant="full"
                size="sm"
                [icon]="faLocationDot"
                (clicked)="openNewAidStation()"
              >
                Ajouter un ravitaillement
              </ui-button>
            </ng-container>
          }

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
              Exporter le roadbook
            </ui-dropdown-menu-item>
            @if (gpxTrack()) {
              <ui-dropdown-menu-item [icon]="faRoute" (selected)="exportGpx()">
                Exporter le tracé GPX
              </ui-dropdown-menu-item>
              <ui-dropdown-menu-item [icon]="faTrash" color="danger" (selected)="requestRemoveGpx()">
                Supprimer la trace GPX
              </ui-dropdown-menu-item>
            }
            <ui-dropdown-menu-item [icon]="faTrash" color="danger" (selected)="requestDelete()">
              Supprimer
            </ui-dropdown-menu-item>
          </ui-dropdown-menu>

          <ui-button actions color="default" variant="ghost"  [icon]="faArrowLeft" (clicked)="goBack()">
            Retour
          </ui-button>
      </ui-page-header>
      @if (event(); as ev) {
          <div
            class="min-w-0 flex-1"
            [class]="
              activeTab() === 'plan' ? 'lg:flex lg:min-h-0 lg:flex-col' : ''
            "
          >

        @if (activeTab() === 'overview') {
          <ui-race-overview-panel
            class="block -mx-4 -mt-6 lg:-mx-6"
            [event]="ev"
            [track]="gpxTrack()"
          />
        } @else if (activeTab() === 'configuration') {
          <div class="mx-auto w-full max-w-4xl">
            <ui-race-strategy-form
              [event]="ev"
              (save)="saveEvent($event)"
              (cancel)="activeTab.set('route')"
            />
          </div>
        } @else if (activeTab() === 'inventory') {
          @if (productsLoading()) {
            <div class="flex flex-col items-center gap-3 py-16 text-center">
              <ui-spinner [size]="32" />
              <p class="text-sm text-slate-400">Chargement de l'inventaire…</p>
            </div>
          } @else {
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
          }
        }
        @else if (activeTab() === 'aid-stations') {
          <div class="space-y-4">
            <div>
              <p class="text-sm text-slate-500">
                Positionnez vos ravitaillements depuis le départ de la course.
              </p>
            </div>
            <ui-aid-station-table
              [stations]="ev.aidStations ?? []"
              [startTime]="ev.startTime"
              [targetTimeMinutes]="ev.targetTimeMinutes"
              [totalDistanceKm]="ev.gpxDistance ?? ev.distance"
              (select)="editAidStation($event)"
              (edit)="editAidStation($event)"
              (delete)="deleteAidStation($event)"
            />
          </div>
        } @else if (activeTab() === 'route') {
          <ui-route-profile-panel
            [class]="routeFullscreen() ? 'block' : 'block -mx-4 -mt-6 lg:-mx-6'"
            [track]="gpxTrack()"
            [aidStations]="ev.aidStations ?? []"x
            [waypoints]="ev.waypoints ?? []"
            [date]="ev.date"
            [startTime]="ev.startTime"
            [targetTimeMinutes]="ev.targetTimeMinutes ?? 0"
            [loading]="gpxLoading()"
            [uploading]="gpxUploading()"
            [(fullscreen)]="routeFullscreen"
            [(addMode)]="routeAddMode"
            [removeTrackRequest]="removeTrackRequest()"
            (gpxSelected)="onGpxSelected($event)"
            (removeTrack)="removeGpx()"
            (selectAidStation)="selectPoint($event)"
            (addPoint)="addPoint($event)"
            (moveAidStation)="moveAidStationToDistance($event)"
            (fileError)="onFileError($event)"
          />
        } @else if (activeTab() === 'pacing') {
          <ui-pacing-panel
            class="block -mx-4 -mt-6 lg:-mx-6"
            [event]="ev"
            [track]="gpxTrack()"
            (save)="savePacing($event)"
          />
        } @else {
          <div class="lg:min-h-0 lg:flex-1">
            @if (productsLoading()) {
              <div class="flex flex-col items-center gap-3 py-16 text-center">
                <ui-spinner [size]="32" />
                <p class="text-sm text-slate-400">Chargement du plan…</p>
              </div>
            } @else {
              <ui-consumption-plan
                [event]="ev"
                [products]="products()"
                [(fullscreen)]="planFullscreen"
                (intakesChange)="onIntakesChange($event)"
                (planSequenceChange)="onPlanSequenceChange($event)"
                (selectAidStation)="onSelectAidStationFromPlan($event)"
              />
            }
          </div>
        }
          </div>
      } @else if (notFound()) {
        <div
          class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
        >
          <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
            <ui-icon [icon]="faUtensils" size="xl" />
          </div>
          <p class="text-slate-600">Cette course est introuvable.</p>
          <ui-button color="secondary" variant="outlined" [icon]="faArrowLeft" (clicked)="goBack()">
            Retour aux courses
          </ui-button>
        </div>
      } @else {
        <div class="flex flex-col items-center gap-3 py-16 text-center">
          <ui-spinner [size]="32" />
          <p class="text-sm text-slate-400">Chargement de la course…</p>
        </div>
      }
    </ui-dashboard-layout>

    <!-- Panneau : formulaire ravitaillement -->
    <ui-aid-station-form-panel
      [open]="aidStationPanelOpen()"
      [station]="editingAidStation()"
      [products]="products()"
      [inventoryItems]="event()?.items ?? []"
      [pickupElsewhere]="editingPickupElsewhere()"
      (save)="saveAidStation($event)"
      (delete)="deleteAidStationFromPanel()"
      (close)="closeAidStationPanel()"
    />

    <!-- Modale : confirmation de suppression -->
    <ui-confirm-delete-modal
      [open]="deleteModalOpen()"
      [itemName]="event()?.name ?? ''"
      title="Supprimer la course"
      entityLabel="de la course"
      placeholder="Nom de la course"
      [deleting]="deleting()"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()"
    />

    <!-- Modale : choix du scénario de pacing à exporter -->
    <ui-modal
      [open]="pdfScenarioModalOpen()"
      title="Exporter le roadbook"
      (close)="pdfScenarioModalOpen.set(false)"
    >
      <p class="text-sm text-slate-500">
        Choisissez le scénario de pacing à inclure dans le roadbook.
      </p>
      <div class="mt-4 space-y-2">
        @for (scenario of event()?.pacingScenarios ?? []; track scenario.id) {
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
          >
            <input
              type="radio"
              name="pdf-scenario"
              [value]="scenario.id"
              [checked]="pdfScenarioId() === scenario.id"
              (change)="pdfScenarioId.set(scenario.id)"
            />
            <span class="flex-1 text-sm font-medium text-slate-700">{{ scenario.name }}</span>
            <span class="tabular-nums text-xs text-slate-400">{{ pacingScenarioLabel(scenario.targetTimeMinutes) }}</span>
          </label>
        }
      </div>
      <div modalFooter class="flex items-center justify-end gap-3">
        <ui-button color="default" variant="ghost" (clicked)="pdfScenarioModalOpen.set(false)">
          Annuler
        </ui-button>
        <ui-button color="primary" [icon]="faFilePdf" (clicked)="confirmExportPdf()">
          Exporter
        </ui-button>
      </div>
    </ui-modal>

    <!-- Modale : réconciliation des écarts GPX / évènement -->
    <ui-gpx-reconciliation-modal
      [open]="reconcileOpen()"
      [discrepancies]="reconcileDiscrepancies()"
      (confirm)="applyReconciliation($event)"
      (close)="closeReconciliation()"
    />

    <!-- Panneau latéral : édition d'un point de passage (checkpoint, sommet, perso) -->
    <ui-waypoint-form-panel
      [open]="waypointModalOpen()"
      [waypoint]="editingWaypoint()"
      (save)="saveWaypoint($event)"
      (delete)="deleteWaypoint()"
      (close)="closeWaypointModal()"
    />

    <!-- Panneau : création d'un point du parcours -->
    <ui-route-point-form-panel
      [open]="routePointPanelOpen()"
      [distance]="routePointDistance()"
      [station]="routePointDraft()"
      [initialKind]="routePointInitialKind()"
      [canDelete]="routePointEditingId() !== null"
      [products]="products()"
      [inventoryItems]="event()?.items ?? []"
      [pickupElsewhere]="editingPickupElsewhere()"
      (aidStationSave)="saveRoutePointAidStation($event)"
      (waypointSave)="saveRoutePointWaypoint($event)"
      (delete)="deleteRoutePoint()"
      (close)="closeRoutePointPanel()"
    />
  `,
})
export class RaceStrategyPage {
  private readonly service = inject(NutritionService);
  private readonly gpxService = inject(GpxService);
  private readonly exportService = inject(NutritionExportService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Identifiant de l'évènement, lié au paramètre de route `:id`. */
  readonly id = input.required<string>();

  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faFilePdf = faFilePdf;
  protected readonly faFlag = faFlag;
  protected readonly faGear = faGear;
  protected readonly faUtensils = faUtensils;
  protected readonly faExpand = faExpand;
  protected readonly faCompress = faCompress;
  protected readonly faTrash = faTrash;
  protected readonly faEllipsisVertical = faEllipsisVertical;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faRoute = faRoute;
  protected readonly faStopwatch = faStopwatch;
  protected readonly faGaugeHigh = faGaugeHigh;

  protected readonly navSections: NavSection[] = [
    { items: [{ id: 'overview', label: "Vue d'ensemble", icon: faGaugeHigh }] },
    {
      label: 'Parcours',
      items: [
        { id: 'route', label: 'Parcours', icon: faRoute },
        { id: 'pacing', label: 'Pacing', icon: faStopwatch },
        { id: 'aid-stations', label: 'Ravitaillements', icon: faLocationDot },
      ],
    },
    {
      label: 'Nutrition',
      items: [
        { id: 'inventory', label: 'Inventaire', icon: faBasketShopping },
        { id: 'plan', label: 'Plan de nutrition', icon: faUtensils },
      ],
    },
    {
      label: 'Paramètres',
      items: [{ id: 'configuration', label: 'Configuration', icon: faGear }],
    },
  ];
  protected readonly activeTab = signal<
    'overview' | 'inventory' | 'aid-stations' | 'route' | 'pacing' | 'plan' | 'configuration'
  >('overview');

  /** État plein écran du plan de nutrition (piloté depuis l'en-tête). */
  protected readonly planFullscreen = signal(false);
  /** État du parcours plein écran et de son mode d'ajout, pilotés par l'en-tête. */
  protected readonly routeFullscreen = signal(false);
  protected readonly routeAddMode = signal(false);

  protected readonly event = signal<RaceStrategy | null>(null);
  protected readonly products = signal<NutritionProduct[]>([]);
  /** Chargement des produits en cours (inventaire / plan). */
  protected readonly productsLoading = signal(true);
  protected readonly categories = signal<NutritionCategory[]>([]);
  protected readonly notFound = signal(false);

  /** Trace GPX de la stratégie (parcours réel), `null` si aucune. */
  protected readonly gpxTrack = signal<GpxTrack | null>(null);
  /** Chargement de la trace GPX en cours. */
  protected readonly gpxLoading = signal(true);
  /** Import GPX en cours. */
  protected readonly gpxUploading = signal(false);
  protected readonly removeTrackRequest = signal(0);
  /** État d'ouverture de la modale de réconciliation des écarts GPX. */
  protected readonly reconcileOpen = signal(false);
  /** Écarts GPX / évènement à réconcilier. */
  protected readonly reconcileDiscrepancies = signal<GpxDiscrepancies | null>(null);
  /** État d'ouverture de la modale d'édition d'un point de passage. */
  protected readonly waypointModalOpen = signal(false);
  /** Point de passage en cours d'édition (`null` sinon). */
  protected readonly editingWaypoint = signal<RouteWaypoint | null>(null);

  /** État du panneau unifié de création d'un point du parcours. */
  protected readonly routePointPanelOpen = signal(false);
  protected readonly routePointDistance = signal(0);
  protected readonly routePointDraft = signal<AidStation | null>(null);
  protected readonly routePointInitialKind = signal<RoutePointKind>('AID_STATION');
  protected readonly routePointEditingId = signal<string | null>(null);
  protected readonly routePointOriginalKind = signal<RoutePointKind | null>(null);

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

  /** État d'ouverture de la modale de choix du scénario à exporter. */
  protected readonly pdfScenarioModalOpen = signal(false);
  /** Identifiant du scénario sélectionné pour l'export PDF. */
  protected readonly pdfScenarioId = signal<string | null>(null);

  constructor() {
    // Chargement navigateur uniquement : le SSR rend les loaders au lieu des
    // états vides / « introuvable » (requêtes non authentifiées côté serveur).
    afterNextRender(() => {
      this.loadProducts();
      this.loadCategories();
      this.loadEvent();
    });
  }

  private loadEvent(): void {
    this.notFound.set(false);
    this.gpxLoading.set(true);
    this.service.getStrategy(this.id()).subscribe({
      next: (event) => {
        this.event.set(event);
        if (event.gpxTrackId) {
          this.loadGpx();
        } else {
          this.gpxLoading.set(false);
        }
      },
      error: () => {
        this.gpxLoading.set(false);
        this.notFound.set(true);
      },
    });
  }

  /** Charge la trace GPX associée à la stratégie (si elle existe). */
  private loadGpx(): void {
    this.gpxService.get(this.id()).subscribe({
      next: (track) => {
        this.gpxTrack.set(track);
        this.gpxLoading.set(false);
      },
      error: () => {
        this.gpxTrack.set(null);
        this.gpxLoading.set(false);
      },
    });
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.service.listProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.productsLoading.set(false);
      },
      error: () => {
        this.productsLoading.set(false);
        this.toast.error('Impossible de charger les produits.');
      },
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
    this.router.navigate(['/courses']);
  }

  // --- Édition de l'évènement ---

  saveEvent(payload: Partial<RaceStrategy>): void {
    const current = this.event();
    if (!current) return;
    this.service.updateStrategy(current.id, payload).subscribe({
      next: (updated) => {
        this.event.set(updated);
      },
      error: () => this.toast.error("Impossible d'enregistrer la course. Veuillez réessayer."),
    });
  }

  savePacing(payload: PacingSavePayload): void {
    const current = this.event();
    if (!current) return;
    this.service.updateStrategy(current.id, payload).subscribe({
      next: (updated) => this.event.set(updated),
      error: () => this.toast.error("Impossible d'enregistrer le plan de pacing."),
    });
  }

  /** Enregistre les objectifs nutritionnels modifiés en ligne (sans le formulaire). */
  saveGoals(goals: NutritionGoals): void {
    const current = this.event();
    if (!current) return;
    this.service.updateStrategy(current.id, { goals }).subscribe({
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

  /** Ouvre l'éditeur d'un point (ravitaillement ou waypoint) depuis la timeline. */
  onSelectAidStationFromPlan(id: string): void {
    this.selectPoint(id);
  }

  /** Supprime un ravitaillement. */
  deleteAidStation(station: AidStation): void {
    const event = this.event();
    if (!event) return;
    const aidStations = (event.aidStations ?? []).filter((s) => s.id !== station.id);
    this.persistAidStations(event.id, aidStations, 'Ravitaillement supprimé.');
  }

  deleteAidStationFromPanel(): void {
    const station = this.editingAidStation();
    if (station) this.deleteAidStation(station);
    this.closeAidStationPanel();
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

    this.service.updateStrategy(eventId, { aidStations, intakes }).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.toast.success(successMessage);
        if (removedProductNames.length > 0) {
          this.toast.warning(
            `Retirés du plan de nutrition (produit non disponible à cet instant) : ${removedProductNames.join(', ')}.`,
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

  /** Aiguille l'ajout d'un point selon son type (ravitaillement ou waypoint). */
  addPoint(payload: { distance: number }): void {
    const event = this.event();
    const track = this.gpxTrack();
    if (!event || !track) return;
    const rounded = Math.round(payload.distance * 100) / 100;
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
      stopDurationMinutes: 5,
      pickup: [],
      drop: [],
      todo: [],
      consumptions: [],
    };
    station = enrichAidStationFromTrack(station, track, { overwrite: true });
    this.editingAidStation.set(null);
    this.routePointDistance.set(rounded);
    this.routePointDraft.set(station);
    this.routePointPanelOpen.set(true);
  }

  saveRoutePointAidStation(payload: Partial<AidStation>): void {
    const event = this.event();
    const draft = this.routePointDraft();
    if (!event || !draft) return;
    const id = this.routePointEditingId() ?? draft.id;
    const station: AidStation = { ...draft, ...payload, id };
    const aidStations = (event.aidStations ?? []).filter((item) => item.id !== id);
    const waypoints = (event.waypoints ?? []).filter((item) => item.id !== id);
    this.persistRoutePointLists(
      event.id,
      [...aidStations, station],
      waypoints,
      this.routePointOriginalKind() ? 'Point mis à jour.' : 'Ravitaillement ajouté.',
    );
    this.closeRoutePointPanel();
  }

  saveRoutePointWaypoint(payload: { name: string; kind: Exclude<RoutePointKind, 'AID_STATION'> }): void {
    const event = this.event();
    const track = this.gpxTrack();
    if (!event || !track) return;
    const rounded = this.routePointDistance();
    const id = this.routePointEditingId() ?? newLocalId('wpt');
    let waypoint: RouteWaypoint = {
      id,
      name: payload.name,
      kind: payload.kind,
      distanceFromStart: rounded,
      estimatedDurationFromStart: estimatePassageTimeByKmRatio(
        rounded,
        event.targetTimeMinutes,
        track.distance,
      ),
    };
    waypoint = enrichWaypointFromTrack(waypoint, track, { overwrite: true });
    const aidStations = (event.aidStations ?? []).filter((item) => item.id !== id);
    const waypoints = (event.waypoints ?? []).filter((item) => item.id !== id);
    this.persistRoutePointLists(
      event.id,
      aidStations,
      [...waypoints, waypoint],
      this.routePointOriginalKind() ? 'Point mis à jour.' : 'Point ajouté.',
    );
    this.closeRoutePointPanel();
  }

  deleteRoutePoint(): void {
    const event = this.event();
    const id = this.routePointEditingId();
    if (!event || !id) return;
    this.persistRoutePointLists(
      event.id,
      (event.aidStations ?? []).filter((item) => item.id !== id),
      (event.waypoints ?? []).filter((item) => item.id !== id),
      'Point supprimé.',
    );
    this.closeRoutePointPanel();
  }

  closeRoutePointPanel(): void {
    this.routePointPanelOpen.set(false);
    this.routePointDraft.set(null);
    this.editingAidStation.set(null);
    this.routePointEditingId.set(null);
    this.routePointOriginalKind.set(null);
    this.routePointInitialKind.set('AID_STATION');
  }

  private persistRoutePointLists(
    eventId: string,
    aidStations: AidStation[],
    waypoints: RouteWaypoint[],
    successMessage: string,
  ): void {
    this.service.updateStrategy(eventId, { aidStations, waypoints }).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.toast.success(successMessage);
      },
      error: () => this.toast.error("Impossible d'enregistrer le point. Veuillez réessayer."),
    });
  }

  /** Ouvre l'éditeur approprié selon la nature du point sélectionné. */
  selectPoint(id: string): void {
    const station = (this.event()?.aidStations ?? []).find((s) => s.id === id);
    if (station) {
      this.routePointDistance.set(station.distanceFromStart ?? 0);
      this.routePointDraft.set(station);
        this.editingAidStation.set(station);
      this.routePointInitialKind.set('AID_STATION');
      this.routePointEditingId.set(station.id);
      this.routePointOriginalKind.set('AID_STATION');
      this.routePointPanelOpen.set(true);
      return;
    }
    const waypoint = (this.event()?.waypoints ?? []).find((w) => w.id === id);
    if (waypoint) {
      this.routePointDistance.set(waypoint.distanceFromStart ?? 0);
      this.routePointDraft.set({
        id: waypoint.id,
        name: waypoint.name,
        types: [],
        distanceFromStart: waypoint.distanceFromStart,
        elevationGainFromStart: waypoint.elevationGainFromStart,
        estimatedDurationFromStart: waypoint.estimatedDurationFromStart ?? 0,
        pickup: [],
        drop: [],
        todo: [],
        consumptions: [],
      });
      this.editingAidStation.set(null);
      this.routePointInitialKind.set(waypoint.kind);
      this.routePointEditingId.set(waypoint.id);
      this.routePointOriginalKind.set(waypoint.kind);
      this.routePointPanelOpen.set(true);
    }
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
      stopDurationMinutes: 5,
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
   * Repositionne un point de passage (ravitaillement ou waypoint) à une nouvelle
   * distance (glisser sur le profil / le tracé) et recalcule ses valeurs
   * dérivées depuis la trace.
   */
  moveAidStationToDistance(payload: { id: string; distance: number }): void {
    const event = this.event();
    if (!event) return;
    const track = this.gpxTrack();
    const rounded = Math.round(payload.distance * 100) / 100;

    const isAidStation = (event.aidStations ?? []).some((s) => s.id === payload.id);
    if (isAidStation) {
      const aidStations = (event.aidStations ?? []).map((s) => {
        if (s.id !== payload.id) return s;
        const moved: AidStation = { ...s, distanceFromStart: rounded };
        return track ? enrichAidStationFromTrack(moved, track, { overwrite: true }) : moved;
      });
      this.persistAidStations(event.id, aidStations, 'Ravitaillement repositionné.');
      return;
    }

    const waypoints = (event.waypoints ?? []).map((w) => {
      if (w.id !== payload.id) return w;
      const moved: RouteWaypoint = { ...w, distanceFromStart: rounded };
      return track ? enrichWaypointFromTrack(moved, track, { overwrite: true }) : moved;
    });
    this.persistWaypoints(event.id, waypoints, 'Point repositionné.');
  }

  /**
   * Crée un point de passage (checkpoint, sommet, perso) à une distance précise,
   * enrichi depuis la trace, puis ouvre l'éditeur léger pour le nommer.
   */
  private createWaypointAtDistance(distanceKm: number, kind: RoutePointKind): void {
    const event = this.event();
    const track = this.gpxTrack();
    if (!event || !track || kind === 'AID_STATION') return;
    const rounded = Math.round(distanceKm * 100) / 100;
    const estimatedDurationFromStart = estimatePassageTimeByKmRatio(
      rounded,
      event.targetTimeMinutes,
      track.distance,
    );
    let waypoint: RouteWaypoint = {
      id: newLocalId('wpt'),
      name: routePointKindLabel(kind),
      kind: kind as Exclude<RoutePointKind, 'AID_STATION'>,
      distanceFromStart: rounded,
      estimatedDurationFromStart,
    };
    waypoint = enrichWaypointFromTrack(waypoint, track, { overwrite: true });
    const waypoints = [...(event.waypoints ?? []), waypoint];
    this.persistWaypoints(event.id, waypoints, 'Point ajouté.');
    this.editingWaypoint.set(waypoint);
    this.waypointModalOpen.set(true);
  }

  /** Enregistre le nom/type du point de passage en cours d'édition. */
  saveWaypoint(payload: { name: string; kind: Exclude<RoutePointKind, 'AID_STATION'> }): void {
    const event = this.event();
    const editing = this.editingWaypoint();
    if (!event || !editing) return;
    const waypoints = (event.waypoints ?? []).map((w) =>
      w.id === editing.id ? { ...w, name: payload.name, kind: payload.kind } : w,
    );
    this.persistWaypoints(event.id, waypoints, 'Point mis à jour.');
    this.closeWaypointModal();
  }

  /** Supprime le point de passage en cours d'édition. */
  deleteWaypoint(): void {
    const event = this.event();
    const editing = this.editingWaypoint();
    if (!event || !editing) return;
    const waypoints = (event.waypoints ?? []).filter((w) => w.id !== editing.id);
    this.persistWaypoints(event.id, waypoints, 'Point supprimé.');
    this.closeWaypointModal();
  }

  /** Ferme l'éditeur de point de passage. */
  closeWaypointModal(): void {
    this.waypointModalOpen.set(false);
    this.editingWaypoint.set(null);
  }

  /** Persiste la liste des points de passage et met à jour l'état local. */
  private persistWaypoints(
    eventId: string,
    waypoints: RouteWaypoint[],
    successMessage: string,
  ): void {
    this.service.updateStrategy(eventId, { waypoints }).subscribe({
      next: (updated) => {
        this.event.set(updated);
        this.toast.success(successMessage);
      },
      error: () => this.toast.error("Impossible d'enregistrer le point. Veuillez réessayer."),
    });
  }

  /** Importe (ou remplace) la trace GPX de la stratégie. */
  onGpxSelected(selection: GpxSelection): void {
    const event = this.event();
    if (!event || this.gpxUploading()) return;
    this.gpxUploading.set(true);
    this.gpxService.upload(event.id, selection.content, selection.fileName).subscribe({
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
  requestRemoveGpx(): void {
    this.removeTrackRequest.update((request) => request + 1);
  }

  removeGpx(): void {
    const event = this.event();
    if (!event) return;
    this.gpxService.remove(event.id).subscribe({
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
  applyReconciliation(patch: Partial<RaceStrategy>): void {
    this.reconcileOpen.set(false);
    const event = this.event();
    if (!event || Object.keys(patch).length === 0) return;
    this.service.updateStrategy(event.id, patch).subscribe({
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
    this.service.updateStrategy(event.id, { aidStations: enriched }).subscribe({
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
    this.service.removeStrategy(current.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteModalOpen.set(false);
        this.toast.success('Course supprimée.');
        this.router.navigate(['/courses']);
      },
      error: () => {
        this.deleting.set(false);
        this.toast.error('Impossible de supprimer la course.');
      },
    });
  }

  /** Exporte la stratégie (inventaire + plan + parcours) en PDF via l'aperçu d'impression. */
  exportPdf(): void {
    const event = this.event();
    if (!event) return;
    const scenarios = event.pacingScenarios ?? [];
    if (scenarios.length > 1) {
      this.pdfScenarioId.set(event.referenceScenarioId ?? scenarios[0]!.id);
      this.pdfScenarioModalOpen.set(true);
      return;
    }
    this.runPdfExport(event);
  }

  /** Exporte le roadbook pour le scénario choisi dans la modale. */
  confirmExportPdf(): void {
    const event = this.event();
    if (!event) return;
    const scenario = event.pacingScenarios?.find((item) => item.id === this.pdfScenarioId());
    this.pdfScenarioModalOpen.set(false);
    const exported = scenario
      ? { ...event, pacingPlan: scenario.pacingPlan, targetTimeMinutes: scenario.targetTimeMinutes }
      : event;
    this.runPdfExport(exported);
  }

  /** Libellé court d'un chrono cible (ex. 10h30). */
  pacingScenarioLabel(minutes: number): string {
    return `${Math.floor(minutes / 60)}h${Math.round(minutes % 60).toString().padStart(2, '0')}`;
  }

  private runPdfExport(event: RaceStrategy): void {
    const opened = this.exportService.exportStrategyToPdf(event, this.products(), this.gpxTrack());
    if (!opened) {
      this.toast.error("Autorisez les fenêtres pop-up pour exporter la course en PDF.");
    }
  }

  /**
   * Télécharge la trace GPX enrichie des points d'intérêt (ravitaillements +
   * points de passage). Le fichier est généré côté serveur à partir de la trace
   * pleine résolution.
   */
  exportGpx(): void {
    const event = this.event();
    if (!event) return;
    if (!this.gpxTrack()) {
      this.toast.error("Importez d'abord une trace GPX pour l'exporter.");
      return;
    }
    this.gpxService.export(event.id).subscribe({
      next: (response) => this.downloadGpxResponse(response),
      error: () => this.toast.error("Impossible d'exporter la trace GPX."),
    });
  }

  /** Déclenche le téléchargement du blob GPX (nom de fichier via Content-Disposition). */
  private downloadGpxResponse(response: HttpResponse<Blob>): void {
    const body = response.body;
    if (!body || typeof document === 'undefined') return;
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    const fileName = match?.[1] ?? 'parcours.gpx';
    const url = URL.createObjectURL(body);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
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
    this.service.updateStrategy(eventId, { items }).subscribe({
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
      .updateStrategy(event.id, { items: result.items, aidStations: result.aidStations, intakes })
      .subscribe({
        next: (updated) => {
          this.event.set(updated);
          if (removedProductNames.length > 0) {
            this.toast.warning(
              `Retirés du plan de nutrition (produit non disponible à cet instant) : ${removedProductNames.join(', ')}.`,
            );
          }
        },
        error: () => this.toast.error("Impossible de mettre à jour l'inventaire."),
      });
  }

  // --- Plan de nutrition ---

  onIntakesChange(intakes: NutritionIntake[]): void {
    const event = this.event();
    if (!event) return;
    // Mise à jour optimiste : la timeline reste fluide même si l'appel échoue.
    this.event.set({ ...event, intakes });
    this.service.updateStrategy(event.id, { intakes }).subscribe({
      error: () => this.toast.error('Impossible de mettre à jour le plan de nutrition.'),
    });
  }

  onPlanSequenceChange(planSequenceMinutes: PlanSequenceMinutes): void {
    const event = this.event();
    if (!event) return;
    this.event.set({ ...event, planSequenceMinutes });
    this.service.updateStrategy(event.id, { planSequenceMinutes }).subscribe({
      error: () => this.toast.error('Impossible de mettre à jour le découpage des séquences.'),
    });
  }
}
