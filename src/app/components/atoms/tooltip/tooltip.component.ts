import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Position du tooltip par rapport à l'élément projeté. */
export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

/**
 * Atom : tooltip.
 *
 * Enveloppe un contenu projeté et affiche une info-bulle au survol ou au focus
 * clavier lorsque `text` est renseigné. La position est réglable via `position`.
 * Le rendu est 100 % CSS (aucun overlay JS) grâce aux variantes Tailwind
 * `group-hover` / `group-focus-within`.
 */
@Component({
  selector: 'ui-tooltip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="group relative inline-flex">
      <ng-content />
      @if (text()) {
        <span role="tooltip" [class]="tooltipClasses()">
          {{ text() }}
          <span [class]="arrowClasses()"></span>
        </span>
      }
    </span>
  `,
})
export class TooltipComponent {
  readonly text = input('');
  readonly position = input<TooltipPosition>('top');

  private readonly tooltipBase =
    'pointer-events-none absolute z-50 w-max max-w-xs rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100';

  private readonly positions: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    left: 'right-full top-1/2 mr-2 -translate-y-1/2',
    right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  };

  private readonly arrowBase = 'absolute h-2 w-2 rotate-45 bg-slate-900';

  private readonly arrows: Record<TooltipPosition, string> = {
    top: 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2',
    left: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2',
    right: 'right-full top-1/2 translate-x-1/2 -translate-y-1/2',
  };

  readonly tooltipClasses = computed(() => `${this.tooltipBase} ${this.positions[this.position()]}`);
  readonly arrowClasses = computed(() => `${this.arrowBase} ${this.arrows[this.position()]}`);
}
