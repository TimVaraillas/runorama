import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import { NutritionStrategyInventoryComponent } from '../../../components/organisms/nutrition-strategy-inventory/nutrition-strategy-inventory.component';
import type { NutritionCategory, NutritionEvent, NutritionProduct } from '../../../core/models';
import { faArrowLeft, faUtensils } from '@fortawesome/free-solid-svg-icons';

/**
 * Sous-page Nutrition : inventaire d'une stratégie alimentaire.
 *
 * Page de détail dédiée à un évènement (`strategies/:id`). Charge l'évènement
 * et les produits, puis gère l'association de produits (inventaire) avec suivi
 * en temps réel des totaux et de la couverture des besoins cibles.
 */
@Component({
  selector: 'app-nutrition-strategy-inventory-page',
  standalone: true,
  imports: [ButtonComponent, IconComponent, PageHeaderComponent, NutritionStrategyInventoryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      @if (error()) {
        <p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</p>
      }

      <ui-page-header
        [title]="event()?.name ?? 'Inventaire'"
        subtitle="Inventaire des produits emportés"
      >
        <ui-button actions variant="ghost" size="sm" [icon]="faArrowLeft" (clicked)="goBack()">
          Retour aux stratégies
        </ui-button>
      </ui-page-header>

      @if (event(); as ev) {
        <ui-nutrition-strategy-inventory
          [event]="ev"
          [products]="products()"
          [categories]="categories()"
          (applySelection)="applySelection($event)"
          (setQuantity)="setQuantity($event)"
          (remove)="removeProduct($event)"
        />
      } @else if (notFound()) {
        <div
          class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
        >
          <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
            <ui-icon [icon]="faUtensils" size="xl" />
          </div>
          <p class="text-slate-600">Cette stratégie est introuvable.</p>
          <ui-button variant="secondary" [icon]="faArrowLeft" (clicked)="goBack()">
            Retour aux stratégies
          </ui-button>
        </div>
      } @else {
        <p class="text-slate-400">Chargement de l'inventaire…</p>
      }
    </section>
  `,
})
export class NutritionStrategyInventoryPage implements OnInit {
  private readonly service = inject(NutritionService);
  private readonly router = inject(Router);

  /** Identifiant de l'évènement, lié au paramètre de route `:id`. */
  readonly id = input.required<string>();

  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faUtensils = faUtensils;

  protected readonly event = signal<NutritionEvent | null>(null);
  protected readonly products = signal<NutritionProduct[]>([]);
  protected readonly categories = signal<NutritionCategory[]>([]);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);

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
      error: () => this.error.set('Impossible de charger les produits.'),
    });
  }

  private loadCategories(): void {
    this.service.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.error.set('Impossible de charger les catégories.'),
    });
  }

  goBack(): void {
    this.router.navigate(['/nutrition/strategies']);
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
    this.error.set(null);
    this.service.updateEvent(eventId, { items }).subscribe({
      next: (updated) => this.event.set(updated),
      error: () => this.error.set("Impossible de mettre à jour l'inventaire."),
    });
  }
}
