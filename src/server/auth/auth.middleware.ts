import type { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIE, verifyToken, type UserRole } from './auth.util';

/** Utilisateur authentifié attaché à la requête. */
export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Lit le cookie JWT et attache `req.user` s'il est valide.
 * N'échoue jamais : les routes publiques restent accessibles.
 */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const token = cookies?.[AUTH_COOKIE];
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = { id: payload.sub, role: payload.role };
    }
  }
  next();
}

/** Rejette la requête (401) si aucun utilisateur n'est authentifié. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentification requise' });
    return;
  }
  next();
}

/** Rejette la requête (403) si l'utilisateur n'est pas administrateur. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentification requise' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    return;
  }
  next();
}
