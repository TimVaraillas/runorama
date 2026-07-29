import { Router, type Request, type Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { connectToDatabase } from '../db/mongoose';
import { UserModel } from '../models/user.schema';
import { requireAuth } from '../auth/auth.middleware';
import { validatePassword } from '../auth/password-policy';
import { sendPasswordResetEmail, sendVerificationEmail } from '../email/email.service';
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
  firstName: string;
  lastName: string;
  role: UserRole;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Durée de validité d'un token de réinitialisation (1 heure). */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Durée de validité d'un token de confirmation d'adresse (24 heures). */
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Empreinte SHA-256 (hex) d'un token de réinitialisation. */
function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Empreinte SHA-256 (hex) d'un token de confirmation d'adresse. */
function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** URL de base de l'application (pour construire les liens des e-mails). */
function appBaseUrl(): string {
  return process.env['APP_BASE_URL'] ?? 'http://localhost:4200';
}

/**
 * Crée un token de confirmation, l'enregistre (hash + expiration) sur l'utilisateur
 * puis envoie l'e-mail de confirmation. Le token en clair n'est jamais persisté.
 */
async function issueVerificationEmail(user: {
  email: string;
  set: (field: string, value: unknown) => void;
  save: () => Promise<unknown>;
}): Promise<void> {
  const token = randomBytes(32).toString('hex');
  user.set('emailVerificationTokenHash', hashVerificationToken(token));
  user.set('emailVerificationExpires', new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS));
  await user.save();

  const verificationLink = `${appBaseUrl()}/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, verificationLink);
}

function toPublic(doc: Record<string, unknown>): UserPublic {
  return {
    id: String(doc['_id'] ?? doc['id']),
    email: String(doc['email']),
    firstName: String(doc['firstName'] ?? ''),
    lastName: String(doc['lastName'] ?? ''),
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
    const firstName = String(req.body?.firstName ?? '').trim();
    const lastName = String(req.body?.lastName ?? '').trim();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Adresse e-mail invalide' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    if (!firstName) {
      return res.status(400).json({ message: 'Le prénom est requis' });
    }
    if (!lastName) {
      return res.status(400).json({ message: 'Le nom de famille est requis' });
    }

    const existing = await UserModel.exists({ email });
    if (existing) {
      return res.status(409).json({ message: 'Un compte existe déjà pour cet e-mail' });
    }

    const passwordHash = await hashPassword(password);
    const created = await UserModel.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'user',
      emailVerified: false,
    });

    // Envoi de l'e-mail de confirmation. La connexion reste bloquée tant que
    // l'adresse n'est pas vérifiée : aucun cookie de session n'est posé ici.
    await issueVerificationEmail(created);

    return res.status(201).json({
      message:
        'Compte créé. Un e-mail de confirmation vient de vous être envoyé : ouvrez le lien qu’il contient pour activer votre compte.',
    });
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

    // La connexion n'est autorisée qu'une fois l'adresse e-mail confirmée.
    if (!user.emailVerified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Votre adresse e-mail n’est pas encore confirmée. Consultez l’e-mail de confirmation reçu à l’inscription.',
      });
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

  // Confirmation d'adresse e-mail : vérifie le token (hash + expiration), marque
  // le compte comme vérifié, invalide le token (usage unique) et connecte l'utilisateur.
  router.post('/verify-email', async (req: Request, res: Response) => {
    const token = String(req.body?.token ?? '');
    if (!token) {
      return res.status(400).json({ message: 'Token de confirmation manquant' });
    }

    const user = await UserModel.findOne({
      emailVerificationTokenHash: hashVerificationToken(token),
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ message: 'Lien de confirmation invalide ou expiré' });
    }

    user.set('emailVerified', true);
    user.set('emailVerificationTokenHash', undefined);
    user.set('emailVerificationExpires', undefined);
    await user.save();

    // Connexion automatique après confirmation réussie.
    const authToken = signToken({ sub: String(user._id), role: user.role });
    res.cookie(AUTH_COOKIE, authToken, authCookieOptions());
    return res.status(200).json(toPublic(user.toObject()));
  });

  // Renvoi de l'e-mail de confirmation. Réponse volontairement générique pour ne
  // pas révéler l'existence d'un compte (protection contre l'énumération).
  router.post('/resend-verification', async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const genericMessage =
      'Si un compte non confirmé est associé à cette adresse, un nouvel e-mail de confirmation vient d’être envoyé.';

    if (!EMAIL_RE.test(email)) {
      return res.status(200).json({ message: genericMessage });
    }

    const user = await UserModel.findOne({ email });
    if (user && !user.emailVerified) {
      await issueVerificationEmail(user);
    }

    return res.status(200).json({ message: genericMessage });
  });

  // Demande de réinitialisation de mot de passe.
  // Réponse volontairement générique afin de ne pas révéler l'existence d'un compte
  // (protection contre l'énumération d'utilisateurs).
  router.post('/forgot-password', async (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const genericMessage =
      'Si un compte est associé à cette adresse, un lien de réinitialisation vient d’être envoyé.';

    if (!EMAIL_RE.test(email)) {
      // On renvoie tout de même un message générique pour ne pas divulguer d'information.
      return res.status(200).json({ message: genericMessage });
    }

    const user = await UserModel.findOne({ email });
    if (user) {
      // Token aléatoire à usage unique : seul son hash est stocké, jamais le token en clair.
      const token = randomBytes(32).toString('hex');
      user.set('resetPasswordTokenHash', hashResetToken(token));
      user.set('resetPasswordExpires', new Date(Date.now() + RESET_TOKEN_TTL_MS));
      await user.save();

      // Envoi de l'e-mail de réinitialisation (Resend, ou repli console en dev).
      const baseUrl = process.env['APP_BASE_URL'] ?? 'http://localhost:4200';
      const resetLink = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetLink);
    }

    return res.status(200).json({ message: genericMessage });
  });

  // Réinitialisation effective : vérifie le token (hash + expiration) et pose le nouveau mot de passe.
  router.post('/reset-password', async (req: Request, res: Response) => {
    const token = String(req.body?.token ?? '');
    const password = String(req.body?.password ?? '');

    if (!token) {
      return res.status(400).json({ message: 'Token de réinitialisation manquant' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await UserModel.findOne({
      resetPasswordTokenHash: hashResetToken(token),
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Lien de réinitialisation invalide ou expiré' });
    }

    // Nouveau hash + invalidation du token (usage unique).
    user.set('passwordHash', await hashPassword(password));
    user.set('resetPasswordTokenHash', undefined);
    user.set('resetPasswordExpires', undefined);
    await user.save();

    return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
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
