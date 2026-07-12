import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * Statut d'atteinte de la cible.
 * - `under` : en-dessous de la cible (risque de sous-alimentation).
 * - `ok` : dans la fourchette cible.
 * - `over` : au-dessus de la cible (poids superflu).
 */
export type GaugeStatus = 'under' | 'ok' | 'over' | 'none';

/**
 * Molecule : jauge visuelle comparant une quantité emportée à une cible.
 *
 * Affiche la valeur emportée, la cible, un pourcentage et une barre de
 * progression colorée selon l'atteinte de la cible.
 */
@Component({
  selector: 'ui-nutrition-target-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm font-medium text-slate-700">{{ label() }}</span>
        @if (target() !== null) {
          <span class="text-xs font-semibold" [class]="textClass()">{{ percent() }}%</span>
        }
      </div>

      <div class="mt-1 flex items-baseline gap-1">
        <span class="text-xl font-bold tabular-nums text-slate-900">{{ carried() | number: '1.0-0' }}</span>
        <span class="text-sm text-slate-400">
          @if (target() !== null) {
            / {{ target() | number: '1.0-0' }} {{ unit() }}
          } @else {
            {{ unit() }}
          }
        </span>
      </div>

      <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full transition-[width] duration-300"
          [class]="barClass()"
          [style.width.%]="barWidth()"
        ></div>
      </div>

      <p class="mt-1.5 text-xs" [class]="textClass()">{{ statusLabel() }}</p>
    </div>
  `,
  imports: [DecimalPipe],
})
export class NutritionTargetGaugeComponent {
  /** Libellé de la métrique (ex : « Énergie »). */
  readonly label = input.required<string>();
  /** Quantité effectivement emportée. */
  readonly carried = input.required<number>();
  /** Cible à atteindre ; `null` si non définie. */
  readonly target = input<number | null>(null);
  /** Unité affichée (ex : « kcal », « g »). */
  readonly unit = input('');

  /** Ratio emporté / cible (0 si pas de cible). */
  private readonly ratio = computed(() => {
    const target = this.target();
    if (target === null || target <= 0) return 0;
    return this.carried() / target;
  });

  protected readonly percent = computed(() => Math.round(this.ratio() * 100));

  protected readonly barWidth = computed(() => Math.min(100, Math.max(0, this.percent())));

  protected readonly status = computed<GaugeStatus>(() => {
    if (this.target() === null) return 'none';
    const ratio = this.ratio();
    if (ratio < 0.9) return 'under';
    if (ratio > 1.1) return 'over';
    return 'ok';
  });

  protected readonly barClass = computed(() => {
    switch (this.status()) {
      case 'under':
        return 'bg-rose-500';
      case 'over':
        return 'bg-amber-500';
      case 'ok':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-300';
    }
  });

  protected readonly textClass = computed(() => {
    switch (this.status()) {
      case 'under':
        return 'text-rose-600';
      case 'over':
        return 'text-amber-600';
      case 'ok':
        return 'text-emerald-600';
      default:
        return 'text-slate-400';
    }
  });

  protected readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'under':
        return 'Insuffisant pour la cible';
      case 'over':
        return 'Au-dessus de la cible';
      case 'ok':
        return 'Dans la cible';
      default:
        return 'Définissez un chrono cible';
    }
  });
}
