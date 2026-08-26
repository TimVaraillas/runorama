import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NUTRIENT_GOALS } from '../../../core/models';
import type { RaceComparison, RaceNutrientKey } from '../../../core/utils/race-result.util';
import { RACE_NUTRIENT_KEYS } from '../../../core/utils/race-result.util';

interface MetricRow {
  key: RaceNutrientKey;
  label: string;
  unit: string;
  plannedPerHour: number;
  actualPerHour: number;
}

/**
 * Organism : synthèse « prévu vs réel » d'une course finalisée.
 *
 * Présente, par nutriment, l'apport horaire planifié comparé au réalisé, le
 * bilan hydrique et le taux de respect du plan. Purement présentationnel.
 */
@Component({
  selector: 'ui-race-metrics-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Respect du plan + eau -->
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm text-slate-500">Respect du plan</p>
          <div class="mt-1 flex items-end gap-2">
            <span class="text-2xl font-semibold" [class]="adherenceColor()">
              {{ comparison().adherencePct }}%
            </span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full transition-all"
              [class]="adherenceBarColor()"
              [style.width.%]="comparison().adherencePct"
            ></div>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm text-slate-500">Eau</p>
          <p class="mt-1 text-xl font-semibold text-slate-900">
            {{ formatMl(comparison().actualWaterMl) }}
            <span class="text-sm font-normal text-slate-400">
              / {{ formatMl(comparison().plannedWaterMl) }} prévu
            </span>
          </p>
        </div>
      </div>

      <!-- Nutriments : prévu vs réel par heure -->
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-2 text-left font-medium">Nutriment</th>
              <th class="px-4 py-2 text-right font-medium">Prévu /h</th>
              <th class="px-4 py-2 text-right font-medium">Réel /h</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (row of rows(); track row.key) {
              <tr>
                <td class="px-4 py-2 font-medium text-slate-700">{{ row.label }}</td>
                <td class="px-4 py-2 text-right tabular-nums text-slate-500">
                  {{ round(row.plannedPerHour) }} {{ row.unit }}
                </td>
                <td class="px-4 py-2 text-right font-semibold tabular-nums text-slate-900">
                  {{ round(row.actualPerHour) }} {{ row.unit }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class RaceMetricsSummaryComponent {
  readonly comparison = input.required<RaceComparison>();

  protected readonly rows = computed<MetricRow[]>(() => {
    const c = this.comparison();
    return RACE_NUTRIENT_KEYS.map((key) => {
      const meta = NUTRIENT_GOALS.find((g) => g.key === key);
      return {
        key,
        label: meta?.label ?? key,
        unit: meta?.unit ?? '',
        plannedPerHour: c.plannedPerHour[key],
        actualPerHour: c.actualPerHour[key],
      };
    });
  });

  protected readonly adherenceColor = computed(() => {
    const pct = this.comparison().adherencePct;
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 50) return 'text-amber-600';
    return 'text-rose-600';
  });

  protected readonly adherenceBarColor = computed(() => {
    const pct = this.comparison().adherencePct;
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  });

  protected round(value: number): number {
    return Math.round(value);
  }

  protected formatMl(ml: number): string {
    if (!ml) return '0 ml';
    return ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${Math.round(ml)} ml`;
  }
}
