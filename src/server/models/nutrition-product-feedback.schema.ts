import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Schéma des données personnelles d'un utilisateur à propos d'un produit
 * (collection `nutrition_product_feedback`).
 *
 * Ces données sont **privées** : chaque document rattache un utilisateur
 * (`userId`) à un produit (`productId`) et regroupe tout ce que cet utilisateur
 * enregistre à titre personnel sur ce produit. Aujourd'hui :
 * - `favorite` : produit épinglé pour le retrouver rapidement dans le catalogue ;
 * - `comment`  : note libre (retour d'expérience), visible du seul auteur.
 *
 * Ce document est volontairement extensible : il pourra accueillir de futures
 * évaluations personnelles (goût, digestion, tolérance, etc.) sans changer de
 * structure ni impacter le produit partagé.
 *
 * Un seul document existe par couple (utilisateur, produit) : l'index unique
 * `{ userId, productId }` garantit l'unicité et permet l'upsert côté API.
 */
const nutritionProductFeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'NutritionProduct', required: true },
    /** Produit marqué comme favori par l'utilisateur. */
    favorite: { type: Boolean, default: false },
    /** Note personnelle libre (retour d'expérience), privée. */
    comment: { type: String, trim: true, default: '' },
  },
  {
    collection: 'nutrition_product_feedback',
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

// Un seul enregistrement par couple (utilisateur, produit).
nutritionProductFeedbackSchema.index({ userId: 1, productId: 1 }, { unique: true });
// Récupération rapide des favoris d'un utilisateur.
nutritionProductFeedbackSchema.index({ userId: 1, favorite: 1 });

export type NutritionProductFeedbackDocument = InferSchemaType<typeof nutritionProductFeedbackSchema>;

export const NutritionProductFeedbackModel =
  models['NutritionProductFeedback'] ??
  model('NutritionProductFeedback', nutritionProductFeedbackSchema);
