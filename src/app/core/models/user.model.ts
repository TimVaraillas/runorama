/** Rôle applicatif d'un utilisateur. */
export type UserRole = 'user' | 'admin';

/** Représentation publique d'un utilisateur authentifié. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/** Charge utile d'inscription. */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Charge utile de connexion. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Charge utile d'une demande de réinitialisation de mot de passe. */
export interface ForgotPasswordPayload {
  email: string;
}

/** Charge utile de réinitialisation effective du mot de passe. */
export interface ResetPasswordPayload {
  token: string;
  password: string;
}

/** Réponse générique porteuse d'un message d'information. */
export interface MessageResponse {
  message: string;
}

/** Charge utile de confirmation d'adresse e-mail. */
export interface VerifyEmailPayload {
  token: string;
}

/** Charge utile de renvoi de l'e-mail de confirmation. */
export interface ResendVerificationPayload {
  email: string;
}
