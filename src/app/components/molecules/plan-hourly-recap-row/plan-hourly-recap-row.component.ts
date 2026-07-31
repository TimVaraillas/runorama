import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { PlanHourlyNutrient, PlanHourlyRecap } from '../../../core/models';

/**
 * Molecule : ligne du récapitulatif horaire. Affiche, pour chaque nutriment
 * suivi, l'apport planifié comparé à la cible avec une barre de progression.
 */
@Component({
  selector: 'ui-plan-hourly-recap-row',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-2' },
  template: `
    <span class="text-xs font-medium text-slate-600">Heure {{ row().hour }}</span>
    @for (nutrient of row().nutrients; track nutrient.key) {
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>{{ nutrient.label }}</span>
          <span class="tabular-nums">
            {{ nutrient.planned | number: '1.0-0' }} / {{ nutrient.target | number: '1.0-0' }}
            {{ nutrient.unit }}
          </span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full rounded-full transition-all"
            [class]="barClass(nutrient)"
            [style.width.%]="ratio(nutrient)"
          ></div>
        </div>
      </div>
    }
  `,
})
export class PlanHourlyRecapRowComponent {
  /** Données de la ligne horaire. */
  readonly row = input.required<PlanHourlyRecap>();

  protected barClass(nutrient: PlanHourlyNutrient): string {
    return nutrient.planned >= nutrient.target ? 'bg-emerald-400' : 'bg-brand-400';
  }

  protected ratio(nutrient: PlanHourlyNutrient): number {
    if (nutrient.target <= 0) return 0;
    return Math.min(100, (nutrient.planned / nutrient.target) * 100);
  }
}
