/**
 * Domaine : allures de course.
 * Une allure est exprimée en secondes par kilomètre (sec/km),
 * ce qui simplifie les calculs et l'export vers les montres Garmin.
 */
export interface Pace {
  /** Allure en secondes par kilomètre (ex: 300 = 5:00 min/km). */
  secondsPerKm: number;
}

/** Zones d'intensité utilisées pour colorer et cibler l'effort. */
export type IntensityZone =
  | 'easy'
  | 'endurance'
  | 'tempo'
  | 'threshold'
  | 'vo2'
  | 'anaerobic'
  | 'recovery';

/** Type de cible d'un bloc de travail. */
export type TargetType = 'pace' | 'heartRate' | 'cadence' | 'open';

/** Unité de durée d'un bloc. */
export type DurationType = 'distance' | 'time' | 'lapButton';

/** Rôle d'un pas dans la séance (aligné sur le vocabulaire Garmin). */
export type StepIntent =
  | 'warmup'
  | 'active'
  | 'recovery'
  | 'rest'
  | 'cooldown'
  | 'interval';

/**
 * Cible d'effort d'un bloc de travail.
 * Selon `type`, on utilise une plage d'allure (sec/km), de FC (bpm) ou de cadence (spm).
 */
export interface StepTarget {
  type: TargetType;
  zone?: IntensityZone;
  /** Borne basse (allure la plus lente / FC la plus basse). */
  from?: number;
  /** Borne haute (allure la plus rapide / FC la plus haute). */
  to?: number;
}

/**
 * Un pas simple : bloc de travail élémentaire d'une séance.
 */
export interface WorkoutStep {
  id: string;
  kind: 'step';
  intent: StepIntent;
  durationType: DurationType;
  /** Mètres si `durationType === 'distance'`, secondes si `'time'`. */
  durationValue?: number;
  target: StepTarget;
  notes?: string;
}

/**
 * Un bloc répété : contient une liste de pas exécutés `repeat` fois.
 */
export interface WorkoutRepeat {
  id: string;
  kind: 'repeat';
  repeat: number;
  steps: WorkoutStep[];
}

/** Élément de séance : soit un pas simple, soit un bloc répété. */
export type WorkoutElement = WorkoutStep | WorkoutRepeat;

/** Sport ciblé (Garmin supporte plusieurs sports, on se concentre sur la course). */
export type SportType = 'running' | 'trail' | 'treadmill';

/**
 * Une séance complète, exportable au format Garmin.
 */
export interface Workout {
  id: string;
  name: string;
  description?: string;
  sport: SportType;
  elements: WorkoutElement[];
  /** Distance totale estimée en mètres. */
  estimatedDistanceMeters?: number;
  /** Durée totale estimée en secondes. */
  estimatedDurationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}
