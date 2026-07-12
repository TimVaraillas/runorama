import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PlanHourlyRecap } from '../../../core/models';
import { PlanHourlyRecapRowComponent } from '../plan-hourly-recap-row/plan-hourly-recap-row.component';

/**
 * Molecule : récapitulatif des apports planifiés par heure, comparés aux
 * besoins cibles de l'évènement.
 */
@Component({
  selector: 'ui-plan-hourly-recap',
  standalone: true,
  imports: [PlanHourlyRecapRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <h3 class="mb-3 text-sm font-semibold text-slate-700">Apports planifiés par heure</h3>
    <div class="space-y-3">
      @for (row of rows(); track row.hour) {
        <ui-plan-hourly-recap-row [row]="row" />
      }
    </div>
  `,
})
export class PlanHourlyRecapComponent {
  /** Lignes horaires à afficher. */
  readonly rows = input.required<PlanHourlyRecap[]>();
}
