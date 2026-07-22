import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TooltipComponent, type TooltipPosition } from '../tooltip/tooltip.component';

/** Couleur sémantique du bouton. */
export type ButtonColor = 'primary' | 'secondary' | 'default' | 'info' | 'warning' | 'danger';
/** Style visuel du bouton : plein, contour ou fantôme. */
export type ButtonVariant = 'full' | 'outlined' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Classes Tailwind d'une couleur pour chacun des styles de bouton. */
interface ColorStyles {
  full: string;
  outlined: string;
  ghost: string;
}

/**
 * Atom : bouton réutilisable.
 *
 * L'apparence se compose de deux axes indépendants :
 * - `color` : intention sémantique (primary, secondary, default, info, warning, danger) ;
 * - `variant` : style visuel (`full` plein, `outlined` contour, `ghost` fantôme).
 *
 * S'y ajoutent la taille, l'état désactivé et une icône optionnelle (FontAwesome).
 */
@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [FaIconComponent, TooltipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-tooltip [text]="tooltipContent()" [position]="tooltipPosition()">
      <button
        [type]="type()"
        [disabled]="disabled()"
        [class]="classes()"
        (click)="clicked.emit($event)"
      >
        @if (icon() && iconPosition() === 'left') {
          <fa-icon [icon]="icon()!" />
        }
        <span class="empty:hidden"><ng-content /></span>
        @if (icon() && iconPosition() === 'right') {
          <fa-icon [icon]="icon()!" />
        }
      </button>
    </ui-tooltip>
  `,
})
export class ButtonComponent {
  readonly color = input<ButtonColor>('primary');
  readonly variant = input<ButtonVariant>('full');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly icon = input<IconDefinition | null>(null);
  readonly iconPosition = input<'left' | 'right'>('left');
  /** Texte affiché dans l'info-bulle. Le tooltip n'apparaît que s'il est renseigné. */
  readonly tooltipContent = input('');
  /** Position de l'info-bulle autour du bouton. */
  readonly tooltipPosition = input<TooltipPosition>('top');

  readonly clicked = output<MouseEvent>();

  private readonly base =
    'inline-flex items-center justify-center gap-2 rounded-lg cursor-pointer font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  /**
   * Matrice couleur × style. Les classes sont écrites littéralement pour que
   * le compilateur Tailwind (JIT) les détecte à l'analyse des sources.
   */
  private readonly colors: Record<ButtonColor, ColorStyles> = {
    primary: {
      full: 'bg-brand-600 text-white hover:bg-brand-400 focus-visible:ring-brand-500',
      outlined:
        'border border-brand-500 bg-transparent text-brand-500 hover:bg-brand-100 focus-visible:ring-brand-500',
      ghost: 'bg-transparent text-brand-500 hover:bg-brand-100 focus-visible:ring-brand-500',
    },
    secondary: {
      full: 'bg-secondary-500 text-white hover:bg-secondary-600 focus-visible:ring-secondary-400',
      outlined:
        'border border-secondary-500 bg-transparent text-secondary-500 hover:bg-secondary-100 focus-visible:ring-secondary-400',
      ghost:
        'bg-transparent text-secondary-500 hover:bg-secondary-100 focus-visible:ring-secondary-400',
    },
    default: {
      full: 'bg-slate-400 text-white hover:bg-slate-500 focus-visible:ring-slate-400',
      outlined:
        'border border-slate-400 bg-transparent text-slate-500 hover:bg-slate-200 focus-visible:ring-slate-300',
      ghost: 'bg-transparent text-slate-500 hover:bg-slate-200 focus-visible:ring-slate-300',
    },
    info: {
      full: 'bg-sky-500 text-white hover:bg-sky-600 focus-visible:ring-sky-500',
      outlined:
        'border border-sky-500 bg-transparent text-sky-500 hover:bg-sky-100 focus-visible:ring-sky-500',
      ghost: 'bg-transparent text-sky-500 hover:bg-sky-100 focus-visible:ring-sky-500',
    },
    warning: {
      full: 'bg-amber-500 text-white hover:bg-amber-400 focus-visible:ring-amber-400',
      outlined:
        'border border-amber-500 bg-transparent text-amber-600 hover:bg-amber-100 focus-visible:ring-amber-400',
      ghost: 'bg-transparent text-amber-600 hover:bg-amber-100 focus-visible:ring-amber-400',
    },
    danger: {
      full: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
      outlined:
        'border border-rose-500 bg-transparent text-rose-500 hover:bg-rose-100 focus-visible:ring-rose-500',
      ghost: 'bg-transparent text-rose-500 hover:bg-rose-100 focus-visible:ring-rose-500',
    },
  };

  private readonly sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  readonly classes = computed(
    () =>
      `${this.base} ${this.colors[this.color()][this.variant()]} ${this.sizes[this.size()]}`,
  );
}
