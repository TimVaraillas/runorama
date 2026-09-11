/**
 * Génération d'un fichier **GPX** (parcours réel + points d'intérêt) — **fonction
 * pure**, sans dépendance Angular, DOM ou Mongoose. Partagée : le serveur
 * l'utilise pour l'export téléchargeable ; le client pourrait la réutiliser.
 *
 * Le document produit combine la trace (`<trk>`) et les points d'intérêt
 * (`<wpt>`) : ravitaillements et points de passage. Les coordonnées manquantes
 * d'un point sont interpolées sur la trace à partir de sa distance depuis le
 * départ (source de vérité du positionnement).
 */

import type { AidStationType, RoutePointKind } from '../models';
import { interpolateAtDistance, type ProcessedTrackPoint } from './gpx.util';

/** Point d'intérêt à exporter (ravitaillement ou point de passage). */
export interface GpxExportWaypoint {
  name: string;
  kind: RoutePointKind;
  /** Distance depuis le départ (km) — sert à interpoler les coordonnées. */
  distanceFromStart?: number;
  latitude?: number;
  longitude?: number;
  /** Altitude (m). */
  altitude?: number;
  /** Temps de passage estimé depuis le départ (minutes). */
  estimatedDurationFromStart?: number;
  /** Types de ravitaillement (pour un `AID_STATION`), à des fins descriptives. */
  aidStationTypes?: AidStationType[];
}

/** Paramètres de génération du document GPX. */
export interface BuildGpxOptions {
  /** Nom de l'évènement (métadonnées + nom de la trace). */
  name: string;
  /** Points pleine résolution de la trace, triés par distance croissante. */
  points: readonly ProcessedTrackPoint[];
  /** Points d'intérêt à matérialiser en `<wpt>`. */
  waypoints: readonly GpxExportWaypoint[];
  /** Ajoute le temps de passage estimé dans la description du point. */
  includeEstimatedTime?: boolean;
}

/** Libellé lisible d'une nature de point (pour la balise `<type>`). */
const KIND_LABELS: Record<RoutePointKind, string> = {
  AID_STATION: 'Ravitaillement',
  CHECKPOINT: 'Checkpoint',
  SUMMIT: 'Sommet',
  CUSTOM: 'Point de passage',
};

/** Libellé lisible d'un type de ravitaillement (pour la description). */
const AID_TYPE_LABELS: Record<AidStationType, string> = {
  WATER_POINT: "Point d'eau",
  FOOD: 'Nourriture',
  ASSISTANCE: 'Assistance',
  DROP_BAG: 'Drop bag',
  BASE_LIFE: 'Base vie',
};

/** Échappe les caractères réservés du XML dans une valeur texte. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Formate un nombre avec un nombre fixe de décimales, sans notation exponentielle. */
function fixed(value: number, decimals: number): string {
  return Number(value).toFixed(decimals);
}

/** Formate un temps cumulé (minutes) en `HH:MM`. */
function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Résout les coordonnées d'un point d'intérêt : privilégie les valeurs saisies,
 * sinon interpole sur la trace à partir de la distance. Renvoie `null` si aucune
 * position n'est exploitable.
 */
function resolveCoordinates(
  wpt: GpxExportWaypoint,
  points: readonly ProcessedTrackPoint[],
): { lat: number; lon: number; ele?: number } | null {
  if (wpt.latitude != null && wpt.longitude != null) {
    return { lat: wpt.latitude, lon: wpt.longitude, ele: wpt.altitude ?? undefined };
  }
  if (wpt.distanceFromStart == null) {
    return null;
  }
  const point = interpolateAtDistance(points, wpt.distanceFromStart);
  if (!point) {
    return null;
  }
  return { lat: point.lat, lon: point.lon, ele: wpt.altitude ?? point.ele };
}

/** Construit le corps `<desc>` d'un point d'intérêt (types + temps estimé). */
function buildDescription(wpt: GpxExportWaypoint, includeTime: boolean): string {
  const parts: string[] = [];
  if (wpt.aidStationTypes?.length) {
    const labels = wpt.aidStationTypes.map((t) => AID_TYPE_LABELS[t] ?? t);
    parts.push(labels.join(', '));
  }
  if (includeTime && wpt.estimatedDurationFromStart != null) {
    parts.push(`Passage estimé : ${formatDuration(wpt.estimatedDurationFromStart)}`);
  }
  return parts.join(' — ');
}

/** Sérialise un point d'intérêt en balise `<wpt>` (chaîne vide si non positionnable). */
function serializeWaypoint(
  wpt: GpxExportWaypoint,
  points: readonly ProcessedTrackPoint[],
  includeTime: boolean,
): string {
  const coords = resolveCoordinates(wpt, points);
  if (!coords) {
    return '';
  }
  const lines: string[] = [
    `  <wpt lat="${fixed(coords.lat, 6)}" lon="${fixed(coords.lon, 6)}">`,
  ];
  if (coords.ele != null) {
    lines.push(`    <ele>${fixed(coords.ele, 1)}</ele>`);
  }
  lines.push(`    <name>${escapeXml(wpt.name)}</name>`);
  lines.push(`    <type>${escapeXml(KIND_LABELS[wpt.kind] ?? 'Point')}</type>`);
  const desc = buildDescription(wpt, includeTime);
  if (desc) {
    lines.push(`    <desc>${escapeXml(desc)}</desc>`);
  }
  lines.push('  </wpt>');
  return lines.join('\n');
}

/**
 * Construit un document GPX 1.1 combinant la trace et les points d'intérêt.
 * La trace est écrite en pleine résolution ; chaque point d'intérêt positionnable
 * devient un `<wpt>` (les points sans coordonnées ni distance sont ignorés).
 */
export function buildGpxDocument(options: BuildGpxOptions): string {
  const { name, points, waypoints, includeEstimatedTime = true } = options;

  const waypointXml = waypoints
    .map((w) => serializeWaypoint(w, points, includeEstimatedTime))
    .filter((s) => s.length > 0)
    .join('\n');

  const trackPointsXml = points
    .map(
      (p) =>
        `      <trkpt lat="${fixed(p.lat, 6)}" lon="${fixed(p.lon, 6)}"><ele>${fixed(p.ele, 1)}</ele></trkpt>`,
    )
    .join('\n');

  const safeName = escapeXml(name || 'Parcours');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Runorama" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
    '  <metadata>',
    `    <name>${safeName}</name>`,
    '  </metadata>',
    waypointXml,
    '  <trk>',
    `    <name>${safeName}</name>`,
    '    <trkseg>',
    trackPointsXml,
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}
