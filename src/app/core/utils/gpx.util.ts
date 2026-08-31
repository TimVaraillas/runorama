/**
 * Algorithmes de traitement d'une trace GPX — **fonctions pures**, sans
 * dépendance Angular, DOM ou Mongoose. Ce module est la source de vérité
 * partagée : le serveur l'utilise à l'import (parsing + calculs + stockage) et
 * le client peut le réutiliser (interpolation, simplification à l'affichage).
 *
 * Le calcul du dénivelé prend en compte le bruit GPS : l'altitude est lissée
 * (moyenne glissante) puis le D+/D- est accumulé avec un seuil d'hystérésis, de
 * façon à ne pas additionner les micro-variations parasites (voir
 * {@link accumulateElevation}).
 */

/** Code d'erreur de traitement d'une trace GPX (cas particuliers à gérer). */
export type GpxErrorCode = 'EMPTY' | 'INVALID' | 'NO_TRACKPOINTS' | 'NO_ALTITUDE';

/** Erreur typée levée lorsqu'une trace GPX ne peut pas être traitée. */
export class GpxError extends Error {
  constructor(
    readonly code: GpxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GpxError';
  }
}

/** Point brut extrait du GPX (altitude éventuellement absente). */
export interface RawTrackPoint {
  lat: number;
  lon: number;
  ele: number | null;
}

/** Point de trace traité : coordonnées + valeurs cumulées depuis le départ. */
export interface ProcessedTrackPoint {
  lat: number;
  lon: number;
  /** Altitude lissée (m). */
  ele: number;
  /** Distance cumulée depuis le départ (km). */
  distance: number;
  /** Dénivelé positif cumulé depuis le départ (m). */
  elevationGain: number;
  /** Dénivelé négatif cumulé depuis le départ (m). */
  elevationLoss: number;
}

/** Totaux d'une trace traitée. */
export interface GpxTotals {
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
  /** Nombre de points de la trace pleine résolution. */
  pointCount: number;
}

/** Rectangle englobant (bounding box) de la trace. */
export interface GpxBounds {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

/** Résultat complet du traitement d'une trace GPX. */
export interface GpxProcessingResult {
  points: ProcessedTrackPoint[];
  totals: GpxTotals;
  bbox: GpxBounds;
}

/** Paramètres du modèle de lissage/accumulation (isolés pour évoluer). */
export interface GpxProcessingOptions {
  /**
   * Taille de la fenêtre de moyenne glissante (nombre de points, impair de
   * préférence) appliquée à l'altitude avant le calcul du dénivelé.
   */
  smoothingWindow: number;
  /**
   * Seuil d'hystérésis (m) : une variation d'altitude lissée doit dépasser ce
   * seuil pour être comptabilisée en D+/D-. Neutralise le bruit GPS.
   */
  elevationThreshold: number;
}

/** Réglages par défaut du traitement du dénivelé (documentés et ajustables). */
export const DEFAULT_GPX_OPTIONS: GpxProcessingOptions = {
  smoothingWindow: 3,
  elevationThreshold: 2,
};

const EARTH_RADIUS_M = 6_371_000;

/** Convertit des degrés en radians. */
function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distance orthodromique entre deux points GPS (formule de Haversine), en
 * mètres.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Extrait les points de trace (`<trkpt>`) d'un contenu GPX. Parsing tolérant
 * sans dépendance : on isole chaque `<trkpt>` puis on lit `lat`, `lon` et, si
 * présent, l'altitude `<ele>`. Les informations temporelles (`<time>`) sont
 * **volontairement ignorées** (on ne conserve pas les données de temps du GPX).
 *
 * @throws {GpxError} `EMPTY` si le contenu est vide, `INVALID` si ce n'est pas
 * un GPX, `NO_TRACKPOINTS` si aucun point de trace n'est trouvé.
 */
export function parseGpx(xml: string): RawTrackPoint[] {
  if (!xml || !xml.trim()) {
    throw new GpxError('EMPTY', 'Le fichier GPX est vide.');
  }
  if (!/<gpx[\s>]/i.test(xml)) {
    throw new GpxError('INVALID', "Le fichier n'est pas un GPX valide.");
  }

  // On segmente sur chaque balise d'ouverture `<trkpt` : chaque tronçon contient
  // les attributs du point puis son `<ele>` éventuel, avant le point suivant.
  const chunks = xml.split(/<trkpt\b/i);
  const points: RawTrackPoint[] = [];
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const lat = readAttr(chunk, 'lat');
    const lon = readAttr(chunk, 'lon');
    if (lat === null || lon === null) {
      continue;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      continue;
    }
    const eleMatch = /<ele>\s*(-?\d+(?:\.\d+)?)\s*<\/ele>/i.exec(chunk);
    const ele = eleMatch ? Number.parseFloat(eleMatch[1]!) : null;
    points.push({ lat, lon, ele: ele !== null && Number.isFinite(ele) ? ele : null });
  }

  if (points.length === 0) {
    throw new GpxError('NO_TRACKPOINTS', 'Le GPX ne contient aucun point de trace.');
  }
  return points;
}

/** Lit un attribut numérique (`lat`/`lon`) d'un tronçon de balise `<trkpt>`. */
function readAttr(chunk: string, name: string): number | null {
  const match =
    new RegExp(`\\b${name}\\s*=\\s*"([^"]+)"`, 'i').exec(chunk) ??
    new RegExp(`\\b${name}\\s*=\\s*'([^']+)'`, 'i').exec(chunk);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[1]!);
  return Number.isFinite(value) ? value : null;
}

/**
 * Complète les altitudes manquantes par interpolation linéaire entre les points
 * connus (report en bord de trace). Lève `NO_ALTITUDE` si aucune altitude n'est
 * présente sur toute la trace.
 */
export function fillMissingElevations(points: readonly RawTrackPoint[]): number[] {
  const eles = points.map((p) => p.ele);
  if (eles.every((e) => e === null)) {
    throw new GpxError('NO_ALTITUDE', "La trace GPX ne contient pas d'altitude.");
  }
  const out = eles.slice() as (number | null)[];
  // Report avant : chaque trou prend la dernière altitude connue.
  let last: number | null = null;
  for (let i = 0; i < out.length; i++) {
    if (out[i] === null) {
      out[i] = last;
    } else {
      last = out[i]!;
    }
  }
  // Report arrière pour les trous initiaux (avant la première altitude connue).
  let next: number | null = null;
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] === null) {
      out[i] = next;
    } else {
      next = out[i]!;
    }
  }
  return out.map((e) => e ?? 0);
}

/**
 * Moyenne glissante centrée sur l'altitude — atténue le bruit GPS avant le
 * calcul du dénivelé. Une fenêtre `<= 1` renvoie les valeurs inchangées.
 */
export function movingAverage(values: readonly number[], window: number): number[] {
  if (window <= 1 || values.length === 0) {
    return values.slice();
  }
  const half = Math.floor(window / 2);
  const out = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = start; j <= end; j++) {
      sum += values[j]!;
    }
    out[i] = sum / (end - start + 1);
  }
  return out;
}

/**
 * Accumule le D+/D- cumulés à partir d'altitudes lissées, avec un seuil
 * d'hystérésis : on ne comptabilise une montée (ou une descente) que lorsque
 * l'écart avec l'altitude de référence dépasse `threshold`, puis on déplace la
 * référence. Les micro-oscillations sous le seuil (bruit) sont ignorées.
 */
export function accumulateElevation(
  smoothed: readonly number[],
  threshold: number,
): { gain: number[]; loss: number[] } {
  const gain = new Array<number>(smoothed.length).fill(0);
  const loss = new Array<number>(smoothed.length).fill(0);
  if (smoothed.length === 0) {
    return { gain, loss };
  }
  let reference = smoothed[0]!;
  let totalGain = 0;
  let totalLoss = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const delta = smoothed[i]! - reference;
    if (delta >= threshold) {
      totalGain += delta;
      reference = smoothed[i]!;
    } else if (delta <= -threshold) {
      totalLoss += -delta;
      reference = smoothed[i]!;
    }
    gain[i] = totalGain;
    loss[i] = totalLoss;
  }
  return { gain, loss };
}

/** Arrondit à `digits` décimales (évite les longues traînées flottantes). */
function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Traite une trace GPX brute : parsing, distance cumulée (Haversine), lissage
 * d'altitude et calcul du D+/D- cumulés avec seuil anti-bruit. Renvoie les
 * points pleine résolution, les totaux et la bounding box.
 */
export function processGpx(
  xml: string,
  options: GpxProcessingOptions = DEFAULT_GPX_OPTIONS,
): GpxProcessingResult {
  const raw = parseGpx(xml);
  const filled = fillMissingElevations(raw);
  const smoothed = movingAverage(filled, options.smoothingWindow);
  const { gain, loss } = accumulateElevation(smoothed, options.elevationThreshold);

  const points: ProcessedTrackPoint[] = [];
  let cumulativeMeters = 0;
  let minLat = raw[0]!.lat;
  let maxLat = raw[0]!.lat;
  let minLon = raw[0]!.lon;
  let maxLon = raw[0]!.lon;
  let minAltitude = smoothed[0]!;
  let maxAltitude = smoothed[0]!;

  for (let i = 0; i < raw.length; i++) {
    const p = raw[i]!;
    if (i > 0) {
      const prev = raw[i - 1]!;
      cumulativeMeters += haversineMeters(prev.lat, prev.lon, p.lat, p.lon);
    }
    const ele = smoothed[i]!;
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
    minAltitude = Math.min(minAltitude, ele);
    maxAltitude = Math.max(maxAltitude, ele);
    points.push({
      lat: p.lat,
      lon: p.lon,
      ele: round(ele, 1),
      distance: round(cumulativeMeters / 1000, 4),
      elevationGain: round(gain[i]!, 1),
      elevationLoss: round(loss[i]!, 1),
    });
  }

  return {
    points,
    totals: {
      distance: round(cumulativeMeters / 1000, 3),
      elevationGain: Math.round(gain[gain.length - 1]!),
      elevationLoss: Math.round(loss[loss.length - 1]!),
      minAltitude: round(minAltitude, 1),
      maxAltitude: round(maxAltitude, 1),
      pointCount: points.length,
    },
    bbox: {
      minLat: round(minLat, 6),
      minLon: round(minLon, 6),
      maxLat: round(maxLat, 6),
      maxLon: round(maxLon, 6),
    },
  };
}

/**
 * Simplification de type Ramer–Douglas–Peucker appliquée au **profil**, en
 * mesurant l'**écart vertical d'altitude** (m) entre un point et la corde qui
 * relie les extrémités du segment — et non une distance euclidienne mêlant
 * distance et altitude (où l'échelle énorme de la distance écraserait le
 * relief). `epsilonMeters` s'interprète ainsi comme l'erreur d'altitude maximale
 * tolérée : le relief (sommets, creux) est fidèlement conservé. Renvoie les
 * **indices** gardés (toujours le premier et le dernier), ce qui permet de
 * réaligner toutes les colonnes (lat/lon, D+/D-).
 */
export function simplifyProfileIndices(
  points: readonly ProcessedTrackPoint[],
  epsilonMeters: number,
): number[] {
  const n = points.length;
  if (n <= 2 || epsilonMeters <= 0) {
    return points.map((_, i) => i);
  }
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = -1;
    let index = -1;
    const ax = points[start]!.distance;
    const ay = points[start]!.ele;
    const bx = points[end]!.distance;
    const by = points[end]!.ele;
    for (let i = start + 1; i < end; i++) {
      const d = verticalDeviation(points[i]!.distance, points[i]!.ele, ax, ay, bx, by);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > epsilonMeters && index !== -1) {
      keep[index] = 1;
      stack.push([start, index]);
      stack.push([index, end]);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Écart **vertical** (m) entre l'altitude d'un point et celle de la corde
 * (ax,ay)-(bx,by) évaluée à l'abscisse `px` (distance). Métrique adaptée au
 * profil altimétrique.
 */
function verticalDeviation(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const span = bx - ax;
  if (span === 0) {
    return Math.abs(py - ay);
  }
  const t = (px - ax) / span;
  const yOnChord = ay + t * (by - ay);
  return Math.abs(py - yOnChord);
}

/**
 * Réduit une trace pleine résolution en une trace simplifiée pour l'affichage,
 * **en préservant le relief**. Tant que la trace tient sous `maxPoints`, elle
 * est renvoyée telle quelle (fidélité maximale). Au-delà, on augmente
 * progressivement la tolérance d'altitude jusqu'à repasser sous le plafond :
 * RDP conserve toujours les points les plus marquants (sommets/creux), donc on
 * ne « rabote » jamais les extrêmes contrairement à un sous-échantillonnage
 * régulier.
 */
export function simplifyForDisplay(
  points: readonly ProcessedTrackPoint[],
  epsilonMeters = 1,
  maxPoints = 4000,
): ProcessedTrackPoint[] {
  if (points.length <= maxPoints) {
    return points.slice();
  }
  let epsilon = Math.max(0.1, epsilonMeters);
  let indices = simplifyProfileIndices(points, epsilon);
  let guard = 0;
  while (indices.length > maxPoints && guard < 40) {
    epsilon *= 1.5;
    indices = simplifyProfileIndices(points, epsilon);
    guard++;
  }
  return indices.map((i) => points[i]!);
}

/**
 * Interpole les valeurs (altitude, D+ cumulé, coordonnées) à une distance
 * donnée (km) sur une trace **triée par distance croissante**. Sert à
 * positionner/enrichir un point de passage à partir de sa seule distance.
 * Renvoie `null` si la trace est vide.
 */
export function interpolateAtDistance(
  points: readonly ProcessedTrackPoint[],
  distanceKm: number,
): ProcessedTrackPoint | null {
  if (points.length === 0) {
    return null;
  }
  if (distanceKm <= points[0]!.distance) {
    return points[0]!;
  }
  const last = points[points.length - 1]!;
  if (distanceKm >= last.distance) {
    return last;
  }
  // Recherche dichotomique du segment encadrant la distance.
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.distance <= distanceKm) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const a = points[lo]!;
  const b = points[hi]!;
  const span = b.distance - a.distance;
  const t = span > 0 ? (distanceKm - a.distance) / span : 0;
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    lat: lerp(a.lat, b.lat),
    lon: lerp(a.lon, b.lon),
    ele: round(lerp(a.ele, b.ele), 1),
    distance: round(distanceKm, 4),
    elevationGain: round(lerp(a.elevationGain, b.elevationGain), 1),
    elevationLoss: round(lerp(a.elevationLoss, b.elevationLoss), 1),
  };
}
