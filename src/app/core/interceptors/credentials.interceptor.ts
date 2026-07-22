import type { HttpInterceptorFn } from '@angular/common/http';

/**
 * Force l'envoi des cookies (dont le cookie de session HttpOnly) sur les appels
 * vers l'API interne, y compris lorsque `withFetch()` est utilisé.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api')) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
};
