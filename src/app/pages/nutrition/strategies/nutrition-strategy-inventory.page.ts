import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { ToastService } from '../../../core/services/toast.service';
import { ButtonComponent } from '../../../components/atoms/button/button.component';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import { PageHeaderComponent } from '../../../components/molecules/page-header/page-header.component';
import { TabsComponent, type TabItem } from '../../../components/molecules/tabs/tabs.component';
import { NutritionStrategyInventoryComponent } from '../../../components/organisms/nutrition-strategy-inventory/nutrition-strategy-inventory.component';
import { ConsumptionPlanComponent } from '../../../components/organisms/consumption-plan/consumption-plan.component';
import type {
  NutritionCategory,
  NutritionEvent,
  NutritionIntake,
  NutritionProduct,
  PlanSequenceMinutes,
} from '../../../core/models';
import { faArrowLeft, faStopwatch, faUtensils } from '@fortawesome/free-solid-svg-icons';

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
        <ui-button actions variant="ghost" size="sm" [icon]="faArrowLeft" (clicked)="goBack()">
          Retour aux stratégies
        </ui-button>
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
          <ui-button variant="secondary" [icon]="faArrowLeft" (clicked)="goBack()">
            Retour aux stratégies
          </ui-button>
        </div>
      } @else {
        <p class="text-slate-400">Chargement de la stratégie…</p>
      }
    </section>
  `,
})
export class NutritionStrategyInventoryPage implements OnInit {
  private readonly service = inject(NutritionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Identifiant de l'évènement, lié au paramètre de route `:id`. */
  readonly id = input.required<string>();

  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faUtensils = faUtensils;

  protected readonly tabs: TabItem[] = [
    { id: 'inventory', label: 'Inventaire', icon: faUtensils },
    { id: 'plan', label: 'Plan de consommation', icon: faStopwatch },
  ];
  protected readonly activeTab = signal<'inventory' | 'plan'>('inventory');

  protected readonly event = signal<NutritionEvent | null>(null);
  protected readonly products = signal<NutritionProduct[]>([]);
  protected readonly categories = signal<NutritionCategory[]>([]);
  protected readonly notFound = signal(false);

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
