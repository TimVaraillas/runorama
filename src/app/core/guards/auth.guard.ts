import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Protège les routes nécessitant une authentification.
 *
 * Côté serveur (SSR), le cookie n'est pas propagé : on laisse passer pour éviter
 * une redirection incorrecte, la vérification réelle a lieu à l'hydratation côté
 * navigateur. Côté navigateur, si l'état local est vide, on interroge `/me`.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (auth.isAuthenticated()) {
    return true;
  }

  return auth.fetchMe().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};

/**
 * Protège les routes réservées aux administrateurs.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const ensure = auth.isAuthenticated() ? of(auth.currentUser()) : auth.fetchMe();

  return ensure.pipe(
    map(() => (auth.isAdmin() ? true : router.createUrlTree(['/courses']))),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
