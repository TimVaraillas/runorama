import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { Exercise, Session } from '../../../core/models';
import {
  formatDistance,
  formatDuration,
  formatPulse,
  formatSpeed,
} from '../../../core/utils/pace.util';
import {
  faXmark,
  faLayerGroup,
  faRepeat,
  faClock,
  faRoute,
  faHeartPulse,
  faGaugeHigh,
  faBoltLightning,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : panneau de détail d'une séance.
 * Affiche les blocs, leurs répétitions et le détail de chaque exercice
 * (durée/distance et cibles d'effort). Émet `close` pour fermer le panneau.
 */
@Component({
  selector: 'ui-session-details',
  standalone: true,
  imports: [BadgeComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full flex-col">
      <header class="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div class="min-w-0">
          <h2 class="font-display text-xl font-bold text-slate-900">{{ session().name }}</h2>
          @if (session().description) {
            <p class="mt-1 text-sm text-slate-500">{{ session().description }}</p>
          }
        </div>
        <button
          type="button"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fermer"
          (click)="close.emit()"
        >
          <ui-icon [icon]="faXmark" />
        </button>
      </header>

      <div class="flex-1 space-y-4 overflow-y-auto p-5">
        @for (block of session().blocks; track $index) {
          <section class="rounded-xl border border-slate-200 bg-white">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <span class="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ui-icon [icon]="faLayerGroup" size="sm" />
                {{ block.name }}
              </span>
              @if (block.repeat > 1) {
                <ui-badge tone="accent">
                  <ui-icon [icon]="faRepeat" size="xs" />
                  <span class="ml-1">× {{ block.repeat }}</span>
                </ui-badge>
              }
            </div>

            @if (block.description) {
              <p class="px-4 pt-3 text-xs text-slate-500">{{ block.description }}</p>
            }

            <ul class="divide-y divide-slate-100">
              @for (exercise of block.exercises; track $index) {
                <li class="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <ui-icon [icon]="metricIcon(exercise)" size="sm" />
                    {{ metricLabel(exercise) }}
                  </span>

                  @if (exercise.instruction) {
                    <span class="text-sm text-slate-500">— {{ exercise.instruction }}</span>
                  }

                  <span class="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                    @for (chip of targetChips(exercise); track chip.label) {
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      >
                        <ui-icon [icon]="chip.icon" size="xs" />
                        {{ chip.label }}
                      </span>
                    }
                  </span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
})
export class SessionDetailsComponent {
  readonly session = input.required<Session>();
  readonly close = output<void>();

  readonly faXmark = faXmark;
  readonly faLayerGroup = faLayerGroup;
  readonly faRepeat = faRepeat;

  /** Icône représentant la métrique principale (durée ou distance). */
  metricIcon(exercise: Exercise): typeof faClock {
    return exercise.distance != null ? faRoute : faClock;
  }

  /** Libellé de la métrique principale (durée ou distance). */
  metricLabel(exercise: Exercise): string {
    if (exercise.distance != null) {
      return formatDistance(exercise.distance);
    }
    if (exercise.duration != null) {
      return formatDuration(exercise.duration);
    }
    return '—';
  }

  /** Construit les pastilles de cible (intensité, allure, FC, zone). */
  targetChips(exercise: Exercise): Array<{ label: string; icon: typeof faClock }> {
    const target = exercise.target;
    if (!target) {
      return [];
    }
    const chips: Array<{ label: string; icon: typeof faClock }> = [];
    if (target.intensity) {
      chips.push({ label: target.intensity, icon: faBoltLightning });
    }
    if (target.pace != null) {
      chips.push({ label: formatSpeed(target.pace), icon: faGaugeHigh });
    }
    if (target.pulse != null) {
      chips.push({ label: formatPulse(target.pulse), icon: faHeartPulse });
    }
    if (target.zone != null) {
      chips.push({ label: `Zone ${target.zone}`, icon: faLayerGroup });
    }
    return chips;
  }
}
