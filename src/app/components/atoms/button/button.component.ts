import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Atom : bouton réutilisable.
 * Gère les variantes, tailles, état désactivé et icône optionnelle (FontAwesome).
 */
@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="classes()"
      (click)="clicked.emit($event)"
    >
      @if (icon() && iconPosition() === 'left') {
        <fa-icon [icon]="icon()!" />
      }
      <span><ng-content /></span>
      @if (icon() && iconPosition() === 'right') {
        <fa-icon [icon]="icon()!" />
      }
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly icon = input<IconDefinition | null>(null);
  readonly iconPosition = input<'left' | 'right'>('left');

  readonly clicked = output<MouseEvent>();

  private readonly base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  private readonly variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
    secondary:
      'bg-secondary-50 text-secondary-700 hover:bg-secondary-100 focus-visible:ring-secondary-400',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
  };

  private readonly sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  readonly classes = computed(
    () => `${this.base} ${this.variants[this.variant()]} ${this.sizes[this.size()]}`,
  );
}
