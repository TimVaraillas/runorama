import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { IntensityZone } from '../../../core/models';

/**
 * Atom : pastille de zone d'intensité.
 * Affiche une couleur cohérente avec la zone d'effort (facile, tempo, seuil, VO2...).
 */
@Component({
  selector: 'ui-zone-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="classes()">
      <span class="h-2 w-2 rounded-full" [style.background-color]="dotColor()"></span>
      {{ label() }}
    </span>
  `,
})
export class ZoneChipComponent {
  readonly zone = input.required<IntensityZone>();

  private readonly labels: Record<IntensityZone, string> = {
    recovery: 'Récupération',
    easy: 'Facile',
    endurance: 'Endurance',
    tempo: 'Tempo',
    threshold: 'Seuil',
    vo2: 'VO2 max',
    anaerobic: 'Anaérobie',
  };

  private readonly colors: Record<IntensityZone, string> = {
    recovery: '#94a3b8',
    easy: 'var(--color-zone-easy)',
    endurance: 'var(--color-zone-endurance)',
    tempo: 'var(--color-zone-tempo)',
    threshold: 'var(--color-zone-threshold)',
    vo2: 'var(--color-zone-vo2)',
    anaerobic: 'var(--color-zone-anaerobic)',
  };

  readonly label = computed(() => this.labels[this.zone()]);
  readonly dotColor = computed(() => this.colors[this.zone()]);

  readonly classes = computed(
    () =>
      'inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700',
  );
}
