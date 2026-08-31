import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Ligne d'inventaire : un produit nutritionnel emporté avec sa quantité.
 */
const eventItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'NutritionProduct', required: true },
    /** Nombre d'unités emportées. */
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
);

/**
 * Prise planifiée : une (ou plusieurs) unité(s) d'un produit consommée(s) sur
 * une fenêtre de temps du parcours (plan de nutrition).
 */
const intakeSchema = new Schema(
  {
    /** Identifiant unique généré côté client. */
    id: { type: String, required: true },
    /** Nature de la prise : produit de l'inventaire ou eau (illimitée). */
    kind: { type: String, enum: ['product', 'water'], default: 'product' },
    /** Produit consommé (requis sauf pour une prise d'eau). */
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'NutritionProduct',
      required: function (this: { kind?: string }) {
        return this.kind !== 'water';
      },
    },
    /** Début de la prise, en minutes depuis le départ. */
    startMinute: { type: Number, required: true, min: 0 },
    /** Durée de consommation en minutes. */
    durationMinutes: { type: Number, required: true, min: 1 },
    /** Nombre d'unités consommées sur cette prise. */
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
);

/**
 * Types possibles d'un ravitaillement (un ravitaillement peut en cumuler
 * plusieurs). Source de vérité partagée avec le modèle front.
 */
const AID_STATION_TYPES = ['WATER_POINT', 'FOOD', 'ASSISTANCE', 'DROP_BAG', 'BASE_LIFE'] as const;

/**
 * Élément logistique d'un ravitaillement : soit un produit du catalogue
 * (`kind: 'product'` + `productId`), soit du matériel libre (`kind: 'gear'` +
 * `label`). Utilisé pour les listes « à récupérer » et « à déposer ».
 */
const logisticItemSchema = new Schema(
  {
    /** Nature : produit du catalogue ou matériel libre. */
    kind: { type: String, enum: ['product', 'gear'], required: true, default: 'product' },
    /** Produit du catalogue (requis si `kind === 'product'`). */
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'NutritionProduct',
      required: function (this: { kind?: string }) {
        return this.kind === 'product';
      },
    },
    /** Libellé libre (matériel), ex : « Lampe frontale ». */
    label: { type: String, trim: true },
    /** Quantité (unités). */
    quantity: { type: Number, min: 1, default: 1 },
  },
  { _id: false },
);

/**
 * Consommation prévue sur place à un ravitaillement. `source` distingue un
 * produit issu de l'inventaire du coureur (`FROM_INVENTORY`) d'un produit
 * fourni sur place (`AT_AID_STATION`), catalogue ou non (macros libres).
 */
const aidConsumptionSchema = new Schema(
  {
    /** Identifiant unique généré côté client. */
    id: { type: String, required: true },
    /** Origine de la consommation. */
    source: {
      type: String,
      enum: ['FROM_INVENTORY', 'AT_AID_STATION'],
      required: true,
      default: 'AT_AID_STATION',
    },
    /** Produit du catalogue (facultatif pour un produit sur place hors catalogue). */
    productId: { type: Schema.Types.ObjectId, ref: 'NutritionProduct' },
    /** Libellé libre pour un produit sur place hors catalogue (ex : « Coca »). */
    label: { type: String, trim: true },
    /** Quantité en unités. */
    quantity: { type: Number, min: 0, default: 1 },
    /** Volume en millilitres (pour les liquides). */
    amountMl: { type: Number, min: 0 },
    /** Macros estimées (hors catalogue) — facultatives. */
    energy: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fats: { type: Number, min: 0 },
    proteins: { type: Number, min: 0 },
    sodium: { type: Number, min: 0 },
    waterMl: { type: Number, min: 0 },
  },
  { _id: false },
);

/**
 * Ravitaillement positionné sur le parcours. La position est exprimée **depuis
 * le départ** (source de vérité) ; les valeurs relatives au ravitaillement
 * précédent (segments) sont calculées à la volée et jamais stockées.
 */
const aidStationSchema = new Schema(
  {
    /** Identifiant unique généré côté client. */
    id: { type: String, required: true },
    /** Nom du ravitaillement (ex : « Courmayeur »). */
    name: { type: String, required: true, trim: true },
    /** Note libre et personnelle. */
    note: { type: String, trim: true, default: '' },
    /** Accès : adresse et/ou coordonnées GPS (pour l'assistance). */
    accessInfo: { type: String, trim: true, default: '' },
    /** Types cumulables (point d'eau, nourriture, assistance…). */
    types: { type: [String], enum: AID_STATION_TYPES, default: [] },
    /** Distance depuis le départ (km). */
    distanceFromStart: { type: Number, min: 0 },
    /** Dénivelé positif cumulé depuis le départ (m). */
    elevationGainFromStart: { type: Number, min: 0 },
    /** Latitude (degrés) — dérivée du GPX ou saisie pour un positionnement précis. */
    latitude: { type: Number, min: -90, max: 90 },
    /** Longitude (degrés) — dérivée du GPX ou saisie pour un positionnement précis. */
    longitude: { type: Number, min: -180, max: 180 },
    /** Altitude (m) — dérivée du GPX au point de passage. */
    altitude: { type: Number },
    /** Temps estimé de passage depuis le départ (minutes) — clé de tri. */
    estimatedDurationFromStart: { type: Number, min: 0, required: true },
    /** Éléments à récupérer par le coureur. */
    pickup: { type: [logisticItemSchema], default: [] },
    /** Éléments à déposer par le coureur. */
    drop: { type: [logisticItemSchema], default: [] },
    /**
     * Vecteur logistique de la section (drop bag ou assistance). Défini seulement
     * si le ravitaillement est de type `ASSISTANCE` et/ou `DROP_BAG`.
     */
    logisticVia: { type: String, enum: ['DROP_BAG', 'ASSISTANCE'] },
    /** Tâches à faire sur place (texte libre). */
    todo: { type: [String], default: [] },
    /** Consommations prévues sur place. */
    consumptions: { type: [aidConsumptionSchema], default: [] },
  },
  { _id: false },
);

/**
 * Objectif horaire pour un nutriment : valeur cible (kcal/h, g/h ou mg/h) et
 * indicateur d'activation (objectif pris en compte ou ignoré).
 */
const goalSchema = new Schema(
  {
    hourly: { type: Number, required: true, min: 0, default: 0 },
    enabled: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

/**
 * Objectifs horaires par nutriment. Les valeurs par défaut reprennent la
 * configuration proposée à la création d'une stratégie.
 */
const goalsSchema = new Schema(
  {
    energy: { type: goalSchema, default: () => ({ hourly: 200, enabled: false }) },
    carbs: { type: goalSchema, default: () => ({ hourly: 50, enabled: true }) },
    fats: { type: goalSchema, default: () => ({ hourly: 15, enabled: false }) },
    proteins: { type: goalSchema, default: () => ({ hourly: 10, enabled: true }) },
    sodium: { type: goalSchema, default: () => ({ hourly: 500, enabled: true }) },
    /** Objectif de poids total de nourriture solide emportée (hors eau). */
    weight: { type: goalSchema, default: () => ({ hourly: 500, enabled: false }) },
  },
  { _id: false },
);

/**
 * Point de passage léger (checkpoint, sommet, point personnalisé). Contrairement
 * au ravitaillement, il ne porte ni logistique ni nutrition : juste une position
 * et un temps de passage estimé. Même base positionnelle que le ravitaillement.
 */
const waypointSchema = new Schema(
  {
    /** Identifiant unique généré côté client. */
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    /** Nature du point (hors ravitaillement, qui vit dans `aidStations`). */
    kind: { type: String, enum: ['CHECKPOINT', 'SUMMIT', 'CUSTOM'], required: true },
    /** Distance depuis le départ (km) — source de vérité du positionnement. */
    distanceFromStart: { type: Number, min: 0 },
    /** Dénivelé positif cumulé depuis le départ (m). */
    elevationGainFromStart: { type: Number, min: 0 },
    /** Latitude (degrés) — dérivée du GPX ou saisie. */
    latitude: { type: Number, min: -90, max: 90 },
    /** Longitude (degrés) — dérivée du GPX ou saisie. */
    longitude: { type: Number, min: -180, max: 180 },
    /** Altitude (m) — dérivée du GPX au point. */
    altitude: { type: Number },
    /** Temps de passage estimé depuis le départ (minutes). */
    estimatedDurationFromStart: { type: Number, min: 0 },
  },
  { _id: false },
);

/**
 * Schéma d'une **stratégie de course** (collection `race_strategies`).
 * Associe un évènement (course, sortie longue) à une liste de produits emportés
 * et à des objectifs horaires par nutriment.
 */
const raceStrategySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    /** Date de l'évènement au format ISO `YYYY-MM-DD`. */
    date: { type: String, required: true },
    /** Étiquette : nature de la sortie/évènement (facultative). */
    category: {
      type: String,
      enum: ['training', 'long-run', 'race'],
    },
    /** Lieu de l'évènement (facultatif). */
    location: { type: String, trim: true },
    /** Distance en kilomètres (facultative). */
    distance: { type: Number, min: 0 },
    /** Dénivelé positif en mètres (facultatif). */
    elevationGain: { type: Number, min: 0 },
    /** Dénivelé négatif en mètres (facultatif). */
    elevationLoss: { type: Number, min: 0 },
    /** Chrono cible exprimé en minutes (facultatif). */
    targetTimeMinutes: { type: Number, min: 0 },
    /** Objectifs horaires par nutriment. */
    goals: { type: goalsSchema, default: () => ({}) },
    /** Produits emportés (inventaire). */
    items: { type: [eventItemSchema], default: [] },
    /** Granularité (minutes) des séquences du plan de nutrition. */
    planSequenceMinutes: { type: Number, enum: [5, 10, 15, 20], default: 10 },
    /** Répartition des prises sur le parcours (plan de nutrition). */
    intakes: { type: [intakeSchema], default: [] },
    /** Ravitaillements positionnés sur le parcours (0 à N). */
    aidStations: { type: [aidStationSchema], default: [] },
    /** Points de passage légers (checkpoints, sommets, points personnalisés). */
    waypoints: { type: [waypointSchema], default: [] },
    /** Trace GPX associée (parcours réel), stockée dans `gpx_tracks`. */
    gpxTrackId: { type: Schema.Types.ObjectId, ref: 'GpxTrack' },
    /** Résumé dénormalisé du GPX (évite de charger la trace dans les listes). */
    gpxDistance: { type: Number, min: 0 },
    gpxElevationGain: { type: Number, min: 0 },
    gpxElevationLoss: { type: Number, min: 0 },
  },
  {
    collection: 'race_strategies',
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = ret['_id'];
        delete ret['_id'];
        return ret;
      },
    },
  },
);

raceStrategySchema.index({ date: 1 });

export type RaceStrategyDocument = InferSchemaType<typeof raceStrategySchema>;

export const RaceStrategyModel =
  models['RaceStrategy'] ?? model('RaceStrategy', raceStrategySchema);
