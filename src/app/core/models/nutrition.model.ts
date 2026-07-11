/**
 * Modèles du volet nutrition : catégories et produits.
 */

/** Une catégorie de produit (ex : « Gels », « Boissons d'effort »). */
export interface NutritionCategory {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Un produit nutritionnel avec sa composition pour une unité. */
export interface NutritionProduct {
  id: string;
  /** Identifiant de la catégorie associée. */
  categoryId: string;
  /** Catégorie dénormalisée (optionnelle, pour l'affichage). */
  category?: NutritionCategory;
  brand: string;
  name: string;
  /** Poids unitaire en grammes. */
  unitWeight: number;
  /** Apport énergétique en kcal. */
  energy: number;
  /** Glucides en grammes. */
  carbs: number;
  /** Lipides en grammes. */
  fats: number;
  /** Protéines en grammes. */
  proteins: number;
  /** Sel en milligrammes. */
  salt: number;
  /** Photo du produit (data URL base64), facultative. */
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}
