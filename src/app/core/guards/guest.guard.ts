import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Réserve une route aux visiteurs non connectés (page de garde).
 *
 * Côté serveur (SSR), le cookie n'est pas propagé : on laisse passer pour éviter
 * une redirection incorrecte. Côté navigateur, un utilisateur déjà authentifié
 * est redirigé vers l'application.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/courses']);
  }

  return auth.fetchMe().pipe(
    map(() => router.createUrlTree(['/courses'])),
    catchError(() => of(true)),
  );
};
