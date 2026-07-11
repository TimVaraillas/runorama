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

/** Un produit emporté avec sa quantité (ligne d'inventaire). */
export interface NutritionEventItem {
  /** Identifiant du produit associé. */
  productId: string;
  /** Produit dénormalisé (optionnel, pour l'affichage et les calculs). */
  product?: NutritionProduct;
  /** Nombre d'unités emportées. */
  quantity: number;
}

/**
 * Un évènement / stratégie alimentaire : associe un évènement (course, sortie
 * longue) à une liste de produits emportés et à des besoins horaires cibles.
 */
export interface NutritionEvent {
  id: string;
  name: string;
  description?: string;
  /** Date au format ISO `YYYY-MM-DD`. */
  date: string;
  location?: string;
  /** Distance en kilomètres. */
  distance?: number;
  /** Dénivelé positif en mètres. */
  elevationGain?: number;
  /** Dénivelé négatif en mètres. */
  elevationLoss?: number;
  /** Chrono cible en minutes. */
  targetTimeMinutes?: number;
  /** Besoin énergétique horaire en kcal/h. */
  hourlyEnergy: number;
  /** Besoin glucidique horaire en g/h. */
  hourlyCarbs: number;
  /** Inventaire des produits emportés. */
  items: NutritionEventItem[];
  createdAt?: string;
  updatedAt?: string;
}
