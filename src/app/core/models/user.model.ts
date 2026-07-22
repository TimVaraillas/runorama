/** Rôle applicatif d'un utilisateur. */
export type UserRole = 'user' | 'admin';

/** Représentation publique d'un utilisateur authentifié. */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
}

/** Charge utile d'inscription. */
export interface RegisterPayload {
  email: string;
  password: string;
  displayName?: string;
}

/** Charge utile de connexion. */
export interface LoginPayload {
  email: string;
  password: string;
}
