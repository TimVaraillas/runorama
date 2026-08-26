import type {
  NutritionEvent,
  NutritionEventResult,
  NutritionProduct,
} from '../models';

/** Clés de nutriments comptabilisées dans la comparaison prévu vs réel. */
export const RACE_NUTRIENT_KEYS = ['energy', 'carbs', 'fats', 'proteins', 'sodium'] as const;
export type RaceNutrientKey = (typeof RACE_NUTRIENT_KEYS)[number];

/** Total d'apports par nutriment (valeurs absolues cumulées). */
export type NutrientTotals = Record<RaceNutrientKey, number>;

/** Comparaison prévu vs réel d'une course finalisée. */
export interface RaceComparison {
  /** Apports prévus (produits du plan × quantité prévue). */
  planned: NutrientTotals;
  /** Apports réels (produits consommés × quantité réelle + hors-plan). */
  actual: NutrientTotals;
  /** Apports prévus rapportés à l'heure (chrono cible). */
  plannedPerHour: NutrientTotals;
  /** Apports réels rapportés à l'heure (durée réelle). */
  actualPerHour: NutrientTotals;
  /** Eau prévue (ml). */
  plannedWaterMl: number;
  /** Eau réelle (ml, hors-plan inclus). */
  actualWaterMl: number;
  /** Chrono cible en minutes. */
  plannedDurationMinutes: number;
  /** Durée réelle en minutes. */
  actualDurationMinutes: number;
  /** Taux de respect du plan (0 à 100), moyenne des nutriments prévus. */
  adherencePct: number;
}

function emptyTotals(): NutrientTotals {
  return { energy: 0, carbs: 0, fats: 0, proteins: 0, sodium: 0 };
}

/**
 * Résout le produit associé à une entrée de consommation : privilégie le
 * produit dénormalisé, sinon le retrouve dans l'inventaire de l'évènement.
 */
function buildProductLookup(event: NutritionEvent): Map<string, NutritionProduct> {
  const map = new Map<string, NutritionProduct>();
  for (const item of event.items ?? []) {
    if (item.product) {
      map.set(item.productId, item.product);
    }
  }
  return map;
}

function addProduct(totals: NutrientTotals, product: NutritionProduct, quantity: number): void {
  for (const key of RACE_NUTRIENT_KEYS) {
    totals[key] += (product[key] ?? 0) * quantity;
  }
}

function perHour(totals: NutrientTotals, minutes: number): NutrientTotals {
  const hours = minutes > 0 ? minutes / 60 : 0;
  const out = emptyTotals();
  if (hours <= 0) return out;
  for (const key of RACE_NUTRIENT_KEYS) {
    out[key] = totals[key] / hours;
  }
  return out;
}

/**
 * Calcule la comparaison prévu vs réel (nutrition + eau) et le taux de respect
 * du plan d'une course finalisée.
 */
export function computeRaceComparison(
  event: NutritionEvent,
  result: NutritionEventResult,
): RaceComparison {
  const lookup = buildProductLookup(event);
  const planned = emptyTotals();
  const actual = emptyTotals();

  for (const entry of result.consumption ?? []) {
    const product = entry.product ?? lookup.get(entry.productId);
    if (!product) continue;
    addProduct(planned, product, entry.plannedQuantity ?? 0);
    addProduct(actual, product, entry.actualQuantity ?? 0);
  }

  let offPlanWater = 0;
  for (const off of result.offPlan ?? []) {
    actual.energy += off.energy ?? 0;
    actual.carbs += off.carbs ?? 0;
    actual.fats += off.fats ?? 0;
    actual.proteins += off.proteins ?? 0;
    actual.sodium += off.sodium ?? 0;
    offPlanWater += off.waterMl ?? 0;
  }

  const plannedDurationMinutes = event.targetTimeMinutes ?? 0;
  const actualDurationMinutes = result.actualDurationMinutes ?? plannedDurationMinutes;

  // Respect du plan : moyenne, sur les nutriments prévus, du ratio réel/prévu
  // borné à 100 %.
  const ratios: number[] = [];
  for (const key of RACE_NUTRIENT_KEYS) {
    if (planned[key] > 0) {
      ratios.push(Math.min(actual[key] / planned[key], 1));
    }
  }
  const plannedWaterMl = result.plannedWaterMl ?? 0;
  const actualWaterMl = (result.actualWaterMl ?? 0) + offPlanWater;
  if (plannedWaterMl > 0) {
    ratios.push(Math.min(actualWaterMl / plannedWaterMl, 1));
  }
  const adherencePct = ratios.length
    ? Math.round((ratios.reduce((s, r) => s + r, 0) / ratios.length) * 100)
    : 0;

  return {
    planned,
    actual,
    plannedPerHour: perHour(planned, plannedDurationMinutes),
    actualPerHour: perHour(actual, actualDurationMinutes),
    plannedWaterMl,
    actualWaterMl,
    plannedDurationMinutes,
    actualDurationMinutes,
    adherencePct,
  };
}

/**
 * Déduit, pour chaque produit de l'inventaire, la quantité prévue à consommer :
 * total des unités planifiées dans le plan de consommation (`intakes`), à défaut
 * la quantité emportée (`items`).
 */
export function plannedQuantitiesByProduct(event: NutritionEvent): Map<string, number> {
  const byIntake = new Map<string, number>();
  for (const intake of event.intakes ?? []) {
    if (intake.kind === 'water' || !intake.productId) continue;
    byIntake.set(intake.productId, (byIntake.get(intake.productId) ?? 0) + (intake.quantity ?? 0));
  }
  const result = new Map<string, number>();
  for (const item of event.items ?? []) {
    result.set(item.productId, byIntake.get(item.productId) ?? item.quantity ?? 0);
  }
  // Produits planifiés mais absents de l'inventaire (sécurité).
  for (const [productId, qty] of byIntake) {
    if (!result.has(productId)) result.set(productId, qty);
  }
  return result;
}
