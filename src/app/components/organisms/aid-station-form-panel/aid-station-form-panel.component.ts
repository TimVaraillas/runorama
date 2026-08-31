import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SidePanelComponent } from '../../molecules/side-panel/side-panel.component';
import { AidStationFormComponent } from '../aid-station-form/aid-station-form.component';
import type { AidStation, RaceStrategyItem, NutritionProduct } from '../../../core/models';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : panneau latéral de création/modification d'un ravitaillement.
 *
 * Encapsule le `ui-side-panel`, l'en-tête et le `ui-aid-station-form`. Le titre
 * s'adapte selon la présence d'un `station` (édition) ou son absence (création).
 */
@Component({
  selector: 'ui-aid-station-form-panel',
  standalone: true,
  imports: [IconComponent, SidePanelComponent, AidStationFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-side-panel [open]="open()" [ariaLabel]="heading()" (close)="close.emit()">
      @if (open()) {
        <div class="flex h-full flex-col">
          <div
            class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4"
          >
            <h2 class="font-display text-lg font-bold text-slate-900">{{ heading() }}</h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="close.emit()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <ui-aid-station-form
              [station]="station()"
              [products]="products()"
              [inventoryItems]="inventoryItems()"
              [pickupElsewhere]="pickupElsewhere()"
              (save)="save.emit($event)"
              (cancel)="close.emit()"
            />
          </div>
        </div>
      }
    </ui-side-panel>
  `,
})
export class AidStationFormPanelComponent {
  /** Ouvre ou ferme le panneau. */
  readonly open = input(false);
  /** Ravitaillement à modifier ; `null` pour une création. */
  readonly station = input<AidStation | null>(null);
  /** Catalogue des produits (sélection logistique et consommation sur place). */
  readonly products = input<NutritionProduct[]>([]);
  /** Inventaire de l'évènement (consommation « depuis l'inventaire »). */
  readonly inventoryItems = input<RaceStrategyItem[]>([]);
  /** Quantités déjà réparties en « à récupérer » sur les autres ravitaillements. */
  readonly pickupElsewhere = input<Record<string, number>>({});

  /** Émis avec la charge utile du formulaire lors de l'enregistrement. */
  readonly save = output<Partial<AidStation>>();
  /** Émis lors d'une demande de fermeture. */
  readonly close = output<void>();

  protected readonly faXmark = faXmark;

  protected heading(): string {
    return this.station() ? 'Modifier le ravitaillement' : 'Nouveau ravitaillement';
  }
}
