import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Atom : emplacement fantôme (contour pointillé) prévisualisé sur la timeline
 * pendant qu'un produit est glissé depuis la palette.
 */
@Component({
  selector: 'ui-plan-ghost-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'pointer-events-none absolute rounded-xl border-2 border-dashed border-secondary-400 bg-secondary-100/40',
    '[style.top.px]': 'top()',
    '[style.height.px]': 'height()',
    '[style.left]': 'left()',
    '[style.width]': 'width()',
  },
  template: '',
})
export class PlanGhostBlockComponent {
  /** Décalage vertical (px). */
  readonly top = input.required<number>();
  /** Hauteur du bloc (px). */
  readonly height = input.required<number>();
  /** Position horizontale (calc CSS). */
  readonly left = input.required<string>();
  /** Largeur du bloc (calc CSS). */
  readonly width = input.required<string>();
}
