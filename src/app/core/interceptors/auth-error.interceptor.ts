import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Sur une réponse 401 provenant de l'API (hors routes d'authentification),
 * réinitialise l'état utilisateur et redirige vers la page de connexion.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        req.url.startsWith('/api') &&
        !req.url.includes('/api/auth/')
      ) {
        auth.clear();
        if (isPlatformBrowser(platformId)) {
          void router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
