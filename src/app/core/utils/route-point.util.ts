import type { AidStation, GpxTrack, RoutePointMarker, RouteWaypoint } from '../models';
import { interpolateAtDistance, type ProcessedTrackPoint } from './gpx.util';

/**
 * Abstraction des **points de passage** du parcours. Un ravitaillement est un
 * point de passage de nature `AID_STATION` ; checkpoints, sommets et points
 * personnalisés (waypoints) partagent la même base positionnelle et le même
 * format de marqueur pour l'affichage sur le profil. La V1 ne câble que les
 * ravitaillements, mais le mapper accepte déjà les waypoints génériques.
 */

/**
 * Convertit un ravitaillement en marqueur de profil. L'altitude est prise sur
 * le ravitaillement si connue, sinon interpolée depuis la trace GPX à sa
 * distance.
 */
export function aidStationToMarker(
  station: AidStation,
  track?: GpxTrack | null,
): RoutePointMarker | null {
  const distance = station.distanceFromStart;
  if (distance == null) {
    return null;
  }
  const point = interpolatePoint(track, distance);
  const altitude = station.altitude ?? point?.ele ?? undefined;
  return {
    id: station.id,
    name: station.name,
    kind: 'AID_STATION',
    distanceFromStart: distance,
    altitude,
    latitude: station.latitude ?? point?.lat ?? undefined,
    longitude: station.longitude ?? point?.lon ?? undefined,
    estimatedDurationFromStart: station.estimatedDurationFromStart,
  };
}

/** Convertit un waypoint générique en marqueur de profil. */
export function waypointToMarker(
  waypoint: RouteWaypoint,
  track?: GpxTrack | null,
): RoutePointMarker | null {
  const distance = waypoint.distanceFromStart;
  if (distance == null) {
    return null;
  }
  const point = interpolatePoint(track, distance);
  const altitude = waypoint.altitude ?? point?.ele ?? undefined;
  return {
    id: waypoint.id,
    name: waypoint.name,
    kind: waypoint.kind,
    distanceFromStart: distance,
    altitude,
    latitude: waypoint.latitude ?? point?.lat ?? undefined,
    longitude: waypoint.longitude ?? point?.lon ?? undefined,
    estimatedDurationFromStart: waypoint.estimatedDurationFromStart,
  };
}

/**
 * Produit la liste unifiée des marqueurs à afficher sur le profil, triée par
 * distance. Le graphique n'a pas à connaître la source (ravitaillement ou
 * waypoint).
 */
export function buildRouteMarkers(
  stations: readonly AidStation[],
  track?: GpxTrack | null,
  waypoints: readonly RouteWaypoint[] = [],
): RoutePointMarker[] {
  const markers: RoutePointMarker[] = [];
  for (const station of stations) {
    const marker = aidStationToMarker(station, track);
    if (marker) markers.push(marker);
  }
  for (const waypoint of waypoints) {
    const marker = waypointToMarker(waypoint, track);
    if (marker) markers.push(marker);
  }
  return markers.sort((a, b) => a.distanceFromStart - b.distanceFromStart);
}

/**
 * Enrichit un ravitaillement à partir de la trace GPX : dérive altitude,
 * D+ cumulé et coordonnées à sa distance depuis le départ. **Non destructif par
 * défaut** : seuls les champs non renseignés sont complétés (un override manuel
 * reste possible). Passer `overwrite: true` pour recalculer tous les champs.
 * Renvoie une copie si des champs ont changé, sinon le ravitaillement d'origine.
 */
export function enrichAidStationFromTrack(
  station: AidStation,
  track: GpxTrack,
  options: { overwrite?: boolean } = {},
): AidStation {
  if (station.distanceFromStart == null) {
    return station;
  }
  const point = interpolateAtDistance(
    track.points as unknown as ProcessedTrackPoint[],
    station.distanceFromStart,
  );
  if (!point) {
    return station;
  }
  const overwrite = options.overwrite ?? false;
  const next: AidStation = { ...station };
  let changed = false;
  if (overwrite || next.latitude == null) {
    next.latitude = point.lat;
    changed = changed || station.latitude !== next.latitude;
  }
  if (overwrite || next.longitude == null) {
    next.longitude = point.lon;
    changed = changed || station.longitude !== next.longitude;
  }
  if (overwrite || next.altitude == null) {
    next.altitude = Math.round(point.ele);
    changed = changed || station.altitude !== next.altitude;
  }
  if (overwrite || next.elevationGainFromStart == null) {
    next.elevationGainFromStart = Math.round(point.elevationGain);
    changed = changed || station.elevationGainFromStart !== next.elevationGainFromStart;
  }
  return changed ? next : station;
}

/** Nature d'un avertissement de cohérence d'un ravitaillement vs la trace. */
export type AidStationWarningType = 'BEYOND_TRACK' | 'DUPLICATE_POSITION';

/** Avertissement de cohérence lié à un ravitaillement. */
export interface AidStationWarning {
  stationId: string;
  name: string;
  type: AidStationWarningType;
}

/**
 * Détecte les incohérences de positionnement des ravitaillements vis-à-vis de
 * la trace : ravitaillement au-delà de la distance totale, ou plusieurs
 * ravitaillements à la même position.
 */
export function validateAidStationsAgainstTrack(
  stations: readonly AidStation[],
  track: GpxTrack,
): AidStationWarning[] {
  const warnings: AidStationWarning[] = [];
  const seen = new Map<number, AidStation>();
  for (const station of stations) {
    const distance = station.distanceFromStart;
    if (distance == null) {
      continue;
    }
    if (distance > track.distance + 0.05) {
      warnings.push({ stationId: station.id, name: station.name, type: 'BEYOND_TRACK' });
    }
    const key = Math.round(distance * 100);
    const previous = seen.get(key);
    if (previous) {
      warnings.push({ stationId: station.id, name: station.name, type: 'DUPLICATE_POSITION' });
    } else {
      seen.set(key, station);
    }
  }
  return warnings;
}

/** Interpole le point de trace (altitude, coordonnées…) à une distance (km). */
function interpolatePoint(
  track: GpxTrack | null | undefined,
  distanceKm: number,
): ProcessedTrackPoint | null {
  if (!track || track.points.length === 0) {
    return null;
  }
  return interpolateAtDistance(track.points as unknown as ProcessedTrackPoint[], distanceKm);
}
