import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { faRightFromBracket, faUser } from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from '../../atoms/button/button.component';
import { DropdownMenuItemComponent } from '../../atoms/dropdown-menu-item/dropdown-menu-item.component';
import { DropdownMenuComponent } from '../../molecules/dropdown-menu/dropdown-menu.component';
import { UserBadgeComponent } from '../../molecules/user-badge/user-badge.component';
import { AuthService } from '../../../features/auth/services/auth.service';

/**
 * Organism : menu de l'utilisateur connecté.
 *
 * Affiche la pastille utilisateur qui, au clic, déroule un menu proposant
 * l'accès au profil et la déconnexion. Ne rend rien si aucun utilisateur n'est
 * connecté.
 */
@Component({
  selector: 'ui-user-menu',
  standalone: true,
  imports: [ButtonComponent, DropdownMenuComponent, DropdownMenuItemComponent, UserBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.currentUser(); as user) {
      <ui-dropdown-menu>
        <ui-button trigger color="default" variant="ghost" size="sm">
          <ui-user-badge [user]="user" />
        </ui-button>

        <ui-dropdown-menu-item [icon]="faUser" (selected)="goToProfile()">
          Mon profil
        </ui-dropdown-menu-item>
        <ui-dropdown-menu-item [icon]="faRightFromBracket" color="danger" (selected)="logout()">
          Se déconnecter
        </ui-dropdown-menu-item>
      </ui-dropdown-menu>
    }
  `,
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly faUser = faUser;
  protected readonly faRightFromBracket = faRightFromBracket;

  protected goToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
