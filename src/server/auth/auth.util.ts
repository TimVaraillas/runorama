import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/** Rôle applicatif d'un utilisateur. */
export type UserRole = 'user' | 'admin';

/** Charge utile encodée dans le JWT. */
export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
}

/** Nom du cookie HttpOnly contenant le JWT. */
export const AUTH_COOKIE = 'runorama_token';

/** Durée de validité du token (7 jours). */
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    // En développement on tolère un secret par défaut ; en production il DOIT être défini.
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('JWT_SECRET est requis en production');
    }
    return 'dev-insecure-secret-change-me';
  }
  return secret;
}

/** Hache un mot de passe en clair. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/** Compare un mot de passe en clair à son hash. */
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Signe un JWT pour l'utilisateur donné. */
export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}

/** Vérifie un JWT et renvoie sa charge utile, ou `null` si invalide. */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === 'object' && decoded && 'sub' in decoded && 'role' in decoded) {
      return { sub: String(decoded.sub), role: (decoded as { role: UserRole }).role };
    }
    return null;
  } catch {
    return null;
  }
}

/** Options communes du cookie d'authentification. */
export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  };
}
