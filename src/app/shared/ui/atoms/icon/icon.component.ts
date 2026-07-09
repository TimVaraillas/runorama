import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Atom : icône.
 * Fine surcouche autour de FontAwesome pour normaliser tailles et couleurs
 * à l'échelle du design system.
 */
@Component({
  selector: 'ui-icon',
  standalone: true,
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fa-icon [icon]="icon()" [class]="classes()" [fixedWidth]="fixedWidth()" />`,
})
export class IconComponent {
  readonly icon = input.required<IconDefinition>();
  readonly size = input<IconSize>('md');
  readonly fixedWidth = input(false, { transform: booleanAttribute });

  private readonly sizes: Record<IconSize, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  readonly classes = computed(() => this.sizes[this.size()]);
}
