/**
 * Utilitaires de « portion » : au sein d'une stratégie, une ligne d'inventaire
 * peut définir une taille de portion (en grammes) distincte du poids unitaire
 * du produit (le paquet). L'inventaire reste compté en paquets entiers ; les
 * prises du plan de nutrition consomment des portions, exprimées en interne
 * comme une fraction d'unité (multiplicateur des apports).
 */

/** Poids de portion effectif (g) : la valeur définie, sinon le poids d'un paquet. */
export function resolvePortionGrams(
  portionWeight: number | undefined | null,
  unitWeight: number,
): number {
  return portionWeight != null && portionWeight > 0 ? portionWeight : unitWeight;
}

/**
 * Fraction d'unité correspondant à une portion (ex. portion 25 g d'un paquet de
 * 100 g → 0,25). Vaut 1 quand aucune portion n'est définie (= 1 paquet).
 */
export function portionUnits(
  portionWeight: number | undefined | null,
  unitWeight: number,
): number {
  if (!unitWeight || unitWeight <= 0) return 1;
  return resolvePortionGrams(portionWeight, unitWeight) / unitWeight;
}

/** Poids consommé (g) d'une prise : quantité (en unités) × poids d'un paquet. */
export function intakeGrams(quantity: number, unitWeight: number): number {
  return quantity * unitWeight;
}
