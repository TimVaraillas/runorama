import { Router, type Request, type Response } from 'express';
import { connectToDatabase } from '../db/mongoose';
import { UserModel } from '../models/user.schema';
import { requireAuth } from '../auth/auth.middleware';
import {
  AUTH_COOKIE,
  authCookieOptions,
  comparePassword,
  hashPassword,
  signToken,
  type UserRole,
} from '../auth/auth.util';

interface UserPublic {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublic(doc: Record<string, unknown>): UserPublic {
  return {
    id: String(doc['_id'] ?? doc['id']),
    email: String(doc['email']),
    displayName: (doc['displayName'] as string | undefined) ?? undefined,
    role: (doc['role'] as UserRole) ?? 'user',
  };
}

/**
 * Router d'authentification, monté sur `/api/auth` (voir server.ts).
 */
export function createAuthRouter(): Router {
  const router = Router();

  router.use(async (_req, _res, next) => {
    try {
      await connectToDatabase();
      next();
    } catch (error) {
      next(error);
    }
  });

  // Inscription libre : crée un utilisateur avec le rôle `user`.
  router.post('/register', async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const displayName = String(req.body?.displayName ?? '').trim() || undefined;

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Adresse e-mail invalide' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const existing = await UserModel.exists({ email });
    if (existing) {
      return res.status(409).json({ message: 'Un compte existe déjà pour cet e-mail' });
    }

    const passwordHash = await hashPassword(password);
    const created = await UserModel.create({ email, passwordHash, displayName, role: 'user' });

    const token = signToken({ sub: String(created._id), role: created.role });
    res.cookie(AUTH_COOKIE, token, authCookieOptions());
    return res.status(201).json(toPublic(created.toObject()));
  });

  // Connexion : vérifie les identifiants et pose le cookie.
  router.post('/login', async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'E-mail ou mot de passe incorrect' });
    }
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'E-mail ou mot de passe incorrect' });
    }

    const token = signToken({ sub: String(user._id), role: user.role });
    res.cookie(AUTH_COOKIE, token, authCookieOptions());
    return res.json(toPublic(user.toObject()));
  });

  // Déconnexion : efface le cookie.
  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(), maxAge: undefined });
    return res.status(204).end();
  });

  // Utilisateur courant.
  router.get('/me', requireAuth, async (req: Request, res: Response) => {
    const user = await UserModel.findById(req.user!.id).lean();
    if (!user) {
      return res.status(401).json({ message: 'Authentification requise' });
    }
    return res.json(toPublic(user as Record<string, unknown>));
  });

  return router;
}
