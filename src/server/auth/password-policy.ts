/**
 * Politique de robustesse des mots de passe appliquée côté serveur.
 *
 * Doit rester alignée avec la politique client
 * (`src/app/core/utils/password-policy.ts`). Le serveur ne fait jamais confiance
 * à la validation du client : cette vérification est la garantie de sécurité.
 */

/** Longueur minimale exigée. */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Valide un mot de passe.
 *
 * @returns `null` si le mot de passe est conforme, sinon un message d'erreur.
 */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`;
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir une lettre minuscule';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir une lettre majuscule';
  }
  if (!/\d/.test(password)) {
    return 'Le mot de passe doit contenir un chiffre';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Le mot de passe doit contenir un caractère spécial';
  }
  return null;
}
