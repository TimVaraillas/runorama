import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SequenceMark } from '../../../core/models';

/**
 * Molecule : colonne des libellés horaires (gouttière) alignée sur la piste.
 */
@Component({
  selector: 'ui-plan-timeline-gutter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block w-12 shrink-0', '[style.height.px]': 'height()' },
  template: `
    @for (mark of marks(); track mark.minute) {
      <span
        class="absolute right-1 -translate-y-1/2 text-[11px] tabular-nums"
        [class]="mark.major ? 'font-semibold text-slate-500' : 'text-slate-300'"
        [style.top.px]="mark.top"
      >
        {{ mark.label }}
      </span>
    }
  `,
})
export class PlanTimelineGutterComponent {
  /** Repères de séquence à afficher. */
  readonly marks = input.required<SequenceMark[]>();
  /** Hauteur totale de la piste (px). */
  readonly height = input.required<number>();
}
