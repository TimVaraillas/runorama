import type {
  AidStation,
  GhostBlock,
  NutritionIntake,
  NutritionProduct,
  PlanHourlyRecap,
  PlanSequenceMinutes,
  PositionedAidStation,
  PositionedIntake,
  RouteWaypoint,
  SequenceMark,
} from '../models';
import type { ResolvedGoal } from './nutrition-goals.util';
import { resolveIntakeProduct } from './water.util';

/** Aperçu live d'une prise en cours de redimensionnement. */
export interface ResizePreviewState {
  id: string;
  startMinute: number;
  durationMinutes: number;
}

/** Aperçu du créneau survolé pendant un drag (pour la superposition). */
export interface DragOverState {
  startMinute: number;
  durationMinutes: number;
  excludeId: string | null;
}

/** Formate un nombre de minutes en `H:MM`. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calcule le placement des prises sur la timeline : résolution des produits,
 * affectation gloutonne des couloirs (pour éviter les chevauchements),
 * détection des superpositions avec l'élément glissé et calcul de
 * l'emplacement fantôme prévisualisé.
 */
export function computePlanLayout(params: {
  intakes: NutritionIntake[];
  productMap: Map<string, NutritionProduct>;
  total: number;
  trackHeight: number;
  resizePreview: ResizePreviewState | null;
  dragOver: DragOverState | null;
}): { intakes: PositionedIntake[]; laneCount: number; ghost: GhostBlock | null } {
  const { intakes, productMap, total, trackHeight, resizePreview, dragOver } = params;
  if (total <= 0) return { intakes: [], laneCount: 1, ghost: null };

  const resolved = intakes
    .map((intake) => {
      const product = resolveIntakeProduct(intake, productMap);
      if (!product) return null;
      // Aperçu live pendant un redimensionnement.
      const override = resizePreview && resizePreview.id === intake.id ? resizePreview : null;
      return {
        ...intake,
        startMinute: override ? override.startMinute : intake.startMinute,
        durationMinutes: override ? override.durationMinutes : intake.durationMinutes,
        product,
      };
    })
    .filter((i): i is NutritionIntake & { product: NutritionProduct } => i !== null);

  // Fenêtres pour l'affectation des couloirs : la prise déplacée est
  // relocalisée sur le créneau survolé, et un fantôme est ajouté pour un
  // produit venant de la palette.
  type Win = { id: string; start: number; end: number };
  const wins: Win[] = resolved.map((i) =>
    dragOver && dragOver.excludeId === i.id
      ? {
          id: i.id,
          start: dragOver.startMinute,
          end: dragOver.startMinute + dragOver.durationMinutes,
        }
      : { id: i.id, start: i.startMinute, end: i.startMinute + i.durationMinutes },
  );
  if (dragOver && dragOver.excludeId === null) {
    wins.push({
      id: '__ghost__',
      start: dragOver.startMinute,
      end: dragOver.startMinute + dragOver.durationMinutes,
    });
  }

  // Affectation gloutonne de « couloirs » pour éviter les chevauchements.
  const laneEnds: number[] = [];
  const laneOf = new Map<string, number>();
  for (const w of [...wins].sort((a, b) => a.start - b.start || a.end - b.end)) {
    let lane = laneEnds.findIndex((end) => end <= w.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(w.end);
    } else {
      laneEnds[lane] = w.end;
    }
    laneOf.set(w.id, lane);
  }
  const laneCount = Math.max(1, laneEnds.length);

  const gStart = dragOver ? dragOver.startMinute : 0;
  const gEnd = dragOver ? dragOver.startMinute + dragOver.durationMinutes : 0;

  const positioned: PositionedIntake[] = resolved
    .sort((a, b) => a.startMinute - b.startMinute || a.durationMinutes - b.durationMinutes)
    .map((intake) => {
      const endMinute = intake.startMinute + intake.durationMinutes;
      const overlapped =
        dragOver != null &&
        dragOver.excludeId !== intake.id &&
        gStart < endMinute &&
        gEnd > intake.startMinute;
      return {
        ...intake,
        endMinute,
        lane: laneOf.get(intake.id) ?? 0,
        overlapped,
        top: (intake.startMinute / total) * trackHeight,
        height: Math.max(28, (intake.durationMinutes / total) * trackHeight),
      };
    });

  // Fantôme d'atterrissage : pour un ajout depuis la palette (clé `__ghost__`)
  // comme pour le déplacement d'une prise existante (clé = son identifiant).
  const ghost: GhostBlock | null = dragOver
    ? {
        lane: laneOf.get(dragOver.excludeId ?? '__ghost__') ?? 0,
        top: (dragOver.startMinute / total) * trackHeight,
        height: Math.max(28, (dragOver.durationMinutes / total) * trackHeight),
      }
    : null;

  return { intakes: positioned, laneCount, ghost };
}

/** Construit les repères de séquence (position + libellé horaire). */
export function buildSequenceMarks(params: {
  total: number;
  seq: PlanSequenceMinutes;
  trackHeight: number;
}): SequenceMark[] {
  const { total, seq, trackHeight } = params;
  const marks: SequenceMark[] = [];
  for (let minute = 0; minute <= total; minute += seq) {
    marks.push({
      minute,
      top: (minute / total) * trackHeight,
      label: formatMinutes(minute),
      major: minute % 60 === 0,
    });
  }
  return marks;
}

/**
 * Positionne les ravitaillements sur la timeline du plan à partir de leur
 * temps estimé depuis le départ. Les ravitos hors de la fenêtre de course
 * (temps négatif ou au-delà du chrono cible) sont ignorés.
 */
export function buildAidStationMarks(params: {
  total: number;
  trackHeight: number;
  aidStations: AidStation[];
  waypoints?: RouteWaypoint[];
}): PositionedAidStation[] {
  const { total, trackHeight, aidStations, waypoints = [] } = params;
  if (total <= 0) return [];

  const stationMarks: PositionedAidStation[] = aidStations
    .filter(
      (station) =>
        station.estimatedDurationFromStart >= 0 && station.estimatedDurationFromStart <= total,
    )
    .map((station) => ({
      id: station.id,
      name: station.name,
      kind: 'AID_STATION' as const,
      types: station.types,
      minute: station.estimatedDurationFromStart,
      top: (station.estimatedDurationFromStart / total) * trackHeight,
      distanceFromStart: station.distanceFromStart,
      consumptionCount: station.consumptions?.length ?? 0,
    }));

  const waypointMarks: PositionedAidStation[] = waypoints
    .filter(
      (wp) =>
        wp.estimatedDurationFromStart != null &&
        wp.estimatedDurationFromStart >= 0 &&
        wp.estimatedDurationFromStart <= total,
    )
    .map((wp) => ({
      id: wp.id,
      name: wp.name,
      kind: wp.kind,
      types: [],
      minute: wp.estimatedDurationFromStart!,
      top: (wp.estimatedDurationFromStart! / total) * trackHeight,
      distanceFromStart: wp.distanceFromStart,
      consumptionCount: 0,
    }));

  return [...stationMarks, ...waypointMarks].sort((a, b) => a.minute - b.minute);
}

/** Construit le récapitulatif horaire (apports planifiés vs cible) par nutriment. */
export function buildHourlyRecap(params: {
  total: number;
  goals: ResolvedGoal[];
  intakes: PositionedIntake[];
}): PlanHourlyRecap[] {
  const { total, goals, intakes } = params;
  if (total <= 0 || goals.length === 0) return [];
  const hours = Math.ceil(total / 60);
  const rows: PlanHourlyRecap[] = Array.from({ length: hours }, (_, h) => {
    const minutesInHour = Math.min(60, total - h * 60);
    return {
      hour: h + 1,
      nutrients: goals.map((goal) => ({
        key: goal.key,
        label: goal.label,
        unit: goal.unit,
        planned: 0,
        target: (goal.hourly * minutesInHour) / 60,
      })),
    };
  });
  for (const intake of intakes) {
    if (intake.durationMinutes <= 0) continue;
    for (let h = 0; h < hours; h++) {
      const overlap = Math.min(intake.endMinute, (h + 1) * 60) - Math.max(intake.startMinute, h * 60);
      if (overlap <= 0) continue;
      for (const nutrient of rows[h].nutrients) {
        if (nutrient.key === 'weight') continue;
        const perMin = (intake.product[nutrient.key] * intake.quantity) / intake.durationMinutes;
        nutrient.planned += perMin * overlap;
      }
    }
  }
  return rows;
}
