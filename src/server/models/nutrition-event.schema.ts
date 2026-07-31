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
 * une fenêtre de temps du parcours (plan de consommation).
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
  },
  { _id: false },
);

/**
 * Schéma d'un évènement / stratégie alimentaire (collection `nutrition_events`).
 * Associe un évènement (course, sortie longue) à une liste de produits emportés
 * et à des objectifs horaires par nutriment.
 */
const nutritionEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    /** Date de l'évènement au format ISO `YYYY-MM-DD`. */
    date: { type: String, required: true },
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
    /** Granularité (minutes) des séquences du plan de consommation. */
    planSequenceMinutes: { type: Number, enum: [5, 10, 15, 20], default: 10 },
    /** Répartition des prises sur le parcours (plan de consommation). */
    intakes: { type: [intakeSchema], default: [] },
  },
  {
    collection: 'nutrition_events',
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

nutritionEventSchema.index({ date: 1 });

export type NutritionEventDocument = InferSchemaType<typeof nutritionEventSchema>;

export const NutritionEventModel =
  models['NutritionEvent'] ?? model('NutritionEvent', nutritionEventSchema);
