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
  /** Sodium en milligrammes. */
  sodium: number;
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

/** Granularité (en minutes) d'une séquence du plan de consommation. */
export type PlanSequenceMinutes = 5 | 10 | 15 | 20;

/**
 * Une prise planifiée : une unité d'un produit consommée sur une fenêtre de
 * temps du parcours (peut couvrir plusieurs séquences).
 */
export interface NutritionIntake {
  /** Identifiant unique de la prise (généré côté client). */
  id: string;
  /**
   * Nature de la prise : un produit de l'inventaire (par défaut) ou de l'eau
   * (illimitée, sans produit réel).
   */
  kind?: 'product' | 'water';
  /** Identifiant du produit consommé (absent pour une prise d'eau). */
  productId?: string;
  /** Produit dénormalisé (optionnel, pour l'affichage et les calculs). */
  product?: NutritionProduct;
  /** Instant de début de la prise, en minutes depuis le départ. */
  startMinute: number;
  /** Durée de consommation en minutes (multiple de la granularité). */
  durationMinutes: number;
  /** Nombre d'unités consommées sur cette prise (1 par défaut). */
  quantity: number;
}

/**
 * Propriétaire d'une stratégie alimentaire, tel qu'exposé aux administrateurs.
 */
export interface NutritionEventOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Un évènement / stratégie alimentaire : associe un évènement (course, sortie
 * longue) à une liste de produits emportés et à des besoins horaires cibles.
 */
export interface NutritionEvent {  id: string;
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
  /** Granularité (minutes) des séquences du plan de consommation. */
  planSequenceMinutes?: PlanSequenceMinutes;
  /** Répartition des prises sur le parcours (plan de consommation). */
  intakes?: NutritionIntake[];
  /**
   * Propriétaire de la stratégie (renseigné uniquement pour les
   * administrateurs, qui accèdent aux stratégies de tous les utilisateurs).
   */
  owner?: NutritionEventOwner;
  createdAt?: string;
  updatedAt?: string;
}
