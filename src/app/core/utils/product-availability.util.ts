import type { AidStation, RaceStrategyItem, NutritionIntake } from '../models';

/** Variation de stock d'un produit à l'instant d'un ravitaillement. */
export interface AvailabilityEvent {
  /** Instant depuis le départ (minutes). */
  minute: number;
  /** Variation de quantité disponible (positive = récupérée, négative = déposée). */
  delta: number;
  /** Nom du ravitaillement à l'origine de la variation (pour les messages). */
  stationName: string;
}

/** Planning de disponibilité d'un produit sur le parcours. */
export interface ProductAvailability {
  /** Quantité disponible dès le départ (non affectée en « à récupérer » sur un ravito). */
  fromStart: number;
  /** Variations triées par instant croissant. */
  events: AvailabilityEvent[];
}

/** Premier instant où une quantité donnée devient disponible, avec le ravito associé. */
export interface AvailabilityUnlock {
  minute: number;
  stationName: string;
}

/**
 * Construit, pour chaque produit de l'inventaire, son planning de
 * disponibilité sur le parcours : les unités affectées en « à récupérer » sur
 * un ravito ne sont disponibles qu'à partir de son temps estimé ; celles
 * affectées en « à déposer » cessent de l'être à partir de ce même instant.
 */
export function buildAvailabilitySchedules(
  items: RaceStrategyItem[],
  aidStations: AidStation[],
): Map<string, ProductAvailability> {
  const schedules = new Map<string, ProductAvailability>();
  for (const item of items) {
    schedules.set(item.productId, { fromStart: item.quantity, events: [] });
  }

  for (const station of aidStations) {
    const minute = station.estimatedDurationFromStart;
    for (const pickup of station.pickup ?? []) {
      if (pickup.kind !== 'product' || !pickup.productId) continue;
      const schedule = schedules.get(pickup.productId);
      if (!schedule) continue;
      schedule.fromStart -= pickup.quantity;
      schedule.events.push({ minute, delta: pickup.quantity, stationName: station.name });
    }
    for (const drop of station.drop ?? []) {
      if (drop.kind !== 'product' || !drop.productId) continue;
      const schedule = schedules.get(drop.productId);
      if (!schedule) continue;
      schedule.events.push({ minute, delta: -drop.quantity, stationName: station.name });
    }
  }

  for (const schedule of schedules.values()) {
    schedule.fromStart = Math.max(0, schedule.fromStart);
    schedule.events.sort((a, b) => a.minute - b.minute);
  }
  return schedules;
}

/** Quantité disponible d'un produit à un instant donné (minutes depuis le départ). */
export function availableQuantityAt(
  schedule: ProductAvailability | undefined,
  minute: number,
): number {
  if (!schedule) return 0;
  let total = schedule.fromStart;
  for (const event of schedule.events) {
    if (event.minute > minute) break;
    total += event.delta;
  }
  return Math.max(0, total);
}

/**
 * Premier instant à partir duquel au moins `quantity` unité(s) sont
 * disponibles, avec le ravito à l'origine du déblocage. `null` si cette
 * quantité n'est jamais atteinte sur le planning connu.
 */
export function earliestAvailableMinute(
  schedule: ProductAvailability | undefined,
  quantity = 1,
): AvailabilityUnlock | null {
  if (!schedule) return null;
  if (schedule.fromStart >= quantity) return { minute: 0, stationName: '' };
  let total = schedule.fromStart;
  for (const event of schedule.events) {
    total += event.delta;
    if (total >= quantity) return { minute: event.minute, stationName: event.stationName };
  }
  return null;
}

/**
 * Retire du plan de consommation les prises devenues invalides (produit non
 * disponible en quantité suffisante à leur instant), rejouées dans l'ordre
 * chronologique. Les prises d'eau (illimitées) sont toujours conservées.
 */
export function pruneUnavailableIntakes(
  intakes: NutritionIntake[],
  items: RaceStrategyItem[],
  aidStations: AidStation[],
  productMap: Map<string, { name: string }>,
): { intakes: NutritionIntake[]; removedProductNames: string[] } {
  const schedules = buildAvailabilitySchedules(items, aidStations);
  const used = new Map<string, number>();
  const removedNames = new Set<string>();
  const keptIds = new Set<string>();

  const sorted = [...intakes].sort((a, b) => a.startMinute - b.startMinute);
  for (const intake of sorted) {
    if (intake.kind === 'water' || !intake.productId) {
      keptIds.add(intake.id);
      continue;
    }
    const schedule = schedules.get(intake.productId);
    const usedSoFar = used.get(intake.productId) ?? 0;
    const available = availableQuantityAt(schedule, intake.startMinute) - usedSoFar;
    if (available >= intake.quantity) {
      used.set(intake.productId, usedSoFar + intake.quantity);
      keptIds.add(intake.id);
    } else {
      const product = intake.product ?? productMap.get(intake.productId);
      removedNames.add(product?.name ?? 'Produit inconnu');
    }
  }

  return {
    intakes: intakes.filter((intake) => keptIds.has(intake.id)),
    removedProductNames: [...removedNames],
  };
}
