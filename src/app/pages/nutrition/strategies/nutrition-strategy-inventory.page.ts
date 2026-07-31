import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { NutritionExportService } from '../../../features/nutrition/services/nutrition-export.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import { TabsComponent, type TabItem } from '../../../components/molecules/tabs/tabs.component';
import { SidePanelComponent } from '../../../components/molecules/side-panel/side-panel.component';
import { ModalComponent } from '../../../components/molecules/modal/modal.component';
import { NutritionEventFormComponent } from '../../../components/organisms/nutrition-event-form/nutrition-event-form.component';
import { NutritionStrategyInventoryComponent } from '../../../components/organisms/nutrition-strategy-inventory/nutrition-strategy-inventory.component';
import { ConsumptionPlanComponent } from '../../../components/organisms/consumption-plan/consumption-plan.component';
import type {
  NutritionCategory,
  NutritionEvent,
  NutritionIntake,
  NutritionProduct,
  PlanSequenceMinutes,
} from '../../../core/models';
import { faArrowLeft, faCompress, faExpand, faFilePdf, faPen, faStopwatch, faTrash, faUtensils, faXmark } from '@fortawesome/free-solid-svg-icons';

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
    PageHeaderComponent,
    TabsComponent,
    SidePanelComponent,
    ModalComponent,
    NutritionEventFormComponent,
    NutritionStrategyInventoryComponent,
    ConsumptionPlanComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [class]="
        activeTab() === 'plan'
          ? 'lg:flex lg:h-[calc(100vh-243px)] lg:flex-col'
          : ''
      "
    >
      <ui-page-header
        [title]="event()?.name ?? 'Stratégie alimentaire'"
        subtitle="Quelle est la composition de votre stratégie alimentaire ?"
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

        <ui-button
          actions
          color="secondary"
          variant="full"
          size="sm"
          [icon]="faFilePdf"
          [disabled]="!event()"
          (clicked)="exportPdf()"
        >
          Exporter
        </ui-button>

        <ui-button
          actions
          color="danger"
          variant="full"
          size="sm"
          [icon]="faTrash"
          [disabled]="!event()"
          (clicked)="requestDelete()"
        >
          Supprimer
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
          />
        } @else {
          <div class="lg:min-h-0 lg:flex-1">
            <ui-consumption-plan
              [event]="ev"
              [products]="products()"
              [(fullscreen)]="planFullscreen"
              (intakesChange)="onIntakesChange($event)"
              (planSequenceChange)="onPlanSequenceChange($event)"
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
    <ui-side-panel [open]="panelOpen()" ariaLabel="Modifier l'évènement" (close)="closePanel()">
      @if (panelOpen()) {
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 class="font-display text-lg font-bold text-slate-900">Modifier l'évènement</h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="closePanel()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <ui-nutrition-event-form
              [event]="event()"
              (save)="saveEvent($event)"
              (cancel)="closePanel()"
            />
          </div>
        </div>
      }
    </ui-side-panel>

    <!-- Modale : confirmation de suppression -->
    <ui-modal [open]="deleteModalOpen()" title="Supprimer la stratégie" (close)="cancelDelete()">
      @if (event(); as ev) {
        <p>
          Cette action est irréversible. Pour confirmer la suppression, saisissez le nom de la
          stratégie
          <strong class="font-semibold text-slate-900">« {{ ev.name }} »</strong>.
        </p>
        <input
          type="text"
          class="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          [value]="deleteConfirmName()"
          (input)="deleteConfirmName.set($any($event.target).value)"
          placeholder="Nom de la stratégie"
          aria-label="Nom de la stratégie à confirmer"
          autocomplete="off"
        />
      }
      <div modalFooter class="flex items-center justify-end gap-3">
        <ui-button color="default" variant="ghost" [disabled]="deleting()" (clicked)="cancelDelete()">
          Annuler
        </ui-button>
        <ui-button
          color="danger"
          [icon]="faTrash"
          [disabled]="!deleteNameMatches() || deleting()"
          (clicked)="confirmDelete()"
        >
          Supprimer
        </ui-button>
      </div>
    </ui-modal>
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
  protected readonly faUtensils = faUtensils;
  protected readonly faExpand = faExpand;
  protected readonly faCompress = faCompress;
  protected readonly faPen = faPen;
  protected readonly faXmark = faXmark;
  protected readonly faTrash = faTrash;

  protected readonly tabs: TabItem[] = [
    { id: 'inventory', label: 'Inventaire', icon: faUtensils },
    { id: 'plan', label: 'Plan de consommation', icon: faStopwatch },
  ];
  protected readonly activeTab = signal<'inventory' | 'plan'>('inventory');

  /** État plein écran du plan de consommation (piloté depuis l'en-tête). */
  protected readonly planFullscreen = signal(false);

  protected readonly event = signal<NutritionEvent | null>(null);
  protected readonly products = signal<NutritionProduct[]>([]);
  protected readonly categories = signal<NutritionCategory[]>([]);
  protected readonly notFound = signal(false);

  /** État d'ouverture du panneau d'édition de l'évènement. */
  protected readonly panelOpen = signal(false);

  /** État d'ouverture de la modale de confirmation de suppression. */
  protected readonly deleteModalOpen = signal(false);
  /** Nom saisi par l'utilisateur pour confirmer la suppression. */
  protected readonly deleteConfirmName = signal('');
  /** Suppression en cours (désactive les actions de la modale). */
  protected readonly deleting = signal(false);
  /** Vrai lorsque le nom saisi correspond exactement au nom de la stratégie. */
  protected readonly deleteNameMatches = computed(
    () => this.deleteConfirmName().trim() === (this.event()?.name.trim() ?? ''),
  );

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
    this.loadEvent();
  }

  private loadEvent(): void {
    this.notFound.set(false);
    this.service.getEvent(this.id()).subscribe({
      next: (event) => this.event.set(event),
      error: () => this.notFound.set(true),
    });
  }

  private loadProducts(): void {
    this.service.listProducts().subscribe({
      next: (products) => this.products.set(products),
      error: () => this.toast.error('Impossible de charger les produits.'),
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

  // --- Suppression de l'évènement ---

  /** Ouvre la modale de confirmation de suppression. */
  requestDelete(): void {
    if (!this.event()) return;
    this.deleteConfirmName.set('');
    this.deleteModalOpen.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.deleteModalOpen.set(false);
    this.deleteConfirmName.set('');
  }

  confirmDelete(): void {
    const current = this.event();
    if (!current || !this.deleteNameMatches() || this.deleting()) return;
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
