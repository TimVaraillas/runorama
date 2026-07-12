import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ResizeEdge } from '../../../core/models';

/**
 * Atom : poignée de redimensionnement d'une prise sur la timeline.
 *
 * Positionnée sur le bord haut ou bas d'un bloc, elle émet l'évènement pointer
 * initial (`grab`) que le parent utilise pour piloter le redimensionnement.
 */
@Component({
  selector: 'ui-plan-resize-handle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'absolute inset-x-0 z-20 flex h-2.5 cursor-ns-resize items-center justify-center touch-none',
    '[class.top-0]': "edge() === 'top'",
    '[class.bottom-0]': "edge() === 'bottom'",
    '[attr.aria-label]': 'ariaLabel()',
    '(pointerdown)': 'grab.emit($event)',
  },
  template: `<span class="h-0.5 w-6 rounded-full bg-secondary-100"></span>`,
})
export class PlanResizeHandleComponent {
  /** Bord de la prise concerné par cette poignée. */
  readonly edge = input.required<ResizeEdge>();

  /** Émis au `pointerdown` pour démarrer le redimensionnement. */
  readonly grab = output<PointerEvent>();

  protected readonly ariaLabel = computed(() =>
    this.edge() === 'top' ? 'Redimensionner (début)' : 'Redimensionner (fin)',
  );
}
