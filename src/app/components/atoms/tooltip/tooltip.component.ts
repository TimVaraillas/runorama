import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';

/** Position du tooltip par rapport à l'élément projeté. */
export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

/**
 * Atom : tooltip.
 *
 * Enveloppe un contenu projeté et affiche une info-bulle au survol ou au focus
 * clavier lorsque `text` est renseigné. La position est réglable via `position`.
 * Le rendu est 100 % CSS par défaut (aucun overlay JS) grâce aux variantes
 * Tailwind `group-hover` / `group-focus-within`.
 *
 * Quand `escapeOverflow` est activé, la bulle est positionnée en `fixed` (calcul
 * JS de ses coordonnées au survol) afin de ne jamais être rognée par un ancêtre
 * à défilement ou à `overflow` masqué.
 */
@Component({
  selector: 'ui-tooltip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      #trigger
      class="group relative inline-flex"
      (mouseenter)="onShow()"
      (mouseleave)="onHide()"
      (focusin)="onShow()"
      (focusout)="onHide()"
    >
      <ng-content />
      @if (text()) {
        @if (escapeOverflow()) {
          @if (fixedVisible()) {
            <span
              role="tooltip"
              [class]="fixedTooltipClasses()"
              [style.top.px]="fixedTop()"
              [style.left.px]="fixedLeft()"
            >
              {{ text() }}
            </span>
          }
        } @else {
          <span role="tooltip" [class]="tooltipClasses()">
            {{ text() }}
            <span [class]="arrowClasses()"></span>
          </span>
        }
      }
    </span>
  `,
})
export class TooltipComponent {
  readonly text = input('');
  readonly position = input<TooltipPosition>('top');
  /** Positionnement `fixed` (calculé au survol) pour échapper aux ancêtres à `overflow` masqué. */
  readonly escapeOverflow = input(false, { transform: booleanAttribute });

  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');

  protected readonly fixedVisible = signal(false);
  protected readonly fixedTop = signal(0);
  protected readonly fixedLeft = signal(0);

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

  /** Classes de transformation par position (variante `fixed`). */
  private readonly fixedTransforms: Record<TooltipPosition, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  };

  private static readonly GAP = 8;
  private static readonly VIEWPORT_MARGIN = 8;

  readonly tooltipClasses = computed(() => `${this.tooltipBase} ${this.positions[this.position()]}`);
  readonly arrowClasses = computed(() => `${this.arrowBase} ${this.arrows[this.position()]}`);

  protected readonly fixedTooltipClasses = computed(
    () =>
      `pointer-events-none fixed z-50 w-max max-w-xs rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md ${this.fixedTransforms[this.position()]}`,
  );

  /** Calcule et affiche la position `fixed` de la bulle, ancrée sur le déclencheur. */
  protected onShow(): void {
    if (!this.escapeOverflow()) return;
    const el = this.trigger()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = TooltipComponent.GAP;
    const margin = TooltipComponent.VIEWPORT_MARGIN;
    let top = rect.top;
    let left = rect.left + rect.width / 2;

    switch (this.position()) {
      case 'top':
        top = rect.top - gap;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        break;
    }

    // Empêche la bulle de sortir de la fenêtre, quelle que soit la largeur du
    // conteneur ancêtre (dont l'`overflow` masqué ne l'affecte plus ici).
    left = Math.min(Math.max(left, margin), window.innerWidth - margin);
    top = Math.min(Math.max(top, margin), window.innerHeight - margin);

    this.fixedTop.set(top);
    this.fixedLeft.set(left);
    this.fixedVisible.set(true);
  }

  protected onHide(): void {
    this.fixedVisible.set(false);
  }
}
