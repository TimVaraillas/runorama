import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragMove, CdkDropList } from '@angular/cdk/drag-drop';
import { PlanPaletteItemComponent } from '../../molecules/plan-palette-item/plan-palette-item.component';
import { PlanSequenceSelectComponent } from '../../molecules/plan-sequence-select/plan-sequence-select.component';
import { PlanHourlyRecapComponent } from '../../molecules/plan-hourly-recap/plan-hourly-recap.component';
import type { PaletteEntry, PlanHourlyRecap, PlanSequenceMinutes } from '../../../core/models';

/**
 * Organism : panneau latéral du plan de consommation.
 *
 * Regroupe le sélecteur de séquences, la palette des produits à placer
 * (source de glisser-déposer) et le récapitulatif horaire. Purement
 * présentationnel : les évènements de drag et de dépôt sont relayés au parent.
 */
@Component({
  selector: 'ui-plan-palette',
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    PlanPaletteItemComponent,
    PlanSequenceSelectComponent,
    PlanHourlyRecapComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'block divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:h-full lg:overflow-y-auto',
  },
  template: `
    <!-- Séquence -->
    <section class="px-5 py-3">
      <ui-plan-sequence-select
        [value]="sequenceMinutes()"
        [options]="sequenceOptions()"
        (valueChange)="sequenceChange.emit($event)"
      />
    </section>

    <!-- Palette : produits à placer -->
    <section class="p-5">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-700">Produits à placer</h3>
        <span [class]="unplacedBadgeClass()">
          {{ unplacedUnits() }} restant{{ unplacedUnits() > 1 ? 's' : '' }}
        </span>
      </div>
      <div
        cdkDropList
        [cdkDropListData]="'palette'"
        (cdkDropListDropped)="paletteDropped.emit($event)"
        class="space-y-2"
      >
        @for (entry of entries(); track entry.product.id) {
          <ui-plan-palette-item
            cdkDrag
            [cdkDragData]="{ kind: 'product', productId: entry.product.id }"
            [cdkDragDisabled]="!entry.unlimited && entry.remaining <= 0"
            (cdkDragStarted)="dragStarted.emit()"
            (cdkDragMoved)="dragMoved.emit($event)"
            (cdkDragEnded)="dragEnded.emit()"
            [product]="entry.product"
            [carried]="entry.carried"
            [remaining]="entry.remaining"
            [unlimited]="entry.unlimited ?? false"
            [lockedNow]="entry.lockedNow ?? false"
            [unlock]="entry.unlock ?? null"
          />
        }
      </div>
      <p class="mt-3 text-xs text-slate-400">
        Glissez un produit sur la timeline. Reglissez une prise vers la palette pour la retirer.
      </p>
    </section>

    <!-- Récapitulatif horaire -->
    <section class="p-5">
      <ui-plan-hourly-recap [rows]="recapRows()" />
    </section>
  `,
})
export class PlanPaletteComponent {
  /** Produits de la palette avec décompte emporté / restant. */
  readonly entries = input.required<PaletteEntry[]>();
  /** Total d'unités restant à placer. */
  readonly unplacedUnits = input.required<number>();
  /** Granularité courante des séquences. */
  readonly sequenceMinutes = input.required<PlanSequenceMinutes>();
  /** Options de granularité proposées. */
  readonly sequenceOptions = input.required<PlanSequenceMinutes[]>();
  /** Lignes du récapitulatif horaire. */
  readonly recapRows = input.required<PlanHourlyRecap[]>();

  /** Émis quand la granularité change. */
  readonly sequenceChange = output<PlanSequenceMinutes>();
  /** Émis au dépôt d'un élément sur la palette (retrait d'une prise). */
  readonly paletteDropped = output<CdkDragDrop<string>>();
  /** Émis au début du glissement d'un produit. */
  readonly dragStarted = output<void>();
  /** Émis pendant le glissement d'un produit (aperçu du créneau). */
  readonly dragMoved = output<CdkDragMove>();
  /** Émis à la fin du glissement d'un produit. */
  readonly dragEnded = output<void>();

  protected readonly unplacedBadgeClass = computed(() => {
    const base = 'rounded-full px-2 py-0.5 text-xs font-semibold';
    return this.unplacedUnits() > 0
      ? `${base} bg-brand-50 text-brand-600`
      : `${base} bg-emerald-50 text-emerald-600`;
  });
}
