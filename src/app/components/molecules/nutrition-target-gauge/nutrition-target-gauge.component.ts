import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * Statut d'atteinte de la cible.
 * - `ok` : dans la fourchette cible (±5%).
 * - `warn` : proche de la cible (±10%) — peut mieux faire.
 * - `bad` : trop éloigné de la cible (au-delà de ±10%).
 * - `none` : aucune cible définie.
 */
export type GaugeStatus = 'ok' | 'warn' | 'bad' | 'none';

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

      <div class="relative mt-6 h-2.5">
        <!-- Piste avec remplissage (arrondie et rognée). -->
        <div class="absolute inset-0 overflow-hidden rounded-full bg-slate-100">
          <div
            class="h-full rounded-full transition-[width] duration-300"
            [class]="barClass()"
            [style.width.%]="barWidth()"
          ></div>

          @if (target() !== null) {
            <!-- Zone de tolérance (±10%), estompée en dégradé sur les côtés. -->
            <div
              class="absolute inset-y-0 bg-linear-to-r from-transparent via-slate-300/20 to-transparent"
              [style.left.%]="lowerWarnPosition()"
              [style.width.%]="toleranceWidth()"
            ></div>
          }
        </div>

        @if (target() !== null) {

          <!-- Repère objectif (100%). -->
          <div
            class="absolute -inset-y-4.5 border-l-2 border-dashed border-slate-300"
            [style.left.%]="targetPosition()"
          ></div>
          <span
            class="absolute -top-10 -translate-x-2/5 text-[10px] font-semibold text-slate-300"
            [style.left.%]="targetPosition()"
            >100%</span
          >
        }
      </div>

      <p class="mt-2.5 text-xs" [class]="textClass()">{{ statusLabel() }}</p>
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

  /** Tolérance autour de la cible pour le statut « ok » (±5%). */
  private readonly tolerance = 0.10;

  /** Tolérance d'alerte : au-delà, le statut passe « peut mieux faire » (±10%). */
  private readonly warnTolerance = 0.15;

  /** Échelle maximale de la barre : la cible (100%) est placée avant la fin. */
  private readonly maxScale = 1.25;

  /** Ratio emporté / cible (0 si pas de cible). */
  private readonly ratio = computed(() => {
    const target = this.target();
    if (target === null || target <= 0) return 0;
    return this.carried() / target;
  });

  protected readonly percent = computed(() => Math.round(this.ratio() * 100));

  protected readonly barWidth = computed(() =>
    Math.min(100, Math.max(0, (this.ratio() / this.maxScale) * 100)),
  );

  /** Position (%) d'un ratio donné sur la barre selon l'échelle max. */
  private position(ratio: number): number {
    return Math.min(100, Math.max(0, (ratio / this.maxScale) * 100));
  }

  /** Position du repère objectif (100%). */
  protected readonly targetPosition = computed(() => this.position(1));

  /** Position de la graduation basse (-5%). */
  protected readonly lowerBoundPosition = computed(() => this.position(1 - this.tolerance));

  /** Position de la graduation haute (+5%). */
  protected readonly upperBoundPosition = computed(() => this.position(1 + this.tolerance));

  /** Position de la graduation d'alerte basse (-10%). */
  protected readonly lowerWarnPosition = computed(() => this.position(1 - this.warnTolerance));

  /** Position de la graduation d'alerte haute (+10%). */
  protected readonly upperWarnPosition = computed(() => this.position(1 + this.warnTolerance));

  /** Largeur de la zone de tolérance entre les deux graduations d'alerte (±10%). */
  protected readonly toleranceWidth = computed(
    () => this.upperWarnPosition() - this.lowerWarnPosition(),
  );

  protected readonly status = computed<GaugeStatus>(() => {
    if (this.target() === null) return 'none';
    const deviation = Math.abs(this.ratio() - 1);
    if (deviation <= this.tolerance) return 'ok';
    if (deviation <= this.warnTolerance) return 'warn';
    return 'bad';
  });

  protected readonly barClass = computed(() => {
    switch (this.status()) {
      case 'ok':
        return 'bg-emerald-500';
      case 'warn':
        return 'bg-amber-500';
      case 'bad':
        return 'bg-rose-500';
      default:
        return 'bg-slate-300';
    }
  });

  protected readonly textClass = computed(() => {
    switch (this.status()) {
      case 'ok':
        return 'text-emerald-600';
      case 'warn':
        return 'text-amber-600';
      case 'bad':
        return 'text-rose-600';
      default:
        return 'text-slate-400';
    }
  });

  protected readonly statusLabel = computed(() => {
    const status = this.status();
    if (status === 'none') return 'Définissez une cible';
    if (status === 'ok') return 'Dans la cible';
    const under = this.ratio() < 1;
    if (status === 'warn') {
      return under ? 'Un peu court, peut mieux faire' : 'Un peu au-dessus, peut mieux faire';
    }
    return under ? 'Insuffisant pour la cible' : 'Au-dessus de la cible';
  });
}
