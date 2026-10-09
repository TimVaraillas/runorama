import type { NutritionIntake, NutritionProduct, NutrientGoalKey, Flask } from '../models';
import { FLASK_DEFAULT_VOLUME_ML } from '../models';

/** Identifiant réservé au produit virtuel « Eau » (palette illimitée). */
export const WATER_PRODUCT_ID = '__water__';

/** Volume d'eau par défaut d'une prise, en millilitres (≈ grammes). */
export const WATER_DEFAULT_ML = 500;

/** Préfixe des identifiants de produit synthétique dérivé d'une flasque. */
export const FLASK_PRODUCT_PREFIX = '__flask__:';

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
  sodium: 0,
};

/** Vrai si le produit est le produit virtuel « Eau ». */
export function isWaterProduct(product: Pick<NutritionProduct, 'id'>): boolean {
  return product.id === WATER_PRODUCT_ID;
}

/** Identifiant de produit synthétique représentant une flasque. */
export function flaskProductId(flaskId: string): string {
  return `${FLASK_PRODUCT_PREFIX}${flaskId}`;
}

/** Vrai si l'identifiant correspond à un produit synthétique de flasque. */
export function isFlaskProductId(id: string | undefined): boolean {
  return !!id && id.startsWith(FLASK_PRODUCT_PREFIX);
}

/** Extrait l'identifiant de flasque d'un identifiant de produit synthétique. */
export function flaskIdFromProductId(id: string): string {
  return id.slice(FLASK_PRODUCT_PREFIX.length);
}

/**
 * Vrai si le produit relève de l'hydratation (eau virtuelle ou flasque) : son
 * `unitWeight` représente alors un volume (mL) et compte pour l'objectif eau.
 */
export function isHydrationProduct(product: Pick<NutritionProduct, 'id'>): boolean {
  return isWaterProduct(product) || isFlaskProductId(product.id);
}

/**
 * Nombre d'unités de produit (boisson) contenues dans une flasque, à partir de
 * sa dose en grammes (défaut : une portion = `product.unitWeight`).
 */
export function flaskDoseUnits(flask: Pick<Flask, 'doseGrams'>, product: NutritionProduct): number {
  if (!product.unitWeight || product.unitWeight <= 0) return 0;
  const dose = flask.doseGrams && flask.doseGrams > 0 ? flask.doseGrams : product.unitWeight;
  return dose / product.unitWeight;
}

/** Volume d'une flasque (mL), borné à une valeur positive. */
export function flaskVolumeMl(flask: Pick<Flask, 'volumeMl'>): number {
  return flask.volumeMl && flask.volumeMl > 0 ? flask.volumeMl : FLASK_DEFAULT_VOLUME_ML;
}

/**
 * Construit le produit synthétique représentant une flasque sur le plan : son
 * `unitWeight` vaut le volume (mL) et ses apports valent ceux de la boisson
 * associée mis à l'échelle de la dose. Sans boisson, c'est de l'eau pure.
 */
export function buildFlaskProduct(flask: Flask, boisson?: NutritionProduct): NutritionProduct {
  const volume = flaskVolumeMl(flask);
  const units = boisson ? flaskDoseUnits(flask, boisson) : 0;
  const name = flask.name?.trim() || boisson?.name || 'Eau';
  return {
    id: flaskProductId(flask.id),
    categoryId: boisson?.categoryId ?? '',
    brand: boisson?.brand ?? '',
    name,
    image: boisson?.image,
    unitWeight: volume,
    energy: boisson ? boisson.energy * units : 0,
    carbs: boisson ? boisson.carbs * units : 0,
    fats: boisson ? boisson.fats * units : 0,
    proteins: boisson ? boisson.proteins * units : 0,
    sodium: boisson ? boisson.sodium * units : 0,
  };
}

/**
 * Apport unitaire d'un produit pour un objectif donné. Gère les clés dérivées :
 * `weight` = poids d'un paquet ; `water` = volume (mL) pour l'eau uniquement.
 * Les autres clés lisent directement le champ nutritionnel du produit.
 */
export function goalAmountPerUnit(product: NutritionProduct, key: NutrientGoalKey): number {
  switch (key) {
    case 'weight':
      return isHydrationProduct(product) ? 0 : product.unitWeight;
    case 'water':
      return isHydrationProduct(product) ? product.unitWeight : 0;
    default:
      return product[key];
  }
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
  if (isWaterIntake(intake)) {
    if (intake.flaskId) return map.get(flaskProductId(intake.flaskId)) ?? WATER_PRODUCT;
    return WATER_PRODUCT;
  }
  return intake.product ?? map.get(intake.productId ?? '');
}
