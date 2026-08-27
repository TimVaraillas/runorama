import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { ViewToggleComponent, type ProductViewMode } from '../../../components/atoms/view-toggle/view-toggle.component';
import { SearchInputComponent } from '../../../components/atoms/search-input/search-input.component';
import { SidePanelComponent } from '../../../components/molecules/side-panel/side-panel.component';
import { FilterBarComponent } from '../../../components/molecules/filter-bar/filter-bar.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import { ModalComponent } from '../../../components/molecules/modal/modal.component';
import { DropdownMenuComponent } from '../../../components/molecules/dropdown-menu/dropdown-menu.component';
import { NutritionProductFormComponent } from '../../../components/organisms/nutrition-product-form/nutrition-product-form.component';
import { NutritionProductTableComponent } from '../../../components/organisms/nutrition-product-table/nutrition-product-table.component';
import type { ProductColumnKey } from '../../../components/organisms/nutrition-product-table/nutrition-product-table.component';
import { NutritionProductGridComponent } from '../../../components/organisms/nutrition-product-grid/nutrition-product-grid.component';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';
import type { ProductModerationStatus } from '../../../core/models/nutrition.model';
import {
  faPlus,
  faTrash,
  faPen,
  faCheck,
  faAppleWhole,
  faBookOpen,
  faTags,
  faTableColumns,
  faXmark,
  faStar as faStarSolid,
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';

/**
 * Élément en attente de suppression (pour la modale de confirmation).
 */
type PendingDelete =
  | { type: 'product'; id: string; name: string }
  | { type: 'category'; id: string; name: string };

/**
 * Sous-page Nutrition : gestion des produits (et de leurs catégories).
 */
@Component({
  selector: 'app-nutrition-products-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    IconComponent,
    ViewToggleComponent,
    SearchInputComponent,
    SidePanelComponent,
    FilterBarComponent,
    PageHeaderComponent,
    ModalComponent,
    DropdownMenuComponent,
    NutritionProductFormComponent,
    NutritionProductTableComponent,
    NutritionProductGridComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <ui-page-header
        title="Bibliothèque de produits"
        subtitle="Gérez les produits nutritionnels et leurs catégories."
        [icon]="faBookOpen"
      >
        @if (isAdmin()) {
          <ui-button actions color="secondary" variant="outlined" [icon]="faTags" (clicked)="openCategories()">Catégories</ui-button>
        }
        <ui-button actions [icon]="faPlus" [disabled]="categories().length === 0" (clicked)="newProduct()">
          {{ isAdmin() ? 'Nouveau produit' : 'Proposer un produit' }}
        </ui-button>
      </ui-page-header>

      <!-- File de modération (admin) : filtre par statut -->
      @if (isAdmin()) {
        <div class="flex flex-wrap gap-2">
          @for (tab of statusTabs; track tab.value) {
            <button
              type="button"
              class="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
              [class.border-brand-500]="statusFilter() === tab.value"
              [class.bg-brand-50]="statusFilter() === tab.value"
              [class.text-brand-700]="statusFilter() === tab.value"
              [class.border-slate-200]="statusFilter() !== tab.value"
              [class.text-slate-600]="statusFilter() !== tab.value"
              [class.hover:bg-slate-50]="statusFilter() !== tab.value"
              (click)="statusFilter.set(tab.value)"
            >
              {{ tab.label }}
              @if (statusCount(tab.value); as count) {
                <span class="ml-1 text-xs opacity-70">({{ count }})</span>
              }
            </button>
          }
        </div>
      }

      <!-- Filtres -->
      <ui-filter-bar>
        <ui-search-input
          [(value)]="search"
          placeholder="Rechercher par marque ou nom…"
          ariaLabel="Rechercher un produit par marque ou nom"
        />
        <select
          [ngModel]="categoryFilter()"
          (ngModelChange)="categoryFilter.set($event)"
          [class]="selectClass"
        >
          <option value="">Toutes les catégories</option>
          @for (category of categories(); track category.id) {
            <option [value]="category.id">{{ category.name }}</option>
          }
        </select>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          [class.border-amber-300]="favoritesOnly()"
          [class.bg-amber-50]="favoritesOnly()"
          [class.text-amber-700]="favoritesOnly()"
          [class.border-slate-300]="!favoritesOnly()"
          [class.text-slate-600]="!favoritesOnly()"
          [class.hover:bg-slate-50]="!favoritesOnly()"
          (click)="favoritesOnly.set(!favoritesOnly())"
          [attr.aria-pressed]="favoritesOnly()"
        >
          <ui-icon [icon]="favoritesOnly() ? faStarSolid : faStarRegular" size="sm" />
          Favoris
        </button>
        @if (viewMode() === 'table') {
          <ui-dropdown-menu>
            <button
              trigger
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ui-icon [icon]="faTableColumns" size="sm" />
              Colonnes
            </button>
            <div class="p-1" (click)="$event.stopPropagation()">
              @for (col of columnOptions; track col.key) {
                <label
                  class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    [checked]="isColumnVisible(col.key)"
                    (change)="toggleColumn(col.key)"
                    class="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  {{ col.label }}
                </label>
              }
            </div>
          </ui-dropdown-menu>
        }
        <ui-view-toggle [mode]="viewMode()" (modeChange)="viewMode.set($event)" />
      </ui-filter-bar>

      <!-- Liste des produits -->
      @if (products(); as list) {
        @if (filteredProducts().length === 0) {
          <div
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
          >
            <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ui-icon [icon]="faAppleWhole" size="xl" />
            </div>
            @if (list.length === 0) {
              <p class="text-slate-600">Aucun produit pour le moment.</p>
              <ui-button
                color="secondary"
                variant="outlined"
                [icon]="faPlus"
                [disabled]="categories().length === 0"
                (clicked)="newProduct()"
              >
                {{ isAdmin() ? 'Ajouter mon premier produit' : 'Proposer un produit' }}
              </ui-button>
              @if (categories().length === 0 && isAdmin()) {
                <p class="text-xs text-slate-400">Commencez par créer une catégorie.</p>
              }
            } @else {
              <p class="text-slate-600">Aucun produit ne correspond à votre recherche.</p>
            }
          </div>
        } @else {
          @if (viewMode() === 'table') {
            <ui-nutrition-product-table
              [products]="filteredProducts()"
              [categories]="categories()"
              [readonly]="false"
              [showStatus]="true"
              [visibleColumns]="visibleColumnKeys()"
              [currentUserId]="currentUserId()"
              [isAdmin]="isAdmin()"
              [showPersonalActions]="true"
              (edit)="editProduct($event)"
              (delete)="requestDeleteProduct($event)"
              (approve)="approveProduct($event)"
              (reject)="requestReject($event)"
              (archive)="archiveProduct($event)"
              (toggleFavorite)="toggleFavorite($event)"
              (editNote)="openNote($event)"
            />
          } @else {
            <ui-nutrition-product-grid
              [products]="filteredProducts()"
              [categories]="categories()"
              [readonly]="false"
              [showStatus]="true"
              [currentUserId]="currentUserId()"
              [isAdmin]="isAdmin()"
              [showPersonalActions]="true"
              (edit)="editProduct($event)"
              (delete)="requestDeleteProduct($event)"
              (approve)="approveProduct($event)"
              (reject)="requestReject($event)"
              (archive)="archiveProduct($event)"
              (toggleFavorite)="toggleFavorite($event)"
              (editNote)="openNote($event)"
            />
          }
        }
      } @else {
        <p class="text-slate-400">Chargement des produits…</p>
      }
    </section>

    <!-- Panneau : formulaire produit -->
    <ui-side-panel
      [open]="productPanelOpen()"
      [ariaLabel]="editing() ? 'Modifier le produit' : 'Nouveau produit'"
      (close)="closeProductPanel()"
    >
      @if (productPanelOpen()) {
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 class="font-display text-lg font-bold text-slate-900">
              {{ editing() ? 'Modifier le produit' : 'Nouveau produit' }}
            </h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="closeProductPanel()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <ui-nutrition-product-form
              [product]="editing()"
              [categories]="categories()"
              (save)="saveProduct($event)"
              (cancel)="closeProductPanel()"
            />
          </div>
        </div>
      }
    </ui-side-panel>

    <!-- Panneau : gestion des catégories -->
    <ui-side-panel
      [open]="categoryPanelOpen()"
      size="md"
      ariaLabel="Gérer les catégories"
      (close)="closeCategories()"
    >
      @if (categoryPanelOpen()) {
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 class="font-display text-lg font-bold text-slate-900">Catégories de produits</h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="closeCategories()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>
          <div class="flex-1 space-y-4 overflow-y-auto p-6">
            <form class="flex items-center gap-2" (ngSubmit)="addCategory()">
              <input
                type="text"
                [ngModel]="newCategoryName()"
                (ngModelChange)="newCategoryName.set($event)"
                name="newCategory"
                [class]="searchClass"
                placeholder="Ex : Gels, Boissons d'effort…"
              />
              <ui-button type="submit" [icon]="faPlus" [disabled]="!newCategoryName().trim()">
                Ajouter
              </ui-button>
            </form>

            @if (categories().length === 0) {
              <p class="text-sm text-slate-400">Aucune catégorie. Ajoutez-en une ci-dessus.</p>
            } @else {
              <ul class="space-y-2">
                @for (category of categories(); track category.id) {
                  <li
                    class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5"
                  >
                    @if (editingCategoryId() === category.id) {
                      <form class="flex flex-1 items-center gap-2" (ngSubmit)="saveCategory(category)">
                        <input
                          type="text"
                          [ngModel]="editingCategoryName()"
                          (ngModelChange)="editingCategoryName.set($event)"
                          name="editCategory"
                          [class]="editInputClass"
                          aria-label="Nom de la catégorie"
                        />
                        <button
                          type="submit"
                          class="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                          [disabled]="!editingCategoryName().trim()"
                          aria-label="Enregistrer"
                        >
                          <ui-icon [icon]="faCheck" size="sm" />
                        </button>
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          (click)="cancelEditCategory()"
                          aria-label="Annuler"
                        >
                          <ui-icon [icon]="faXmark" size="sm" />
                        </button>
                      </form>
                    } @else {
                      <span class="text-sm font-medium text-slate-800">{{ category.name }}</span>
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                          (click)="startEditCategory(category)"
                          aria-label="Modifier la catégorie"
                        >
                          <ui-icon [icon]="faPen" size="sm" />
                        </button>
                        <button
                          type="button"
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          (click)="requestDeleteCategory(category)"
                          aria-label="Supprimer la catégorie"
                        >
                          <ui-icon [icon]="faTrash" size="sm" />
                        </button>
                      </div>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      }
    </ui-side-panel>

    <!-- Modale : confirmation de suppression -->
    <ui-modal
      [open]="!!pendingDelete()"
      [title]="pendingDelete()?.type === 'category' ? 'Supprimer la catégorie' : 'Supprimer le produit'"
      (close)="cancelDelete()"
    >
      @if (pendingDelete(); as pending) {
        <p>
          @if (pending.type === 'category') {
            Voulez-vous vraiment supprimer la catégorie
            <strong class="font-semibold text-slate-900">« {{ pending.name }} »</strong> ? Cette
            action est irréversible.
          } @else {
            Voulez-vous vraiment supprimer le produit
            <strong class="font-semibold text-slate-900">« {{ pending.name }} »</strong> ? Cette
            action est irréversible.
          }
        </p>
      }
      <div modalFooter class="flex items-center justify-end gap-3">
        <ui-button color="default" variant="ghost" [disabled]="deleting()" (clicked)="cancelDelete()">Annuler</ui-button>
        <ui-button color="danger" [icon]="faTrash" [disabled]="deleting()" (clicked)="confirmDelete()">
          Supprimer
        </ui-button>
      </div>
    </ui-modal>

    <!-- Modale : refus d'un produit (motif communiqué au contributeur) -->
    <ui-modal [open]="!!rejecting()" title="Refuser le produit" (close)="cancelReject()">
      @if (rejecting(); as product) {
        <div class="space-y-3">
          <p class="text-sm text-slate-600">
            Le produit
            <strong class="font-semibold text-slate-900">« {{ product.name }} »</strong> restera
            disponible en privé pour son auteur, mais ne sera pas publié. Indiquez un motif, il lui
            sera transmis par e-mail.
          </p>
          <textarea
            [ngModel]="rejectReason()"
            (ngModelChange)="rejectReason.set($event)"
            rows="3"
            [class]="searchClass"
            placeholder="Ex : valeurs nutritionnelles incohérentes, doublon du produit X…"
            aria-label="Motif du refus"
          ></textarea>
        </div>
      }
      <div modalFooter class="flex items-center justify-end gap-3">
        <ui-button color="default" variant="ghost" [disabled]="moderating()" (clicked)="cancelReject()">Annuler</ui-button>
        <ui-button color="danger" [icon]="faXmark" [disabled]="moderating()" (clicked)="confirmReject()">
          Refuser
        </ui-button>
      </div>
    </ui-modal>

    <!-- Modale : note personnelle (privée) sur un produit -->
    <ui-modal [open]="!!noteEditing()" title="Ma note sur ce produit" (close)="cancelNote()">
      @if (noteEditing(); as product) {
        <div class="space-y-3">
          <p class="text-sm text-slate-600">
            Note privée sur
            <strong class="font-semibold text-slate-900">« {{ product.name }} »</strong>, visible de
            vous seul. Idéal pour consigner un ressenti (ex : « testé après 8 h, troubles digestifs »).
          </p>
          <textarea
            [ngModel]="noteDraft()"
            (ngModelChange)="noteDraft.set($event)"
            rows="4"
            [class]="searchClass"
            placeholder="Votre retour d'expérience sur ce produit…"
            aria-label="Note personnelle sur le produit"
          ></textarea>
        </div>
      }
      <div modalFooter class="flex items-center justify-between gap-3">
        <span>
          @if (noteEditing()?.comment) {
            <ui-button color="danger" variant="ghost" [icon]="faTrash" [disabled]="savingNote()" (clicked)="deleteNote()">
              Supprimer
            </ui-button>
          }
        </span>
        <span class="flex items-center gap-3">
          <ui-button color="default" variant="ghost" [disabled]="savingNote()" (clicked)="cancelNote()">Annuler</ui-button>
          <ui-button [icon]="faCheck" [disabled]="savingNote()" (clicked)="saveNote()">Enregistrer</ui-button>
        </span>
      </div>
    </ui-modal>
  `,
})
export class NutritionProductsPage {
  private readonly service = inject(NutritionService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Vrai si l'utilisateur peut éditer la base produits partagée. */
  protected readonly isAdmin = this.auth.isAdmin;
  /** Identifiant de l'utilisateur courant (droits d'action par produit). */
  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  /** Charge les colonnes visibles depuis le stockage local (défaut sans les nutriments secondaires). */
  private loadVisibleColumns(): ProductColumnKey[] {
    const all = this.columnOptions.map((c) => c.key);
    const defaults = all.filter((k) => k !== 'fats' && k !== 'proteins' && k !== 'sodium');
    if (!isPlatformBrowser(this.platformId)) return defaults;
    try {
      const raw = localStorage.getItem(this.columnsStorageKey);
      if (!raw) return defaults;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return defaults;
      return parsed.filter((k): k is ProductColumnKey =>
        all.includes(k as ProductColumnKey),
      );
    } catch {
      return defaults;
    }
  }

  /** Indique si une colonne optionnelle est visible. */
  protected isColumnVisible(key: ProductColumnKey): boolean {
    return this.visibleColumnKeys().includes(key);
  }

  /** Bascule l'affichage d'une colonne et persiste la préférence. */
  protected toggleColumn(key: ProductColumnKey): void {
    const next = this.isColumnVisible(key)
      ? this.visibleColumnKeys().filter((k) => k !== key)
      : [...this.visibleColumnKeys(), key];
    this.visibleColumnKeys.set(next);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.columnsStorageKey, JSON.stringify(next));
      } catch {
        // Persistance best-effort : on ignore les erreurs de stockage.
      }
    }
  }

  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faPen = faPen;
  readonly faCheck = faCheck;
  readonly faAppleWhole = faAppleWhole;
  readonly faBookOpen = faBookOpen;
  readonly faTags = faTags;
  readonly faTableColumns = faTableColumns;
  readonly faXmark = faXmark;
  readonly faStarSolid = faStarSolid;
  readonly faStarRegular = faStarRegular;

  /** Clé de persistance des colonnes visibles du tableau. */
  private readonly columnsStorageKey = 'runorama.products.visibleColumns';
  /** Colonnes optionnelles proposees au filtrage (ordre d'affichage). */
  protected readonly columnOptions: ReadonlyArray<{ key: ProductColumnKey; label: string }> = [
    { key: 'category', label: 'Catégorie' },
    { key: 'weight', label: 'Poids' },
    { key: 'energy', label: 'Énergie' },
    { key: 'carbs', label: 'Glucides' },
    { key: 'fats', label: 'Lipides' },
    { key: 'proteins', label: 'Protéines' },
    { key: 'sodium', label: 'Sodium' },
  ];
  /** Colonnes optionnelles actuellement visibles (persistées en localStorage). */
  protected readonly visibleColumnKeys = signal<ProductColumnKey[]>(this.loadVisibleColumns());

  protected readonly searchClass =
    'w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
  protected readonly selectClass =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';
  protected readonly editInputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  protected readonly categories = signal<NutritionCategory[]>([]);
  protected readonly products = signal<NutritionProduct[] | undefined>(undefined);

  protected readonly search = signal('');
  protected readonly categoryFilter = signal('');
  protected readonly viewMode = signal<ProductViewMode>('table');
  /** Ne montrer que les produits favoris de l'utilisateur. */
  protected readonly favoritesOnly = signal(false);

  /** Filtre de statut de modération (file admin). '' = tous. */
  protected readonly statusFilter = signal<ProductModerationStatus | ''>('');
  /** Onglets de la file de modération administrateur. */
  protected readonly statusTabs: ReadonlyArray<{ value: ProductModerationStatus | ''; label: string }> = [
    { value: '', label: 'Tous' },
    { value: 'pending', label: 'En attente' },
    { value: 'approved', label: 'Validés' },
    { value: 'rejected', label: 'Refusés' },
    { value: 'archived', label: 'Archivés' },
  ];

  protected readonly productPanelOpen = signal(false);
  protected readonly editing = signal<NutritionProduct | null>(null);

  protected readonly categoryPanelOpen = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly editingCategoryName = signal('');

  /** Élément en attente de confirmation de suppression, et état de suppression en cours. */
  protected readonly pendingDelete = signal<PendingDelete | null>(null);
  protected readonly deleting = signal(false);

  /** Produit en cours de refus (modale de motif) et état de modération en cours. */
  protected readonly rejecting = signal<NutritionProduct | null>(null);
  protected readonly rejectReason = signal('');
  protected readonly moderating = signal(false);

  /** Produit dont la note personnelle est en cours d'édition (modale). */
  protected readonly noteEditing = signal<NutritionProduct | null>(null);
  protected readonly noteDraft = signal('');
  protected readonly savingNote = signal(false);

  /** Produits filtrés par catégorie, recherche texte et statut (admin). */
  protected readonly filteredProducts = computed(() => {
    const list = this.products() ?? [];
    const term = this.search().trim().toLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();
    const favoritesOnly = this.favoritesOnly();
    return list.filter((product) => {
      const matchesCategory = !category || product.categoryId === category;
      const matchesStatus = !status || product.moderationStatus === status;
      const matchesFavorite = !favoritesOnly || product.favorite === true;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term);
      return matchesCategory && matchesStatus && matchesFavorite && matchesTerm;
    });
  });

  /** Nombre de produits par statut (badges des onglets admin). */
  protected statusCount(status: ProductModerationStatus | ''): number | null {
    if (!status) return null;
    const count = (this.products() ?? []).filter((p) => p.moderationStatus === status).length;
    return count > 0 ? count : null;
  }

  constructor() {
    this.loadCategories();
    this.loadProducts();
  }

  categoryName(id: string): string {
    return this.categories().find((c) => c.id === id)?.name ?? '—';
  }

  private loadCategories(): void {
    this.service.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.toast.error('Impossible de charger les catégories.'),
    });
  }

  private loadProducts(): void {
    this.service.listProducts().subscribe({
      next: (products) => this.products.set(products),
      error: () => {
        this.products.set([]);
        this.toast.error('Impossible de charger les produits.');
      },
    });
  }

  // --- Produits ---

  newProduct(): void {
    this.editing.set(null);
    this.productPanelOpen.set(true);
  }

  editProduct(product: NutritionProduct): void {
    this.editing.set(product);
    this.productPanelOpen.set(true);
  }

  closeProductPanel(): void {
    this.productPanelOpen.set(false);
    this.editing.set(null);
  }

  saveProduct(payload: Partial<NutritionProduct>): void {
    const current = this.editing();
    const request = current
      ? this.service.updateProduct(current.id, payload)
      : this.service.createProduct(payload);
    request.subscribe({
      next: () => {
        this.closeProductPanel();
        this.loadProducts();
      },
      error: () => this.toast.error("Impossible d'enregistrer le produit. Veuillez réessayer."),
    });
  }

  requestDeleteProduct(product: NutritionProduct): void {
    this.pendingDelete.set({ type: 'product', id: product.id, name: product.name });
  }

  // --- Modération (admin) ---

  approveProduct(product: NutritionProduct): void {
    this.service.approveProduct(product.id).subscribe({
      next: () => {
        this.toast.success(`« ${product.name} » a été validé et publié.`);
        this.loadProducts();
      },
      error: () => this.toast.error('Impossible de valider le produit. Veuillez réessayer.'),
    });
  }

  archiveProduct(product: NutritionProduct): void {
    this.service.archiveProduct(product.id).subscribe({
      next: () => {
        this.toast.success(`« ${product.name} » a été archivé.`);
        this.loadProducts();
      },
      error: () => this.toast.error("Impossible d'archiver le produit. Veuillez réessayer."),
    });
  }

  requestReject(product: NutritionProduct): void {
    this.rejectReason.set('');
    this.rejecting.set(product);
  }

  cancelReject(): void {
    this.rejecting.set(null);
    this.rejectReason.set('');
  }

  confirmReject(): void {
    const product = this.rejecting();
    if (!product) return;
    this.moderating.set(true);
    this.service.rejectProduct(product.id, this.rejectReason().trim()).subscribe({
      next: () => {
        this.moderating.set(false);
        this.cancelReject();
        this.toast.success(`« ${product.name} » a été refusé.`);
        this.loadProducts();
      },
      error: () => {
        this.moderating.set(false);
        this.toast.error('Impossible de refuser le produit. Veuillez réessayer.');
      },
    });
  }

  // --- Données personnelles (favori + note privée) ---

  /** Applique des changements personnels à un produit dans l'état local. */
  private patchProduct(id: string, changes: Partial<NutritionProduct>): void {
    const list = this.products();
    if (!list) return;
    this.products.set(list.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  /** Ajoute/retire un produit des favoris de l'utilisateur. */
  toggleFavorite(product: NutritionProduct): void {
    const next = !product.favorite;
    // Mise à jour optimiste : on reflète immédiatement l'action.
    this.patchProduct(product.id, { favorite: next });
    this.service.setProductFeedback(product.id, { favorite: next }).subscribe({
      error: () => {
        this.patchProduct(product.id, { favorite: !next });
        this.toast.error('Impossible de mettre à jour vos favoris. Veuillez réessayer.');
      },
    });
  }

  /** Ouvre la modale d'édition de la note personnelle. */
  openNote(product: NutritionProduct): void {
    this.noteDraft.set(product.comment ?? '');
    this.noteEditing.set(product);
  }

  cancelNote(): void {
    this.noteEditing.set(null);
    this.noteDraft.set('');
  }

  /** Enregistre la note personnelle sur le produit courant. */
  saveNote(): void {
    const product = this.noteEditing();
    if (!product) return;
    const comment = this.noteDraft().trim();
    this.savingNote.set(true);
    this.service.setProductFeedback(product.id, { comment }).subscribe({
      next: (note) => {
        this.savingNote.set(false);
        this.patchProduct(product.id, { comment: note.comment, favorite: note.favorite });
        this.cancelNote();
        this.toast.success('Note enregistrée.');
      },
      error: () => {
        this.savingNote.set(false);
        this.toast.error("Impossible d'enregistrer la note. Veuillez réessayer.");
      },
    });
  }

  /** Supprime la note personnelle du produit courant (le favori est conservé). */
  deleteNote(): void {
    const product = this.noteEditing();
    if (!product) return;
    this.savingNote.set(true);
    this.service.setProductFeedback(product.id, { comment: '' }).subscribe({
      next: (note) => {
        this.savingNote.set(false);
        this.patchProduct(product.id, { comment: note.comment, favorite: note.favorite });
        this.cancelNote();
        this.toast.success('Note supprimée.');
      },
      error: () => {
        this.savingNote.set(false);
        this.toast.error('Impossible de supprimer la note. Veuillez réessayer.');
      },
    });
  }

  // --- Catégories ---

  openCategories(): void {
    this.categoryPanelOpen.set(true);
  }

  closeCategories(): void {
    this.categoryPanelOpen.set(false);
    this.newCategoryName.set('');
    this.cancelEditCategory();
  }

  addCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.service.createCategory({ name }).subscribe({
      next: () => {
        this.newCategoryName.set('');
        this.loadCategories();
      },
      error: (err) =>
        this.toast.error(
          err?.status === 409 ? 'Cette catégorie existe déjà.' : "Impossible d'ajouter la catégorie.",
        ),
    });
  }

  startEditCategory(category: NutritionCategory): void {
    this.editingCategoryId.set(category.id);
    this.editingCategoryName.set(category.name);
  }

  cancelEditCategory(): void {
    this.editingCategoryId.set(null);
    this.editingCategoryName.set('');
  }

  saveCategory(category: NutritionCategory): void {
    const name = this.editingCategoryName().trim();
    if (!name) return;
    if (name === category.name) {
      this.cancelEditCategory();
      return;
    }
    this.service.updateCategory(category.id, { name }).subscribe({
      next: () => {
        this.cancelEditCategory();
        this.loadCategories();
      },
      error: (err) =>
        this.toast.error(
          err?.status === 409
            ? 'Cette catégorie existe déjà.'
            : 'Impossible de modifier la catégorie.',
        ),
    });
  }

  requestDeleteCategory(category: NutritionCategory): void {
    this.pendingDelete.set({ type: 'category', id: category.id, name: category.name });
  }

  // --- Suppression (confirmation via modale) ---

  cancelDelete(): void {
    if (this.deleting()) return;
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) return;
    this.deleting.set(true);
    if (pending.type === 'product') {
      this.service.removeProduct(pending.id).subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDelete.set(null);
          this.loadProducts();
        },
        error: () => {
          this.deleting.set(false);
          this.pendingDelete.set(null);
          this.toast.error('Impossible de supprimer le produit.');
        },
      });
    } else {
      this.service.removeCategory(pending.id).subscribe({
        next: () => {
          this.deleting.set(false);
          if (this.categoryFilter() === pending.id) {
            this.categoryFilter.set('');
          }
          this.pendingDelete.set(null);
          this.loadCategories();
        },
        error: (err) => {
          this.deleting.set(false);
          this.pendingDelete.set(null);
          this.toast.error(
            err?.status === 409
              ? 'Cette catégorie contient des produits et ne peut pas être supprimée.'
              : 'Impossible de supprimer la catégorie.',
          );
        },
      });
    }
  }
}
