import {
  NUTRIENT_GOALS,
  type NutrientGoalKey,
  type NutritionEvent,
  type NutritionGoal,
  type NutritionGoals,
} from '../models';

/**
 * Objectif nutritionnel résolu, prêt à l'affichage (métadonnées + valeur).
 */
export interface ResolvedGoal {
  key: NutrientGoalKey;
  label: string;
  unit: string;
  /** Mode de comptabilisation (`hourly` = besoin horaire, `total` = cible unique). */
  mode: 'hourly' | 'total';
  hourly: number;
}

/**
 * Forme héritée d'un évènement, antérieure au modèle `goals` (objectifs
 * limités à l'énergie et aux glucides). Conservée pour lire sans migration
 * les stratégies existantes.
 */
type LegacyEvent = { hourlyEnergy?: number; hourlyCarbs?: number };

/** Construit un jeu d'objectifs par défaut (valeurs et activation du catalogue). */
export function createDefaultGoals(): NutritionGoals {
  return NUTRIENT_GOALS.reduce((acc, meta) => {
    acc[meta.key] = { hourly: meta.defaultHourly, enabled: meta.defaultEnabled };
    return acc;
  }, {} as NutritionGoals);
}

/**
 * Normalise les objectifs d'un évènement : complète les nutriments manquants
 * avec leurs valeurs par défaut et retombe, le cas échéant, sur les anciens
 * champs `hourlyEnergy` / `hourlyCarbs` (stratégies non migrées).
 */
export function resolveGoals(event: NutritionEvent): NutritionGoals {
  const legacy = event as NutritionEvent & LegacyEvent;
  const source = event.goals;
  return NUTRIENT_GOALS.reduce((acc, meta) => {
    const existing = source?.[meta.key];
    if (existing) {
      acc[meta.key] = { hourly: existing.hourly, enabled: existing.enabled };
    } else if (meta.key === 'energy' && legacy.hourlyEnergy != null) {
      acc[meta.key] = { hourly: legacy.hourlyEnergy, enabled: true };
    } else if (meta.key === 'carbs' && legacy.hourlyCarbs != null) {
      acc[meta.key] = { hourly: legacy.hourlyCarbs, enabled: true };
    } else {
      acc[meta.key] = { hourly: meta.defaultHourly, enabled: meta.defaultEnabled };
    }
    return acc;
  }, {} as NutritionGoals);
}

/**
 * Liste, dans l'ordre du catalogue, les objectifs actifs d'un évènement avec
 * leurs métadonnées d'affichage.
 */
export function enabledGoals(event: NutritionEvent): ResolvedGoal[] {
  const goals = resolveGoals(event);
  return NUTRIENT_GOALS.filter((meta) => goals[meta.key]?.enabled).map((meta) => ({
    key: meta.key,
    label: meta.label,
    unit: meta.unit,
    mode: meta.mode,
    hourly: goals[meta.key].hourly,
  }));
}

/**
 * Objectifs actifs à comptabilisation horaire (exclut les objectifs « total »
 * comme le poids). Utilisé pour les récaps horaires (plan, PDF).
 */
export function enabledHourlyGoals(event: NutritionEvent): ResolvedGoal[] {
  return enabledGoals(event).filter((goal) => goal.mode === 'hourly');
}

/** Indique si au moins un objectif est actif. */
export function hasEnabledGoals(goals: NutritionGoals): boolean {
  return NUTRIENT_GOALS.some((meta) => goals[meta.key]?.enabled);
}

/** Réexport pratique pour les composants consommateurs. */
export type { NutritionGoal };
