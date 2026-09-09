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

/** Ajoute une durée de course à une heure de départ et retourne une heure locale `HH:mm`. */
export function formatPassageTime(startTime: string | undefined, elapsedMinutes: number): string {
  const [hours = 8, minutes = 0] = (startTime ?? '08:00').split(':').map(Number);
  const totalMinutes = ((hours * 60 + minutes + elapsedMinutes) % 1440 + 1440) % 1440;
  return `${Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
}
