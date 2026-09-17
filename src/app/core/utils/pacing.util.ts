import type { AidStation, GpxTrack, PacingMethod, PacingPlan, RouteWaypoint } from '../models';

/** Segment de pacing calculé (départ → repère → arrivée). */
export interface PacingSegment {
  id: string;
  fromLabel: string;
  toLabel: string;
  /** Distance du segment (km). */
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  /** Difficulté technique du segment (1 roulant → 5 très technique). */
  difficulty: number;
  /** Durée de course du segment (minutes, hors arrêt). */
  durationMinutes: number;
  /** Allure du segment (min/km). */
  paceMinKm: number;
  /** Vitesse du segment (km/h). */
  speedKmh: number;
  /** Distance équivalent plat (km-effort ITRA) du segment. */
  kmEffort: number;
  /** Segment verrouillé explicitement par l'utilisateur (protégé du recalcul). */
  locked: boolean;
  /** Durée forcée (présente dans segmentDurations, éditée ou figée). */
  overridden: boolean;
  /** Heure d'arrivée au point de fin (minutes depuis le départ, hors arrêt). */
  arrivalMinutes: number;
  /** Durée d'arrêt au point de fin (minutes). */
  stopMinutes: number;
}

/** Résultat complet d'un calcul de pacing pour un scénario. */
export interface PacingResult {
  segments: PacingSegment[];
  /** Allure de référence sur plat déduite (min/km). */
  basePaceMinKm: number;
  runningMinutes: number;
  stopMinutes: number;
  totalMinutes: number;
  /** Km-effort total (ITRA : distance + D+/100). */
  kmEffort: number;
  /** `false` si le chrono cible est inatteignable (verrous/arrêts trop longs). */
  feasible: boolean;
}

interface PacingPoint {
  id: string;
  name: string;
  distance: number;
  gain: number;
  loss: number;
  stopMinutes: number;
}

/** Multiplicateur d'allure par note de difficulté (barème centré sur 2/5). */
export const PACING_DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 0.9,
  2: 1.0,
  3: 1.1,
  4: 1.25,
  5: 1.4,
};

/** Libellés courts des notes de difficulté. */
export const PACING_DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Roulant',
  2: 'Facile',
  3: 'Modéré',
  4: 'Technique',
  5: 'Très technique',
};

/** Note de difficulté par défaut d'un segment (modéré). */
export const DEFAULT_SEGMENT_DIFFICULTY = 3;

/** Méthode de coût du dénivelé par défaut. */
export const DEFAULT_PACING_METHOD: PacingMethod = 'MINETTI';

/** Coefficient de montée par défaut (m D+ équivalents à 1 km plat). */
export const DEFAULT_CLIMB_COEFFICIENT = 100;

/** Libellés des méthodes de coût du dénivelé. */
export const PACING_METHOD_LABELS: Record<PacingMethod, string> = {
  MINETTI: 'Minetti (GAP)',
  KM_EFFORT: 'Km-effort (ITRA)',
  NAISMITH: 'Naismith',
};

// Bornes de sûreté de l'allure de référence sur plat (min/km).
const MIN_BASE_PACE = 2;
const MAX_BASE_PACE = 40;


/**
 * Calcule le plan de pacing complet d'un scénario. Le chrono cible détermine
 * l'allure de référence sur plat (résolution linéaire exacte, car la fatigue
 * dépend du km-effort géométrique et non de l'allure). Un scénario dérivé
 * fournit directement `basePaceOverride` (allure de base ± un pourcentage).
 */
export function computePacing(
  track: GpxTrack | null | undefined,
  stations: readonly AidStation[],
  waypoints: readonly RouteWaypoint[],
  difficulties: Record<string, number> | undefined,
  plan: PacingPlan | undefined,
  targetTimeMinutes: number,
  basePaceOverride?: number,
): PacingResult {
  const empty: PacingResult = {
    segments: [],
    basePaceMinKm: 0,
    runningMinutes: 0,
    stopMinutes: 0,
    totalMinutes: 0,
    kmEffort: 0,
    feasible: true,
  };
  if (!track) return empty;

  const points = buildPoints(track, stations, waypoints);
  if (points.length < 2) return empty;

  const method = plan?.method ?? DEFAULT_PACING_METHOD;
  const climbCoef = plan?.climbCoefficient ?? DEFAULT_CLIMB_COEFFICIENT;
  const fatiguePercent = Math.max(0, Math.min(30, plan?.fatiguePercent ?? 0));
  const lockedIds = new Set(plan?.lockedSegmentIds ?? []);
  const overrides = plan?.segmentDurations ?? {};

  // Géométrie de chaque segment + km-effort cumulé (base de la fatigue).
  const raw = points.slice(1).map((point, index) => {
    const previous = points[index]!;
    const id = `${previous.id}:${point.id}`;
    const distance = Math.max(0, point.distance - previous.distance);
    const elevationGain = Math.max(0, point.gain - previous.gain);
    const elevationLoss = Math.max(0, point.loss - previous.loss);
    const difficulty = clampDifficulty(difficulties?.[id]);
    const kmEffort = distance + elevationGain / 100;
    const geometry = segmentGeometry(method, track, previous.distance, point.distance, distance, elevationGain, elevationLoss, climbCoef);
    return { id, previous, point, distance, elevationGain, elevationLoss, difficulty, kmEffort, geometry };
  });

  const totalKmEffort = raw.reduce((sum, seg) => sum + seg.kmEffort, 0);

  // Coefficients A (× allure) et B (constante) par segment, incluant difficulté et fatigue.
  let cumKmEffort = 0;
  const prepared = raw.map((seg) => {
    const fatigueFraction = totalKmEffort > 0 ? (cumKmEffort + seg.kmEffort / 2) / totalKmEffort : 0;
    cumKmEffort += seg.kmEffort;
    const fatigueMult = 1 + (fatiguePercent / 100) * fatigueFraction;
    const difficultyMult = PACING_DIFFICULTY_MULTIPLIERS[seg.difficulty] ?? 1;
    const factor = difficultyMult * fatigueMult;
    const aPerPace = seg.distance * seg.geometry.paceFactor * factor;
    const bConst = seg.geometry.constMinutes * factor;
    const overridden = overrides[seg.id] != null;
    const fixedDuration = overridden ? Math.max(0, overrides[seg.id] ?? 0) : 0;
    const locked = lockedIds.has(seg.id);
    return { ...seg, aPerPace, bConst, overridden, fixedDuration, locked };
  });

  const stopMinutes = raw.reduce((sum, seg) => sum + seg.point.stopMinutes, 0);

  // Allure de référence : imposée (scénario dérivé) ou déduite du chrono cible.
  let basePace: number;
  let feasible = true;
  if (basePaceOverride != null) {
    basePace = clamp(basePaceOverride, MIN_BASE_PACE, MAX_BASE_PACE);
  } else {
    const sumA = prepared.filter((seg) => !seg.overridden).reduce((sum, seg) => sum + seg.aPerPace, 0);
    const sumB = prepared.filter((seg) => !seg.overridden).reduce((sum, seg) => sum + seg.bConst, 0);
    const lockedRun = prepared.reduce((sum, seg) => sum + seg.fixedDuration, 0);
    const available = targetTimeMinutes - sumB - lockedRun - stopMinutes;
    if (sumA <= 0) {
      basePace = 0;
    } else {
      basePace = available / sumA;
      if (basePace < MIN_BASE_PACE || basePace > MAX_BASE_PACE) {
        feasible = false;
        basePace = clamp(basePace, MIN_BASE_PACE, MAX_BASE_PACE);
      }
    }
  }

  let elapsed = 0;
  let runningMinutes = 0;
  const segments: PacingSegment[] = prepared.map((seg) => {
    const runMinutes = seg.overridden
      ? seg.fixedDuration
      : Math.max(0, seg.aPerPace * basePace + seg.bConst);
    runningMinutes += runMinutes;
    elapsed += runMinutes;
    const arrivalMinutes = elapsed;
    elapsed += seg.point.stopMinutes;
    return {
      id: seg.id,
      fromLabel: seg.previous.name,
      toLabel: seg.point.name,
      distance: seg.distance,
      elevationGain: seg.elevationGain,
      elevationLoss: seg.elevationLoss,
      difficulty: seg.difficulty,
      durationMinutes: runMinutes,
      paceMinKm: seg.distance > 0 ? runMinutes / seg.distance : 0,
      speedKmh: runMinutes > 0 ? (seg.distance / runMinutes) * 60 : 0,
      kmEffort: seg.kmEffort,
      locked: seg.locked,
      overridden: seg.overridden,
      arrivalMinutes,
      stopMinutes: seg.point.stopMinutes,
    };
  });

  return {
    segments,
    basePaceMinKm: basePace,
    runningMinutes,
    stopMinutes,
    totalMinutes: runningMinutes + stopMinutes,
    kmEffort: totalKmEffort,
    feasible,
  };
}

/** Raccourci : segments seuls (compatibilité affichage/PDF). */
export function buildPacingSegments(
  track: GpxTrack | null | undefined,
  stations: readonly AidStation[],
  waypoints: readonly RouteWaypoint[],
  difficulties: Record<string, number> | undefined,
  plan: PacingPlan | undefined,
  targetTimeMinutes: number,
  basePaceOverride?: number,
): PacingSegment[] {
  return computePacing(track, stations, waypoints, difficulties, plan, targetTimeMinutes, basePaceOverride).segments;
}

/** Géométrie d'un segment : facteur d'allure et constante (minutes) par méthode. */
function segmentGeometry(
  method: PacingMethod,
  track: GpxTrack,
  distFrom: number,
  distTo: number,
  distance: number,
  gain: number,
  loss: number,
  climbCoef: number,
): { paceFactor: number; constMinutes: number } {
  if (distance <= 0) return { paceFactor: 1, constMinutes: 0 };
  if (method === 'KM_EFFORT') {
    const distEq = Math.max(distance * 0.6, distance + gain / climbCoef - loss / (climbCoef * 2));
    return { paceFactor: distEq / distance, constMinutes: 0 };
  }
  if (method === 'NAISMITH') {
    // Naismith : +1 h par 600 m D+, léger crédit en descente (plancher à 0).
    const constMinutes = Math.max(0, gain * (60 / 600) - loss * 0.017);
    return { paceFactor: 1, constMinutes };
  }
  // MINETTI (défaut) : intègre le coût énergétique sur les points GPX du segment.
  return { paceFactor: minettiGapFactor(track, distFrom, distTo), constMinutes: 0 };
}

/** Coût énergétique de course de Minetti (J/kg/m) selon la pente i (montée/descente). */
function minettiCost(gradient: number): number {
  const i = clamp(gradient, -0.45, 0.45);
  return 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6;
}

const MINETTI_FLAT_COST = minettiCost(0);

/**
 * Facteur GAP (Grade Adjusted Pace) d'un segment : temps relatif au plat obtenu
 * en intégrant le coût de Minetti sur les points GPX compris dans le segment.
 */
function minettiGapFactor(track: GpxTrack, distFrom: number, distTo: number): number {
  const points = track.points;
  let weighted = 0;
  let horizontal = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const start = Math.max(distFrom, a.distance);
    const end = Math.min(distTo, b.distance);
    const span = end - start;
    if (span <= 0) continue;
    const pairSpan = b.distance - a.distance || 1;
    const gradient = (b.ele - a.ele) / (pairSpan * 1000);
    weighted += (minettiCost(gradient) / MINETTI_FLAT_COST) * span;
    horizontal += span;
  }
  return horizontal > 0 ? weighted / horizontal : 1;
}

function clampDifficulty(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_SEGMENT_DIFFICULTY;
  return Math.max(1, Math.min(5, Math.round(value)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}


function buildPoints(track: GpxTrack, stations: readonly AidStation[], waypoints: readonly RouteWaypoint[]): PacingPoint[] {
  const last = track.points[track.points.length - 1];
  if (!last) return [];
  const markers: PacingPoint[] = [
    { id: '__start__', name: 'Départ', distance: 0, gain: 0, loss: 0, stopMinutes: 0 },
    ...stations
      .filter((station) => station.distanceFromStart != null)
      .map((station) => ({
        id: station.id,
        name: station.name,
        distance: station.distanceFromStart!,
        gain: station.elevationGainFromStart ?? 0,
        loss: elevationLossAtDistance(track, station.distanceFromStart!),
        stopMinutes: Math.max(0, station.stopDurationMinutes ?? 5),
      })),
    ...waypoints
      .filter((waypoint) => waypoint.distanceFromStart != null)
      .map((waypoint) => ({
        id: waypoint.id,
        name: waypoint.name,
        distance: waypoint.distanceFromStart!,
        gain: waypoint.elevationGainFromStart ?? 0,
        loss: elevationLossAtDistance(track, waypoint.distanceFromStart!),
        stopMinutes: 0,
      })),
    { id: '__finish__', name: 'Arrivée', distance: track.distance, gain: last.elevationGain, loss: last.elevationLoss, stopMinutes: 0 },
  ];
  return markers.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
}

/** Interpole le D- cumulé du GPX à la distance d'un point de passage. */
function elevationLossAtDistance(track: GpxTrack, distance: number): number {
  const points = track.points;
  if (points.length === 0) return 0;
  if (distance <= points[0]!.distance) return points[0]!.elevationLoss;
  const last = points[points.length - 1]!;
  if (distance >= last.distance) return last.elevationLoss;
  for (let index = 1; index < points.length; index++) {
    const current = points[index]!;
    if (current.distance >= distance) {
      const previous = points[index - 1]!;
      const ratio = (distance - previous.distance) / (current.distance - previous.distance || 1);
      return previous.elevationLoss + (current.elevationLoss - previous.elevationLoss) * ratio;
    }
  }
  return last.elevationLoss;
}

