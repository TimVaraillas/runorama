import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';
import type { User } from '../../../core/models';

/**
 * Molecule : pastille utilisateur.
 *
 * Affiche l'avatar (initiales) et, à partir du breakpoint `sm`, le nom complet
 * de l'utilisateur. Composant purement présentiel : la navigation/action est
 * gérée par le parent.
 */
@Component({
  selector: 'ui-user-badge',
  standalone: true,
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="flex items-center gap-2">
      <ui-avatar [initials]="initials()" size="sm" />
      <span class="hidden font-medium sm:inline">
        {{ user().firstName }} {{ user().lastName }}
      </span>
    </span>
  `,
})
export class UserBadgeComponent {
  /** Utilisateur à afficher. */
  readonly user = input.required<User>();

  protected readonly initials = computed(() => {
    const user = this.user();
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });
}
