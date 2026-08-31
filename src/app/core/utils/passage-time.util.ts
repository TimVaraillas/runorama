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
