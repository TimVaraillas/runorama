import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NutritionService } from '../../features/nutrition/services/nutrition.service';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import { ViewToggleComponent, type ProductViewMode } from '../../components/atoms/view-toggle/view-toggle.component';
import { SidePanelComponent } from '../../components/molecules/side-panel/side-panel.component';
import { ModalComponent } from '../../components/molecules/modal/modal.component';
import { NutritionProductFormComponent } from '../../components/organisms/nutrition-product-form/nutrition-product-form.component';
import { NutritionProductTableComponent } from '../../components/organisms/nutrition-product-table/nutrition-product-table.component';
import { NutritionProductGridComponent } from '../../components/organisms/nutrition-product-grid/nutrition-product-grid.component';
import type { NutritionCategory, NutritionProduct } from '../../core/models';
import {
  faPlus,
  faTrash,
  faPen,
  faCheck,
  faAppleWhole,
  faMagnifyingGlass,
  faTags,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Élément en attente de suppression (pour la modale de confirmation).
 */
type PendingDelete =
  | { type: 'product'; id: string; name: string }
  | { type: 'category'; id: string; name: string };

/**
 * Page : gestion du volet nutrition (catégories et produits).
 */
@Component({
  selector: 'app-nutrition-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    IconComponent,
    ViewToggleComponent,
    SidePanelComponent,
    ModalComponent,
    NutritionProductFormComponent,
    NutritionProductTableComponent,
    NutritionProductGridComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold text-slate-900">Nutrition</h1>
          <p class="text-slate-500">Gérez vos produits et leur composition pour vos sorties.</p>
        </div>
        <div class="flex items-center gap-2">
          <ui-button variant="secondary" [icon]="faTags" (clicked)="openCategories()">Catégories</ui-button>
          <ui-button [icon]="faPlus" [disabled]="categories().length === 0" (clicked)="newProduct()">
            Nouveau produit
          </ui-button>
        </div>
      </div>

      @if (error()) {
        <p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</p>
      }

      <!-- Filtres -->
      <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div class="relative min-w-55 flex-1">
          <span class="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
            <ui-icon [icon]="faMagnifyingGlass" size="sm" />
          </span>
          <input
            type="search"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
            [class]="searchClass"
            placeholder="Rechercher par marque ou nom…"
          />
        </div>
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
        <ui-view-toggle [mode]="viewMode()" (modeChange)="viewMode.set($event)" />
      </div>

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
                variant="secondary"
                [icon]="faPlus"
                [disabled]="categories().length === 0"
                (clicked)="newProduct()"
              >
                Ajouter mon premier produit
              </ui-button>
              @if (categories().length === 0) {
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
              (edit)="editProduct($event)"
              (delete)="requestDeleteProduct($event)"
            />
          } @else {
            <ui-nutrition-product-grid
              [products]="filteredProducts()"
              [categories]="categories()"
              (edit)="editProduct($event)"
              (delete)="requestDeleteProduct($event)"
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

            @if (categoryError()) {
              <p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ categoryError() }}</p>
            }

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
                          class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
        <ui-button variant="ghost" [disabled]="deleting()" (clicked)="cancelDelete()">Annuler</ui-button>
        <ui-button variant="danger" [icon]="faTrash" [disabled]="deleting()" (clicked)="confirmDelete()">
          Supprimer
        </ui-button>
      </div>
    </ui-modal>
  `,
})
export class NutritionPage {
  private readonly service = inject(NutritionService);

  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faPen = faPen;
  readonly faCheck = faCheck;
  readonly faAppleWhole = faAppleWhole;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faTags = faTags;
  readonly faXmark = faXmark;

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
  protected readonly error = signal<string | null>(null);

  protected readonly productPanelOpen = signal(false);
  protected readonly editing = signal<NutritionProduct | null>(null);

  protected readonly categoryPanelOpen = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly categoryError = signal<string | null>(null);
  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly editingCategoryName = signal('');

  /** Élément en attente de confirmation de suppression, et état de suppression en cours. */
  protected readonly pendingDelete = signal<PendingDelete | null>(null);
  protected readonly deleting = signal(false);

  /** Produits filtrés par catégorie et par recherche texte. */
  protected readonly filteredProducts = computed(() => {
    const list = this.products() ?? [];
    const term = this.search().trim().toLowerCase();
    const category = this.categoryFilter();
    return list.filter((product) => {
      const matchesCategory = !category || product.categoryId === category;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  });

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
      error: () => this.error.set('Impossible de charger les catégories.'),
    });
  }

  private loadProducts(): void {
    this.service.listProducts().subscribe({
      next: (products) => this.products.set(products),
      error: () => {
        this.products.set([]);
        this.error.set('Impossible de charger les produits.');
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
    this.error.set(null);
    const current = this.editing();
    const request = current
      ? this.service.updateProduct(current.id, payload)
      : this.service.createProduct(payload);
    request.subscribe({
      next: () => {
        this.closeProductPanel();
        this.loadProducts();
      },
      error: () => this.error.set("Impossible d'enregistrer le produit. Veuillez réessayer."),
    });
  }

  requestDeleteProduct(product: NutritionProduct): void {
    this.error.set(null);
    this.pendingDelete.set({ type: 'product', id: product.id, name: product.name });
  }

  // --- Catégories ---

  openCategories(): void {
    this.categoryError.set(null);
    this.categoryPanelOpen.set(true);
  }

  closeCategories(): void {
    this.categoryPanelOpen.set(false);
    this.newCategoryName.set('');
    this.categoryError.set(null);
    this.cancelEditCategory();
  }

  addCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.categoryError.set(null);
    this.service.createCategory({ name }).subscribe({
      next: () => {
        this.newCategoryName.set('');
        this.loadCategories();
      },
      error: (err) =>
        this.categoryError.set(
          err?.status === 409 ? 'Cette catégorie existe déjà.' : "Impossible d'ajouter la catégorie.",
        ),
    });
  }

  startEditCategory(category: NutritionCategory): void {
    this.categoryError.set(null);
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
    this.categoryError.set(null);
    this.service.updateCategory(category.id, { name }).subscribe({
      next: () => {
        this.cancelEditCategory();
        this.loadCategories();
      },
      error: (err) =>
        this.categoryError.set(
          err?.status === 409
            ? 'Cette catégorie existe déjà.'
            : 'Impossible de modifier la catégorie.',
        ),
    });
  }

  requestDeleteCategory(category: NutritionCategory): void {
    this.categoryError.set(null);
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
          this.error.set('Impossible de supprimer le produit.');
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
          this.categoryError.set(
            err?.status === 409
              ? 'Cette catégorie contient des produits et ne peut pas être supprimée.'
              : 'Impossible de supprimer la catégorie.',
          );
        },
      });
    }
  }
}
