import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Politique de mot de passe partagée par l'application.
 *
 * Un mot de passe robuste doit respecter TOUTES les règles ci-dessous.
 * Ce module est la source de vérité côté client ; une politique équivalente
 * est appliquée côté serveur (`src/server/auth/password-policy.ts`).
 */

/** Longueur minimale exigée. */
export const PASSWORD_MIN_LENGTH = 12;

/** Une règle de robustesse unitaire, évaluable en direct. */
export interface PasswordRule {
  /** Identifiant technique stable. */
  id: string;
  /** Libellé lisible affiché à l'utilisateur. */
  label: string;
  /** Prédicat : vrai si la règle est respectée. */
  test: (value: string) => boolean;
}

/** Ensemble ordonné des règles de robustesse. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'lowercase', label: 'Une lettre minuscule', test: (v) => /[a-z]/.test(v) },
  { id: 'uppercase', label: 'Une lettre majuscule', test: (v) => /[A-Z]/.test(v) },
  { id: 'digit', label: 'Un chiffre', test: (v) => /\d/.test(v) },
  {
    id: 'special',
    label: 'Un caractère spécial (!?@#…)',
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

/** Niveau de robustesse global d'un mot de passe. */
export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

/** Résultat d'évaluation d'un mot de passe pour un affichage réactif. */
export interface PasswordEvaluation {
  /** Nombre de règles satisfaites. */
  satisfied: number;
  /** Nombre total de règles. */
  total: number;
  /** Vrai si toutes les règles sont respectées. */
  valid: boolean;
  /** Niveau global (pour la jauge). */
  strength: PasswordStrength;
}

/** Évalue un mot de passe au regard de la politique. */
export function evaluatePassword(value: string): PasswordEvaluation {
  const total = PASSWORD_RULES.length;
  if (!value) {
    return { satisfied: 0, total, valid: false, strength: 'empty' };
  }
  const satisfied = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  const valid = satisfied === total;
  let strength: PasswordStrength;
  if (valid) {
    strength = 'strong';
  } else if (satisfied >= 3) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }
  return { satisfied, total, valid, strength };
}

/**
 * Validateur Angular : échoue tant que toutes les règles ne sont pas respectées.
 * Retourne `{ passwordStrength: { unmet: string[] } }` le cas échéant.
 */
export const passwordStrengthValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) {
    return null; // La règle `required` gère l'absence de valeur.
  }
  const unmet = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.id);
  return unmet.length ? { passwordStrength: { unmet } } : null;
};
