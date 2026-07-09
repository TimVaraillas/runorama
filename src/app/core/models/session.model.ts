/**
 * Domaine : séances de course à pied.
 *
 * Une séance (`Session`) est composée de blocs (`SessionBlock`), chaque bloc
 * étant répété `repeat` fois et contenant une liste d'exercices (`Exercise`).
 */

/** Zones d'intensité utilisées pour colorer et cibler l'effort (usage UI). */
export type IntensityZone =
  | 'easy'
  | 'endurance'
  | 'tempo'
  | 'threshold'
  | 'vo2'
  | 'anaerobic'
  | 'recovery';

/** Valeur de cible : soit une valeur unique, soit une plage [min, max]. */
export type RangeValue = number | [number, number];

/**
 * Cible d'effort d'un exercice.
 * Tous les champs sont facultatifs ; on renseigne ceux qui font sens.
 */
export interface ExerciseTarget {
  /** Libellé d'intensité (ex: "Endurance fondamentale", "Zone 3"). */
  intensity?: string;
  /** Vitesse cible en km/h (valeur unique ou plage min/max). */
  pace?: RangeValue;
  /** Fréquence cardiaque cible en battements/min (valeur unique ou plage). */
  pulse?: RangeValue;
  /** Numéro de zone (1 à 5). */
  zone?: number;
}

/**
 * Un exercice élémentaire d'un bloc.
 * `duration` (secondes) et `distance` (mètres) sont exclusifs : au moins un
 * des deux doit être renseigné.
 */
export interface Exercise {
  /** Instruction textuelle facultative. */
  instruction?: string;
  /** Durée en secondes (exclusif avec `distance`). */
  duration?: number;
  /** Distance en mètres (exclusif avec `duration`). */
  distance?: number;
  /** Cible d'effort facultative. */
  target?: ExerciseTarget;
}

/** Un bloc de la séance, répété `repeat` fois. */
export interface SessionBlock {
  name: string;
  description?: string;
  /** Nombre de répétitions du bloc (>= 1). */
  repeat: number;
  exercises: Exercise[];
}

/** Une séance complète, composée de blocs d'exercices. */
export interface Session {
  id: string;
  name: string;
  description?: string;
  blocks: SessionBlock[];
  createdAt?: string;
  updatedAt?: string;
}
