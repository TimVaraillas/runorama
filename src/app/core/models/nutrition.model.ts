/**
 * Modèles du volet nutrition : catégories et produits.
 */

import type { RouteWaypoint } from './gpx.model';

/** Une catégorie de produit (ex : « Gels », « Boissons d'effort »). */
export interface NutritionCategory {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Visibilité d'un produit : privé (propriétaire seul) ou public (catalogue commun). */
export type ProductVisibility = 'private' | 'public';

/**
 * Statut de modération d'un produit communautaire.
 * - `pending`   : soumis, en attente de revue administrateur ;
 * - `approved`  : validé, publié dans le catalogue commun ;
 * - `rejected`  : refusé (reste utilisable en privé par le propriétaire) ;
 * - `archived`  : retiré du catalogue après avoir été public (obsolète/doublon).
 */
export type ProductModerationStatus = 'pending' | 'approved' | 'rejected' | 'archived';

/** Propriétaire d'un produit communautaire (exposé aux administrateurs). */
export interface ProductOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  /** URL fabricant/produit (facultative), utile à la vérification par l'admin. */
  sourceUrl?: string;
  /**
   * Propriétaire du produit. `null`/absent pour les produits « système »
   * (catalogue historique sans auteur nominatif).
   */
  ownerId?: string | null;
  /** Propriétaire dénormalisé (renseigné uniquement pour les administrateurs). */
  owner?: ProductOwner;
  /** Visibilité : privée ou publique (catalogue commun). */
  visibility?: ProductVisibility;
  /** Statut de modération du produit. */
  moderationStatus?: ProductModerationStatus;
  /** Motif du refus, communiqué au propriétaire (statut `rejected`). */
  rejectionReason?: string;
  /** Date de la dernière décision de modération (ISO). */
  reviewedAt?: string;
  /**
   * Données personnelles (privées) de l'utilisateur courant sur ce produit,
   * hydratées par l'API. Indépendantes du produit partagé.
   */
  /** Produit épinglé comme favori par l'utilisateur courant. */
  favorite?: boolean;
  /** Note personnelle libre de l'utilisateur courant (retour d'expérience). */
  comment?: string;
  /** Dernière appréciation gustative (0 à 5) de l'utilisateur courant. */
  taste?: number;
  /** Dernière tolérance digestive (0 à 5) de l'utilisateur courant. */
  tolerance?: number;
  /** Nombre total d'unités consommées par l'utilisateur (courses finalisées). */
  usageTotal?: number;
  /** Nombre d'évènements finalisés ayant utilisé le produit. */
  eventCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Un produit emporté avec sa quantité (ligne d'inventaire). */
export interface RaceStrategyItem {
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
 * Nutriments pouvant être fixés comme objectif horaire. Les clés
 * correspondent aux champs numériques d'un {@link NutritionProduct}, ce qui
 * permet un calcul générique des apports planifiés.
 */
export type NutrientGoalKey = 'energy' | 'carbs' | 'fats' | 'proteins' | 'sodium' | 'weight';

/** Objectif horaire pour un nutriment donné. */
export interface NutritionGoal {
  /** Valeur cible horaire (kcal/h, g/h ou mg/h selon le nutriment). */
  hourly: number;
  /** Objectif pris en compte (jauges, récap, PDF) ou ignoré. */
  enabled: boolean;
}

/** Objectifs horaires par nutriment. */
export type NutritionGoals = Record<NutrientGoalKey, NutritionGoal>;

/** Métadonnées d'affichage et de configuration d'un objectif nutritionnel. */
export interface NutrientGoalMeta {
  key: NutrientGoalKey;
  label: string;
  unit: string;
  /**
   * Mode de comptabilisation : `hourly` (besoin horaire × chrono, comparé à
   * l'emporté) ou `total` (cible unique sur toute la course).
   */
  mode: 'hourly' | 'total';
  /** Pas de saisie recommandé dans le formulaire. */
  step: number;
  /** Borne haute du curseur de réglage. */
  max: number;
  /** Intervalle entre deux graduations du curseur. */
  tickStep: number;
  /** Borne basse de la zone recommandée (surlignée). Absente si non pertinente. */
  recommendedMin?: number;
  /** Borne haute de la zone recommandée (surlignée). Absente si non pertinente. */
  recommendedMax?: number;
  /** Valeur horaire par défaut à la création. */
  defaultHourly: number;
  /** Objectif actif par défaut à la création. */
  defaultEnabled: boolean;
  /** Repère de fourchette adaptée selon le type de pratique. */
  hint: string;
}

/**
 * Catalogue ordonné des nutriments configurables comme objectif, avec leurs
 * valeurs par défaut. Source unique de vérité pour le formulaire, les jauges,
 * le récapitulatif horaire et l'export PDF.
 */
export const NUTRIENT_GOALS: readonly NutrientGoalMeta[] = [
  {
    key: 'carbs',
    label: 'Glucides',
    unit: 'g',
    mode: 'hourly',
    step: 5,
    max: 160,
    tickStep: 20,
    recommendedMin: 30,
    recommendedMax: 90,
    defaultHourly: 50,
    defaultEnabled: true,
    hint: 'Nerf de la performance : ~30 g/h sur les sorties courtes ou faciles, 60 g/h en endurance soutenue, jusqu\u2019à 90 g/h (mélange glucose-fructose) sur marathon et ultra.',
  },
  {
    key: 'proteins',
    label: 'Protéines',
    unit: 'g',
    mode: 'hourly',
    step: 1,
    max: 40,
    tickStep: 10,
    recommendedMin: 5,
    recommendedMax: 10,
    defaultHourly: 10,
    defaultEnabled: true,
    hint: 'Surtout utile sur les efforts très longs (> 4 h) : ~5 à 10 g/h pour limiter la dégradation musculaire. Inutile sur les formats courts.',
  },
  {
    key: 'sodium',
    label: 'Sodium',
    unit: 'mg',
    mode: 'hourly',
    step: 50,
    max: 1600,
    tickStep: 200,
    recommendedMin: 300,
    recommendedMax: 1000,
    defaultHourly: 500,
    defaultEnabled: true,
    hint: '300 à 600 mg/h en conditions tempérées ; 700 à 1000+ mg/h par forte chaleur ou si vous transpirez beaucoup (sueur salée, traces blanches sur la peau).',
  },
  {
    key: 'energy',
    label: 'Énergie',
    unit: 'kcal',
    mode: 'hourly',
    step: 10,
    max: 1200,
    tickStep: 200,
    defaultHourly: 200,
    defaultEnabled: false,
    hint: "Pas d'objectif fixe : l'apport énergétique découle des glucides, lipides et protéines consommés. Inutile de viser un chiffre précis — se focaliser sur les calories peut favoriser les troubles du comportement alimentaire.",
  },
  {
    key: 'fats',
    label: 'Lipides',
    unit: 'g',
    mode: 'hourly',
    step: 1,
    max: 50,
    tickStep: 10,
    defaultHourly: 15,
    defaultEnabled: false,
    hint: "Pas d'objectif fixe : peu mobilisés à l'effort et lents à digérer. Ne cherchez pas un chiffre précis — surveiller les graisses peut favoriser les troubles du comportement alimentaire.",
  },
  {
    key: 'weight',
    label: 'Poids',
    unit: 'g',
    mode: 'total',
    step: 50,
    max: 4000,
    tickStep: 500,
    defaultHourly: 500,
    defaultEnabled: false,
    hint: "Poids total de nourriture solide à emporter (l'eau est gérée à part). Visez le minimum couvrant vos besoins pour alléger le sac.",
  },
] as const;

/** Type de ravitaillement (cumulable). */
export type AidStationType =
  | 'WATER_POINT'
  | 'FOOD'
  | 'ASSISTANCE'
  | 'DROP_BAG'
  | 'BASE_LIFE';

/** Métadonnées d'affichage d'un type de ravitaillement. */
export interface AidStationTypeMeta {
  key: AidStationType;
  /** Libellé court (badge, table). */
  label: string;
  /** Tonalité du badge associé. */
  tone: 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';
}

/**
 * Catalogue ordonné des types de ravitaillement. Source unique de vérité pour
 * les badges, le formulaire et la table.
 */
export const AID_STATION_TYPES: readonly AidStationTypeMeta[] = [
  { key: 'WATER_POINT', label: "Point d'eau", tone: 'brand' },
  { key: 'FOOD', label: 'Nourriture', tone: 'success' },
  { key: 'ASSISTANCE', label: 'Assistance', tone: 'accent' },
  { key: 'DROP_BAG', label: 'Drop bag', tone: 'warning' },
  { key: 'BASE_LIFE', label: 'Base de vie', tone: 'danger' },
] as const;

/** Nature d'un élément logistique : produit du catalogue ou matériel libre. */
export type LogisticItemKind = 'product' | 'gear';

/**
 * Vecteur logistique d'un ravitaillement : les éléments à récupérer/déposer
 * transitent soit par un drop bag, soit par l'assistance. Une seule valeur
 * s'applique à toute la section logistique de la station.
 */
export type AidStationLogisticVia = 'DROP_BAG' | 'ASSISTANCE';

/**
 * Élément logistique d'un ravitaillement (à récupérer ou à déposer) : un
 * produit du catalogue ou du matériel libre.
 */
export interface LogisticItem {
  kind: LogisticItemKind;
  /** Produit du catalogue (si `kind === 'product'`). */
  productId?: string;
  /** Produit dénormalisé (optionnel, pour l'affichage). */
  product?: NutritionProduct;
  /** Libellé libre du matériel (si `kind === 'gear'`). */
  label?: string;
  /** Quantité (unités). */
  quantity: number;
}

/** Origine d'une consommation prévue sur place. */
export type AidConsumptionSource = 'FROM_INVENTORY' | 'AT_AID_STATION';

/**
 * Consommation prévue sur place à un ravitaillement : issue de l'inventaire du
 * coureur ou fournie sur place (catalogue ou hors catalogue avec macros libres).
 */
export interface AidConsumption {
  id: string;
  source: AidConsumptionSource;
  /** Produit du catalogue (facultatif pour un produit sur place hors catalogue). */
  productId?: string;
  /** Produit dénormalisé (optionnel, pour l'affichage et les calculs). */
  product?: NutritionProduct;
  /** Libellé libre pour un produit sur place hors catalogue (ex : « Coca »). */
  label?: string;
  /** Quantité en unités. */
  quantity: number;
  /** Volume en millilitres (liquides). */
  amountMl?: number;
  /** Macros estimées (hors catalogue) — facultatives. */
  energy?: number;
  carbs?: number;
  fats?: number;
  proteins?: number;
  sodium?: number;
  waterMl?: number;
}

/**
 * Un ravitaillement positionné sur le parcours. La position est exprimée
 * **depuis le départ** (source de vérité) ; les valeurs de segment relatives au
 * ravitaillement précédent sont calculées et jamais stockées.
 */
export interface AidStation {
  /** Identifiant unique (généré côté client). */
  id: string;
  name: string;
  /** Note libre et personnelle. */
  note?: string;
  /** Accès au ravitaillement : adresse et/ou coordonnées GPS (pour l'assistance). */
  accessInfo?: string;
  /** Types cumulables. */
  types: AidStationType[];
  /** Distance depuis le départ (km). */
  distanceFromStart?: number;
  /** Dénivelé positif cumulé depuis le départ (m). */
  elevationGainFromStart?: number;
  /** Latitude (degrés) — dérivée du GPX ou saisie pour un positionnement précis. */
  latitude?: number;
  /** Longitude (degrés) — dérivée du GPX ou saisie pour un positionnement précis. */
  longitude?: number;
  /** Altitude (m) — dérivée du GPX au point de passage. */
  altitude?: number;
  /** Temps estimé de passage depuis le départ (minutes) — clé de tri. */
  estimatedDurationFromStart: number;
  /** Éléments à récupérer par le coureur. */
  pickup: LogisticItem[];
  /** Éléments à déposer par le coureur. */
  drop: LogisticItem[];
  /**
   * Vecteur logistique de la section (drop bag ou assistance). Défini seulement
   * si le ravitaillement est de type `ASSISTANCE` et/ou `DROP_BAG`.
   */
  logisticVia?: AidStationLogisticVia;
  /** Tâches à faire sur place (texte libre). */
  todo: string[];
  /** Consommations prévues sur place. */
  consumptions: AidConsumption[];
}

/**
 * Propriétaire d'une stratégie alimentaire, tel qu'exposé aux administrateurs.
 */
export interface RaceStrategyOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Étiquette d'une stratégie : nature de la sortie/évènement associé.
 */
export type RaceStrategyCategory =
  | 'training'
  | 'long-run'
  | 'race';

/** Description d'une étiquette de stratégie (libellé + tonalité du badge). */
export interface RaceStrategyCategoryMeta {
  value: RaceStrategyCategory;
  label: string;
  /** Tonalité du badge d'affichage (voir `BadgeTone`). */
  tone: 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';
}

/** Étiquettes disponibles, dans l'ordre d'affichage. */
export const RACE_STRATEGY_CATEGORIES: readonly RaceStrategyCategoryMeta[] = [
  { value: 'training', label: 'Entraînement', tone: 'neutral' },
  { value: 'long-run', label: 'Sortie longue', tone: 'accent' },
  { value: 'race', label: 'Course', tone: 'danger' },
];

/** Retrouve les métadonnées d'une étiquette à partir de sa valeur. */
export function raceStrategyCategoryMeta(
  value: RaceStrategyCategory | undefined,
): RaceStrategyCategoryMeta | undefined {
  return RACE_STRATEGY_CATEGORIES.find((category) => category.value === value);
}

/**
 * Un évènement / stratégie alimentaire : associe un évènement (course, sortie
 * longue) à une liste de produits emportés et à des besoins horaires cibles.
 */
export interface RaceStrategy {
  id: string;
  name: string;
  description?: string;
  /** Date au format ISO `YYYY-MM-DD`. */
  date: string;
  location?: string;
  /** Étiquette : nature de la sortie/évènement (facultative). */
  category?: RaceStrategyCategory;
  /** Distance en kilomètres. */
  distance?: number;
  /** Dénivelé positif en mètres. */
  elevationGain?: number;
  /** Dénivelé négatif en mètres. */
  elevationLoss?: number;
  /** Chrono cible en minutes. */
  targetTimeMinutes?: number;
  /** Objectifs horaires par nutriment (énergie, glucides, lipides, …). */
  goals: NutritionGoals;
  /** Inventaire des produits emportés. */
  items: RaceStrategyItem[];
  /** Granularité (minutes) des séquences du plan de consommation. */
  planSequenceMinutes?: PlanSequenceMinutes;
  /** Répartition des prises sur le parcours (plan de consommation). */
  intakes?: NutritionIntake[];
  /** Ravitaillements positionnés sur le parcours (0 à N). */
  aidStations?: AidStation[];
  /** Points de passage légers (checkpoints, sommets, points personnalisés). */
  waypoints?: RouteWaypoint[];
  /** Identifiant de la trace GPX associée (parcours réel), si importée. */
  gpxTrackId?: string;
  /** Résumé GPX : distance totale (km). */
  gpxDistance?: number;
  /** Résumé GPX : dénivelé positif total (m). */
  gpxElevationGain?: number;
  /** Résumé GPX : dénivelé négatif total (m). */
  gpxElevationLoss?: number;
  /**
   * Propriétaire de la stratégie (renseigné uniquement pour les
   * administrateurs, qui accèdent aux stratégies de tous les utilisateurs).
   */
  owner?: RaceStrategyOwner;
  createdAt?: string;
  updatedAt?: string;
}
