/**
 * Modèles de la **trace GPX** (parcours réel) et de l'abstraction générique des
 * **points de passage** du parcours.
 *
 * Séparation des données : la trace GPX décrit le parcours réel et ne doit pas
 * être mêlée au plan de course (temps de passage, arrêts, nutrition) ni à la
 * future réalité de course.
 */

import type { AidStationType } from './nutrition.model';

/** Un point de la trace pour l'affichage du profil (valeurs cumulées). */
export interface GpxTrackPoint {
  lat: number;
  lon: number;
  /** Altitude (m). */
  ele: number;
  /** Distance cumulée depuis le départ (km). */
  distance: number;
  /** Dénivelé positif cumulé depuis le départ (m). */
  elevationGain: number;
  /** Dénivelé négatif cumulé depuis le départ (m). */
  elevationLoss: number;
}

/** Rectangle englobant de la trace. */
export interface GpxBounds {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/**
 * Trace GPX telle qu'exposée au client : totaux, bounding box et points
 * **simplifiés** (rendu du profil). La pleine résolution et le fichier brut
 * restent côté serveur.
 */
export interface GpxTrack {
  id: string;
  eventId: string;
  fileName?: string | null;
  /** Distance totale (km). */
  distance: number;
  /** Dénivelé positif total (m). */
  elevationGain: number;
  /** Dénivelé négatif total (m). */
  elevationLoss: number;
  /** Altitude minimale (m). */
  minAltitude: number;
  /** Altitude maximale (m). */
  maxAltitude: number;
  /** Nombre de points pleine résolution. */
  pointCount: number;
  bbox: GpxBounds;
  /** Points simplifiés pour l'affichage. */
  points: GpxTrackPoint[];
}

/** Écart entre une valeur GPX et la valeur saisie dans l'évènement. */
export interface GpxDiscrepancy {
  /** Valeur issue du GPX. */
  gpx: number;
  /** Valeur saisie dans l'évènement. */
  event: number;
  /** Écart relatif en pourcentage (positif = GPX supérieur). */
  deltaPct: number;
}

/** Écarts détectés à l'import, par grandeur (null si non comparable). */
export interface GpxDiscrepancies {
  distance: GpxDiscrepancy | null;
  elevationGain: GpxDiscrepancy | null;
  elevationLoss: GpxDiscrepancy | null;
}

/** Réponse de l'import d'une trace GPX. */
export interface GpxUploadResult {
  track: GpxTrack;
  discrepancies: GpxDiscrepancies;
}

/**
 * Nature d'un point de passage. Abstraction commune : un ravitaillement est un
 * point de passage de nature `AID_STATION`.
 */
export type RoutePointKind = 'AID_STATION' | 'CHECKPOINT' | 'SUMMIT' | 'CUSTOM';

/**
 * Base positionnelle partagée par tout point de passage. La distance depuis le
 * départ reste la source de vérité ; les coordonnées et l'altitude peuvent être
 * dérivées du GPX ou saisies pour un positionnement précis.
 */
export interface RoutePointPosition {
  /** Distance depuis le départ (km). */
  distanceFromStart?: number;
  /** Latitude (degrés). */
  latitude?: number;
  /** Longitude (degrés). */
  longitude?: number;
  /** Altitude (m). */
  altitude?: number;
  /** Dénivelé positif cumulé depuis le départ (m). */
  elevationGainFromStart?: number;
}

/**
 * Point de passage générique léger (checkpoint, sommet, point personnalisé).
 * Posé pour une évolution ultérieure : la V1 ne câble que les ravitaillements.
 */
export interface RouteWaypoint extends RoutePointPosition {
  id: string;
  name: string;
  kind: Exclude<RoutePointKind, 'AID_STATION'>;
  /** Temps de passage cible depuis le départ (minutes), facultatif. */
  estimatedDurationFromStart?: number;
}

/**
 * Marqueur unifié affiché sur le profil altimétrique **et** sur le tracé
 * (carte). Produit par un mapper à partir des ravitaillements (et, à terme, des
 * waypoints) : les vues ignorent la source des points.
 */
export interface RoutePointMarker {
  id: string;
  name: string;
  kind: RoutePointKind;
  /** Distance depuis le départ (km). */
  distanceFromStart: number;
  /** Altitude au point (m), si connue. */
  altitude?: number;
  /** Latitude (degrés), si connue — pour le positionnement sur le tracé. */
  latitude?: number;
  /** Longitude (degrés), si connue — pour le positionnement sur le tracé. */
  longitude?: number;
  /** Temps de passage cible depuis le départ (minutes), si défini. */
  estimatedDurationFromStart?: number;
  /** Types de ravitaillement (point d'eau, nourriture…), pour un `AID_STATION`. */
  aidStationTypes?: AidStationType[];
}
