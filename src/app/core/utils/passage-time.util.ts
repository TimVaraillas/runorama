/**
 * Estimation du temps de passage à un point du parcours.
 *
 * Modèle V1 volontairement simple et isolé ici pour pouvoir évoluer : ratio
 * kilométrique linéaire (temps cible réparti proportionnellement à la distance).
 * Il ne tient pas encore compte du D+/D- ni de la fatigue — ce sera l'objet d'un
 * futur modèle dédié.
 */
export function estimatePassageTimeByKmRatio(
  distanceFromStartKm: number,
  targetTimeMinutes: number | undefined,
  totalDistanceKm: number | undefined,
): number {
  if (!targetTimeMinutes || !totalDistanceKm || totalDistanceKm <= 0) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(distanceFromStartKm, totalDistanceKm));
  return Math.round((targetTimeMinutes * clamped) / totalDistanceKm);
}

/** Position et durée d'un arrêt à prendre en compte dans le temps de course. */
export interface RouteStop {
  distanceFromStart?: number;
  stopDurationMinutes?: number;
}

/**
 * Estime l'arrivée à une distance donnée avec un chrono cible fixe : les
 * arrêts réduisent le temps de course et décalent les points qui les suivent.
 */
export function estimateArrivalTime(
  distanceFromStartKm: number,
  targetTimeMinutes: number | undefined,
  totalDistanceKm: number | undefined,
  stops: readonly RouteStop[],
): number {
  if (!targetTimeMinutes || !totalDistanceKm || totalDistanceKm <= 0) {
    return 0;
  }
  const totalStops = stops.reduce(
    (sum, stop) => sum + Math.max(0, stop.stopDurationMinutes ?? 5),
    0,
  );
  const runningMinutes = Math.max(0, targetTimeMinutes - totalStops);
  const distance = Math.max(0, Math.min(distanceFromStartKm, totalDistanceKm));
  const previousStops = stops.reduce(
    (sum, stop) =>
      stop.distanceFromStart != null && stop.distanceFromStart < distance
        ? sum + Math.max(0, stop.stopDurationMinutes ?? 5)
        : sum,
    0,
  );
  return Math.round((runningMinutes * distance) / totalDistanceKm) + previousStops;
}

/** Ajoute une durée de course à une heure de départ et retourne une heure locale `HH:mm`. */
export function formatPassageTime(startTime: string | undefined, elapsedMinutes: number): string {
  const [hours = 8, minutes = 0] = (startTime ?? '08:00').split(':').map(Number);
  const totalMinutes = ((Math.round(hours * 60 + minutes + elapsedMinutes) % 1440) + 1440) % 1440;
  return `${Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
}
