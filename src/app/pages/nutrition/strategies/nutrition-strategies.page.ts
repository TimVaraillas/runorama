import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../components/atoms/spinner/spinner.component';
import { SearchInputComponent } from '../../../components/atoms/search-input/search-input.component';
import { DateRangeFilterComponent } from '../../../components/atoms/date-range-filter/date-range-filter.component';
import {
  FilterableSelectComponent,
  type FilterableSelectOption,
} from '../../../components/atoms/filterable-select/filterable-select.component';
import { ViewToggleComponent, type ProductViewMode } from '../../../components/atoms/view-toggle/view-toggle.component';
import { FilterBarComponent } from '../../../components/molecules/filter-bar/filter-bar.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import { ConfirmDeleteModalComponent } from '../../../components/molecules/confirm-delete-modal/confirm-delete-modal.component';
import { NutritionEventFormPanelComponent } from '../../../components/organisms/nutrition-event-form-panel/nutrition-event-form-panel.component';
import { NutritionEventGridComponent } from '../../../components/organisms/nutrition-event-grid/nutrition-event-grid.component';
import { NutritionEventTableComponent } from '../../../components/organisms/nutrition-event-table/nutrition-event-table.component';
import type {
  NutritionEvent,
  NutritionEventOwner,
} from '../../../core/models';
import { NUTRITION_EVENT_CATEGORIES } from '../../../core/models';
import { faPlus, faTrash, faUtensils } from '@fortawesome/free-solid-svg-icons';

/**
 * Sous-page Nutrition : liste des stratégies alimentaires.
 *
 * Gère le CRUD des évènements. La gestion de l'inventaire d'un évènement se
 * fait sur une page dédiée (`strategies/:id`), accessible en cliquant sur une
 * carte.
 */
@Component({
  selector: 'app-nutrition-strategies-page',
  standalone: true,
  imports: [
    ButtonComponent,
    IconComponent,
    SpinnerComponent,
    SearchInputComponent,
    DateRangeFilterComponent,
    FilterableSelectComponent,
    ViewToggleComponent,
    FilterBarComponent,
    PageHeaderComponent,
    ConfirmDeleteModalComponent,
    NutritionEventFormPanelComponent,
    NutritionEventGridComponent,
    NutritionEventTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <ui-page-header
        title="Stratégies de nutrition"
        subtitle="Composez et retrouvez vos plans nutritionnels de course."
        [icon]="faUtensils"
      >
        <ui-button actions [icon]="faPlus" (clicked)="newEvent()">Nouvel évènement</ui-button>
      </ui-page-header>

      <!-- Filtres -->
      @if (events()?.length) {
        <ui-filter-bar [nowrap]="true">
          <ui-search-input
            [(value)]="search"
            placeholder="Rechercher par titre…"
            ariaLabel="Rechercher une stratégie par titre"
          />
          <ui-date-range-filter
            [(from)]="dateFrom"
            [(to)]="dateTo"
            fromAriaLabel="Filtrer les stratégies à partir de cette date"
            toAriaLabel="Filtrer les stratégies jusqu'à cette date"
          />
          <ui-filterable-select
            [options]="categoryOptions"
            [(value)]="selectedCategory"
            placeholder="Toutes les étiquettes"
            ariaLabel="Filtrer les stratégies par étiquette"
            clearAriaLabel="Effacer le filtre d'étiquette"
          />
          @if (isAdmin() && ownerOptions().length) {
            <ui-filterable-select
              [options]="ownerOptions()"
              [(value)]="selectedOwnerId"
              placeholder="Tous les utilisateurs"
              ariaLabel="Filtrer les stratégies par utilisateur"
              clearAriaLabel="Effacer le filtre utilisateur"
            />
          }
          <ui-view-toggle
            class="ml-auto shrink-0"
            [mode]="viewMode()"
            (modeChange)="viewMode.set($event)"
          />
        </ui-filter-bar>
      }

      <!-- Liste des évènements -->
      @if (events(); as list) {
        @if (list.length === 0) {
          <div
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
          >
            <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ui-icon [icon]="faUtensils" size="xl" />
            </div>
            <p class="text-slate-600">Aucune stratégie pour le moment.</p>
            <ui-button color="secondary" variant="outlined" [icon]="faPlus" (clicked)="newEvent()">
              Créer ma première stratégie
            </ui-button>
          </div>
        } @else if (filteredEvents().length === 0) {
          <div
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
          >
            <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ui-icon [icon]="faUtensils" size="xl" />
            </div>
            <p class="text-slate-600">Aucune stratégie ne correspond à votre recherche.</p>
          </div>
        } @else {
          @if (viewMode() === 'table') {
            <ui-nutrition-event-table
              [events]="filteredEvents()"
              [showOwner]="isAdmin()"
              (select)="openInventory($event)"
              (edit)="editEvent($event)"
              (delete)="requestDeleteEvent($event)"
            />
          } @else {
            <ui-nutrition-event-grid
              [events]="filteredEvents()"
              (select)="openInventory($event)"
              (edit)="editEvent($event)"
              (delete)="requestDeleteEvent($event)"
            />
          }
        }
      } @else {
        <div class="flex flex-col items-center gap-3 py-16 text-center">
          <ui-spinner [size]="32" />
          <p class="text-sm text-slate-400">Chargement des stratégies…</p>
        </div>
      }
    </section>

    <!-- Panneau : formulaire évènement -->
    <ui-nutrition-event-form-panel
      [open]="panelOpen()"
      [event]="editing()"
      (save)="saveEvent($event)"
      (close)="closePanel()"
    />

    <!-- Modale : confirmation de suppression -->
    <ui-confirm-delete-modal
      [open]="!!pendingDelete()"
      [itemName]="pendingDelete()?.name ?? ''"
      title="Supprimer la stratégie"
      entityLabel="de la stratégie"
      placeholder="Nom de la stratégie"
      [deleting]="deleting()"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()"
    />
  `,
})
export class NutritionStrategiesPage {
  private readonly service = inject(NutritionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly isAdmin = this.auth.isAdmin;

  protected readonly faPlus = faPlus;
  protected readonly faTrash = faTrash;
  protected readonly faUtensils = faUtensils;

  protected readonly events = signal<NutritionEvent[] | undefined>(undefined);

  protected readonly search = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly selectedOwnerId = signal('');
  protected readonly selectedCategory = signal('');
  protected readonly viewMode = signal<ProductViewMode>('table');

  /** Options du filtre par étiquette. */
  protected readonly categoryOptions: FilterableSelectOption[] = NUTRITION_EVENT_CATEGORIES.map(
    (category) => ({ value: category.value, label: category.label }),
  );

  /** Liste des propriétaires distincts (filtre utilisateur, vue admin). */
  protected readonly ownerOptions = computed<FilterableSelectOption[]>(() => {
    const byId = new Map<string, NutritionEventOwner>();
    for (const event of this.events() ?? []) {
      if (event.owner) byId.set(event.owner.id, event.owner);
    }
    return [...byId.values()]
      .map((owner) => ({ value: owner.id, label: `${owner.firstName} ${owner.lastName}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  protected readonly panelOpen = signal(false);
  protected readonly editing = signal<NutritionEvent | null>(null);

  protected readonly pendingDelete = signal<{ id: string; name: string } | null>(null);
  protected readonly deleting = signal(false);

  /** Évènements filtrés par titre et par intervalle de dates. */
  protected readonly filteredEvents = computed(() => {
    const list = this.events() ?? [];
    const term = this.search().trim().toLowerCase();
    const from = this.dateFrom();
    const to = this.dateTo();
    const ownerId = this.selectedOwnerId();
    const category = this.selectedCategory();
    return list.filter((event) => {
      const matchesTerm = !term || event.name.toLowerCase().includes(term);
      const matchesFrom = !from || event.date >= from;
      const matchesTo = !to || event.date <= to;
      const matchesOwner = !ownerId || event.owner?.id === ownerId;
      const matchesCategory = !category || event.category === category;
      return matchesTerm && matchesFrom && matchesTo && matchesOwner && matchesCategory;
    });
  });

  constructor() {
    // Chargement navigateur uniquement : évite que le SSR rende l'état vide
    // (requête non authentifiée côté serveur) avant le loader côté client.
    afterNextRender(() => this.loadEvents());
  }

  private loadEvents(): void {
    this.service.listEvents().subscribe({
      next: (events) => this.events.set(events),
      error: () => {
        this.events.set([]);
        this.toast.error('Impossible de charger les stratégies.');
      },
    });
  }

  /** Ouvre la page d'inventaire dédiée à l'évènement. */
  openInventory(event: NutritionEvent): void {
    this.router.navigate(['/nutrition/strategies', event.id]);
  }

  // --- Évènements (CRUD) ---

  newEvent(): void {
    this.editing.set(null);
    this.panelOpen.set(true);
  }

  editEvent(event: NutritionEvent): void {
    this.editing.set(event);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editing.set(null);
  }

  saveEvent(payload: Partial<NutritionEvent>): void {
    const current = this.editing();
    const request = current
      ? this.service.updateEvent(current.id, payload)
      : this.service.createEvent(payload);
    request.subscribe({
      next: () => {
        this.closePanel();
        this.loadEvents();
      },
      error: () => this.toast.error("Impossible d'enregistrer la stratégie. Veuillez réessayer."),
    });
  }

  requestDeleteEvent(event: NutritionEvent): void {
    this.pendingDelete.set({ id: event.id, name: event.name });
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) return;
    this.deleting.set(true);
    this.service.removeEvent(pending.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.loadEvents();
      },
      error: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.error('Impossible de supprimer la stratégie.');
      },
    });
  }
}
