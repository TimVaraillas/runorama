import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { PlanHourlyRecap } from '../../../core/models';

/**
 * Molecule : ligne du récapitulatif horaire (glucides / énergie vs cible)
 * avec sa barre de progression.
 */
@Component({
  selector: 'ui-plan-hourly-recap-row',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-1' },
  template: `
    <div class="flex items-center justify-between text-xs text-slate-500">
      <span class="font-medium text-slate-600">Heure {{ row().hour }}</span>
      <span class="tabular-nums">
        {{ row().carbs | number: '1.0-0' }} / {{ row().targetCarbs | number: '1.0-0' }} g ·
        {{ row().energy | number: '1.0-0' }} / {{ row().targetEnergy | number: '1.0-0' }} kcal
      </span>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div
        class="h-full rounded-full transition-all"
        [class]="barClass()"
        [style.width.%]="ratio()"
      ></div>
    </div>
  `,
})
export class PlanHourlyRecapRowComponent {
  /** Données de la ligne horaire. */
  readonly row = input.required<PlanHourlyRecap>();

  protected readonly barClass = computed(() =>
    this.row().carbs >= this.row().targetCarbs ? 'bg-emerald-400' : 'bg-brand-400',
  );

  protected readonly ratio = computed(() => {
    const { carbs, targetCarbs } = this.row();
    if (targetCarbs <= 0) return 0;
    return Math.min(100, (carbs / targetCarbs) * 100);
  });
}
