import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * Atom : avatar affichant les initiales sur une pastille ronde.
 *
 * Composant purement présentiel, réutilisable partout où l'on veut représenter
 * un utilisateur de façon compacte.
 */
@Component({
  selector: 'ui-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="grid shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white"
      [class]="sizeClasses()"
    >
      {{ initials() }}
    </span>
  `,
})
export class AvatarComponent {
  /** Initiales à afficher (ex. « AR »). */
  readonly initials = input.required<string>();
  /** Taille de la pastille. */
  readonly size = input<AvatarSize>('md');

  private readonly sizes: Record<AvatarSize, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
  };

  protected readonly sizeClasses = computed(() => this.sizes[this.size()]);
}
