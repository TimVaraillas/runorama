import type { AidStation, AidStationType, AidStationTypeMeta } from '../models';
import { AID_STATION_TYPES } from '../models';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faDroplet,
  faHandshakeAngle,
  faSuitcase,
  faTent,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Valeurs de segment d'un ravitaillement, relatives au ravitaillement
 * précédent. Toujours **calculées** à partir des positions absolues (depuis le
 * départ) et jamais stockées : déplacer, supprimer ou réordonner un
 * ravitaillement n'impose alors aucune maintenance manuelle.
 */
export interface AidStationSegment {
  /** Distance parcourue depuis le ravitaillement précédent (km). */
  distance: number | null;
  /** Dénivelé positif depuis le ravitaillement précédent (m). */
  elevationGain: number | null;
  /** Durée estimée du segment depuis le ravitaillement précédent (minutes). */
  durationMinutes: number;
}

/** Ravitaillement enrichi de son rang et de son segment calculé. */
export interface AidStationView {
  station: AidStation;
  /** Rang dans le parcours (1 = premier ravitaillement). */
  order: number;
  /** Ravitaillement précédent (null pour le premier). */
  previous: AidStation | null;
  /** Valeurs relatives au ravitaillement précédent. */
  segment: AidStationSegment;
}

/**
 * Trie les ravitaillements par position sur le parcours. L'ordre est déterminé
 * automatiquement par la **distance depuis le départ** (clé principale, source
 * de vérité), puis par le temps estimé en cas d'égalité (ou lorsque la distance
 * n'est pas renseignée) — l'utilisateur n'a jamais à ordonner manuellement.
 */
export function sortAidStations(stations: readonly AidStation[]): AidStation[] {
  return [...stations].sort(
    (a, b) =>
      (a.distanceFromStart ?? a.estimatedDurationFromStart) -
        (b.distanceFromStart ?? b.estimatedDurationFromStart) ||
      a.estimatedDurationFromStart - b.estimatedDurationFromStart,
  );
}

/**
 * Calcule la vue ordonnée des ravitaillements avec, pour chacun, le segment
 * relatif au ravitaillement précédent (delta distance / D+ / durée). Le premier
 * segment est relatif au départ.
 */
export function computeAidStationViews(stations: readonly AidStation[]): AidStationView[] {
  const sorted = sortAidStations(stations);
  return sorted.map((station, index) => {
    const previous = index > 0 ? sorted[index - 1]! : null;
    const prevDistance = previous?.distanceFromStart ?? 0;
    const prevElevation = previous?.elevationGainFromStart ?? 0;
    const prevDuration = previous?.estimatedDurationFromStart ?? 0;

    const distance =
      station.distanceFromStart != null
        ? Math.max(0, station.distanceFromStart - prevDistance)
        : null;
    const elevationGain =
      station.elevationGainFromStart != null
        ? Math.max(0, station.elevationGainFromStart - prevElevation)
        : null;
    const durationMinutes = Math.max(0, station.estimatedDurationFromStart - prevDuration);

    return {
      station,
      order: index + 1,
      previous,
      segment: { distance, elevationGain, durationMinutes },
    };
  });
}

/** Métadonnées d'un type de ravitaillement (libellé, tonalité du badge). */
export function aidStationTypeMeta(type: AidStationType): AidStationTypeMeta | undefined {
  return AID_STATION_TYPES.find((meta) => meta.key === type);
}

/** Icône représentant un type de ravitaillement. */
const AID_STATION_TYPE_ICON: Record<AidStationType, IconDefinition> = {
  WATER_POINT: faDroplet,
  FOOD: faUtensils,
  ASSISTANCE: faHandshakeAngle,
  DROP_BAG: faSuitcase,
  BASE_LIFE: faTent,
};

/** Icône d'un type de ravitaillement. */
export function aidStationTypeIcon(type: AidStationType): IconDefinition {
  return AID_STATION_TYPE_ICON[type];
}

/**
 * Icônes des types d'un ravitaillement, dans l'ordre canonique du catalogue
 * (`AID_STATION_TYPES`) plutôt que l'ordre de saisie. Un ravitaillement
 * (`FOOD`) fournit déjà de l'eau : on masque alors l'icône « point d'eau »
 * redondante.
 */
export function aidStationTypeIcons(types: readonly AidStationType[]): IconDefinition[] {
  const set = new Set(types);
  if (set.has('FOOD')) {
    set.delete('WATER_POINT');
  }
  return AID_STATION_TYPES.filter((meta) => set.has(meta.key)).map((meta) =>
    AID_STATION_TYPE_ICON[meta.key],
  );
}

/**
 * Génère un identifiant unique côté client, avec repli si `crypto.randomUUID`
 * n'est pas disponible (SSR/anciens environnements).
 */
export function newLocalId(prefix = 'id'): string {
  const c = globalThis.crypto;
  return c?.randomUUID
    ? c.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Génère un identifiant unique pour un ravitaillement (côté client). */
export function newAidStationId(): string {
  return newLocalId('aid');
}

/** Génère un identifiant unique pour une consommation de ravitaillement. */
export function newAidConsumptionId(): string {
  return newLocalId('cons');
}
