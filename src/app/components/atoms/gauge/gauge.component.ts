import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Couleur sémantique du remplissage du slider. */
export type GaugeColor = 'brand' | 'secondary' | 'info' | 'warning' | 'danger' | 'neutral';

/**
 * Atom : slider linéaire générique (curseur natif `range`) affichant et
 * modifiant une valeur entre `min` et `max` (ex : facteur de fatigue).
 * Interactif au clic, au glisser et au clavier.
 */
@Component({
  selector: 'ui-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      @if (label()) {
        <div class="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{{ label() }}</span>
          <span class="font-semibold tabular-nums text-slate-700">{{ value() }}{{ unit() }}</span>
        </div>
      }
      <input
        type="range"
        class="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-(--gauge-color) [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-(--gauge-color) [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
        [style.--gauge-color]="colorValue()"
        [style.background]="trackBackground()"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [value]="value()"
        [disabled]="disabled()"
        [attr.aria-label]="label() || null"
        (input)="onInput($any($event.target).valueAsNumber)"
      />
    </div>
  `,
})
export class GaugeComponent {
  /** Valeur courante (curseur). */
  readonly value = input.required<number>();
  /** Borne minimale (défaut 0). */
  readonly min = input(0);
  /** Borne maximale. */
  readonly max = input.required<number>();
  /** Pas d'incrémentation. */
  readonly step = input(1);
  /** Libellé optionnel affiché au-dessus du curseur. */
  readonly label = input('');
  /** Unité affichée après la valeur (ex : « % »). */
  readonly unit = input('');
  /** Couleur sémantique du remplissage. */
  readonly color = input<GaugeColor>('brand');
  readonly disabled = input(false);

  /** Émis à chaque déplacement du curseur (glisser, clic, clavier). */
  readonly valueChange = output<number>();

  protected readonly percent = computed(() => {
    const span = this.max() - this.min();
    if (span <= 0) return 0;
    return Math.min(100, Math.max(0, ((this.value() - this.min()) / span) * 100));
  });

  private readonly colorVars: Record<GaugeColor, string> = {
    brand: 'var(--color-brand-500)',
    secondary: 'var(--color-secondary-500)',
    info: 'var(--color-sky-500)',
    warning: 'var(--color-amber-500)',
    danger: 'var(--color-rose-500)',
    neutral: 'var(--color-slate-400, #94a3b8)',
  };

  protected readonly colorValue = computed(() => this.colorVars[this.color()]);

  /** Fond en dégradé : rempli jusqu'au pourcentage courant, gris au-delà. */
  protected readonly trackBackground = computed(
    () =>
      `linear-gradient(to right, ${this.colorValue()} ${this.percent()}%, var(--color-slate-200, #e2e8f0) ${this.percent()}%)`,
  );

  protected onInput(value: number): void {
    if (!Number.isFinite(value)) return;
    this.valueChange.emit(value);
  }
}
