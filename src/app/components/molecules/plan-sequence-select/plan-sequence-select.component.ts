import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PlanSequenceMinutes } from '../../../core/models';

/**
 * Molecule : sélecteur du découpage des séquences (5 à 20 min) de la timeline.
 */
@Component({
  selector: 'ui-plan-sequence-select',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center justify-between gap-3' },
  template: `
    <label class="text-xs font-medium text-slate-600" for="plan-sequence">
      Découpage des séquences
    </label>
    <select
      id="plan-sequence"
      [ngModel]="value()"
      (ngModelChange)="valueChange.emit($event)"
      [class]="selectClass"
    >
      @for (option of options(); track option) {
        <option [ngValue]="option">{{ option }} min</option>
      }
    </select>
  `,
})
export class PlanSequenceSelectComponent {
  /** Granularité courante sélectionnée. */
  readonly value = input.required<PlanSequenceMinutes>();
  /** Options de granularité proposées. */
  readonly options = input.required<PlanSequenceMinutes[]>();

  /** Émis quand une nouvelle granularité est choisie. */
  readonly valueChange = output<PlanSequenceMinutes>();

  protected readonly selectClass =
    'shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-900 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-200';
}
