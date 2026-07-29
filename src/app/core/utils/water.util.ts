import type { NutritionIntake, NutritionProduct } from '../models';

/** Identifiant réservé au produit virtuel « Eau » (palette illimitée). */
export const WATER_PRODUCT_ID = '__water__';

/** Volume d'eau par défaut d'une prise, en millilitres (≈ grammes). */
export const WATER_DEFAULT_ML = 500;

/**
 * Produit virtuel représentant l'eau dans la palette et sur la timeline.
 *
 * L'eau n'existe pas dans l'inventaire : elle est toujours disponible, en
 * quantité illimitée. Ce produit synthétique sert uniquement à l'affichage et
 * aux calculs (poids), sans apport nutritionnel.
 */
export const WATER_PRODUCT: NutritionProduct = {
  id: WATER_PRODUCT_ID,
  categoryId: '',
  brand: '',
  name: 'Eau',
  unitWeight: WATER_DEFAULT_ML,
  energy: 0,
  carbs: 0,
  fats: 0,
  proteins: 0,
  salt: 0,
};

/** Vrai si le produit est le produit virtuel « Eau ». */
export function isWaterProduct(product: Pick<NutritionProduct, 'id'>): boolean {
  return product.id === WATER_PRODUCT_ID;
}

/** Vrai si la prise correspond à de l'eau (illimitée, sans produit réel). */
export function isWaterIntake(intake: Pick<NutritionIntake, 'kind'>): boolean {
  return intake.kind === 'water';
}

/**
 * Résout le produit associé à une prise, en tenant compte de l'eau : les prises
 * d'eau sont rattachées au produit virtuel, les autres au produit dénormalisé
 * ou au catalogue.
 */
export function resolveIntakeProduct(
  intake: NutritionIntake,
  map: Map<string, NutritionProduct>,
): NutritionProduct | undefined {
  if (isWaterIntake(intake)) return WATER_PRODUCT;
  return intake.product ?? map.get(intake.productId ?? '');
}
