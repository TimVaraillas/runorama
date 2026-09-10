import type { AidStation, GpxTrack, PacingPlan, PacingTerrain, RouteWaypoint } from '../models';

export interface PacingSegment {
  id: string;
  fromLabel: string;
  toLabel: string;
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  averageGrade: number;
  terrain: PacingTerrain;
  durationMinutes: number;
  locked: boolean;
  arrivalMinutes: number;
  stopMinutes: number;
}

interface PacingPoint {
  id: string;
  name: string;
  distance: number;
  gain: number;
  loss: number;
  stopMinutes: number;
}

export const PACING_TERRAIN_LABELS: Record<PacingTerrain, string> = {
  ROAD: 'Route / piste',
  ROLLING_TRAIL: 'Sentier roulant',
  TECHNICAL_TRAIL: 'Sentier technique',
  VERY_TECHNICAL: 'Très technique',
  OFF_TRAIL: 'Hors sentier',
};

/** Prépare les segments départ → repères → arrivée depuis la trace GPX. */
export function buildPacingSegments(
  track: GpxTrack,
  stations: readonly AidStation[],
  waypoints: readonly RouteWaypoint[],
  plan: PacingPlan | undefined,
  targetTimeMinutes: number | undefined,
): PacingSegment[] {
  const points = buildPoints(track, stations, waypoints);
  const totalStops = points.reduce((sum, point) => sum + point.stopMinutes, 0);
  const availableRunning = Math.max(0, (targetTimeMinutes ?? 0) - totalStops);
  const defaultDurations = distributeDurations(points, availableRunning, plan);
  let elapsed = 0;

  return points.slice(1).map((point, index) => {
    const previous = points[index]!;
    const id = `${previous.id}:${point.id}`;
    const distance = Math.max(0, point.distance - previous.distance);
    const elevationGain = Math.max(0, point.gain - previous.gain);
    const elevationLoss = Math.max(0, point.loss - previous.loss);
    const durationMinutes = Math.max(0, plan?.segmentDurations[id] ?? defaultDurations[id] ?? 0);
    elapsed += durationMinutes;
    const arrivalMinutes = elapsed + previous.stopMinutes;
    elapsed = arrivalMinutes;
    return {
      id,
      fromLabel: previous.name,
      toLabel: point.name,
      distance,
      elevationGain,
      elevationLoss,
      averageGrade: distance > 0 ? (elevationGain - elevationLoss) / (distance * 10) : 0,
      terrain: plan?.terrains?.[id] ?? 'ROLLING_TRAIL',
      durationMinutes,
      locked: plan?.lockedSegmentIds?.includes(id) ?? false,
      arrivalMinutes,
      stopMinutes: point.stopMinutes,
    };
  });
}

/** Génère des durées pondérées par distance, relief, fatigue et stratégie. */
export function createAutomaticPacingPlan(
  track: GpxTrack,
  stations: readonly AidStation[],
  waypoints: readonly RouteWaypoint[],
  targetTimeMinutes: number,
  plan: PacingPlan | undefined,
  strategy: NonNullable<PacingPlan['strategy']> = 'BALANCED',
): PacingPlan | null {
  const locked = new Set(plan?.lockedSegmentIds ?? []);
  const existing = buildPacingSegments(track, stations, waypoints, plan, targetTimeMinutes);
  const lockedDuration = existing
    .filter((segment) => locked.has(segment.id))
    .reduce((sum, segment) => sum + segment.durationMinutes, 0);
  const totalStops = stations.reduce((sum, station) => sum + Math.max(0, station.stopDurationMinutes ?? 5), 0);
  const distributable = targetTimeMinutes - totalStops - lockedDuration;
  const unlocked = existing.filter((segment) => !locked.has(segment.id));
  if (distributable < 0 || (unlocked.length > 0 && distributable === 0)) return null;

  const fatigue = Math.min(50, Math.max(0, plan?.fatiguePercent ?? 0)) / 100;
  const split = Math.min(30, Math.max(0, plan?.negativeSplitPercent ?? 10)) / 100;
  const weights = unlocked.map((segment, index) => {
    const terrainFactor: Record<PacingTerrain, number> = {
      ROAD: 0.8,
      ROLLING_TRAIL: 1,
      TECHNICAL_TRAIL: 1.15,
      VERY_TECHNICAL: 1.35,
      OFF_TRAIL: 1.6,
    };
    const terrain = plan?.terrains?.[segment.id] ?? 'ROLLING_TRAIL';
    const progress = unlocked.length > 1 ? index / (unlocked.length - 1) : 0;
    const terrainWeight = terrainFactor[terrain];
    const reliefWeight = 1 + segment.elevationGain / Math.max(1, segment.distance * 1000) * 6;
    const fatigueWeight = 1 + fatigue * progress;
    const strategyWeight =
      strategy === 'CAUTIOUS' ? 1 + 0.15 * (1 - progress) :
      strategy === 'AGGRESSIVE' ? 1 - 0.1 * (1 - progress) :
      strategy === 'NEGATIVE_SPLIT' ? 1 + split * (0.5 - progress) : 1;
    return Math.max(0.1, segment.distance * terrainWeight * reliefWeight * fatigueWeight * strategyWeight);
  });
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const durations = { ...(plan?.segmentDurations ?? {}) };
  let assigned = 0;
  unlocked.forEach((segment, index) => {
    const duration = index === unlocked.length - 1
      ? distributable - assigned
      : Math.round((distributable * weights[index]!) / weightTotal);
    durations[segment.id] = duration;
    assigned += duration;
  });
  return { ...plan, segmentDurations: durations, strategy };
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

function distributeDurations(points: PacingPoint[], availableRunning: number, plan: PacingPlan | undefined): Record<string, number> {
  const weights = points.slice(1).map((point, index) => Math.max(0, point.distance - points[index]!.distance));
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const result: Record<string, number> = {};
  let assigned = 0;
  points.slice(1).forEach((point, index) => {
    const id = `${points[index]!.id}:${point.id}`;
    const duration = index === weights.length - 1 ? availableRunning - assigned : Math.round((availableRunning * weights[index]!) / total);
    result[id] = duration;
    assigned += duration;
  });
  return result;
}
