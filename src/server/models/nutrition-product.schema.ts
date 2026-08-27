import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Schéma d'un produit nutritionnel (collection `nutrition_products`).
 * Rattaché à une catégorie et porteur de sa composition pour 1 unité.
 *
 * Bibliothèque communautaire : un produit porte désormais un propriétaire
 * (`ownerId`), une visibilité (`visibility`) et un statut de modération
 * (`moderationStatus`). Un produit créé par un utilisateur est privé et en
 * attente de validation ; validé par un administrateur, il devient public et
 * rejoint le catalogue commun. Les produits historiques (sans propriétaire)
 * sont considérés comme publics et validés (voir la migration dédiée).
 */
const nutritionProductSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'NutritionCategory', required: true },
    brand: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    /** Poids unitaire en grammes. */
    unitWeight: { type: Number, required: true, min: 0 },
    /** Apport énergétique en kcal. */
    energy: { type: Number, required: true, min: 0 },
    /** Glucides en grammes. */
    carbs: { type: Number, required: true, min: 0 },
    /** Lipides en grammes. */
    fats: { type: Number, required: true, min: 0 },
    /** Protéines en grammes. */
    proteins: { type: Number, required: true, min: 0 },
    /** Sodium en milligrammes. */
    sodium: { type: Number, required: true, min: 0 },
    /** Photo du produit (data URL base64), facultative. */
    image: { type: String },
    /**
     * URL fabricant/produit (facultative). Aide l'administrateur à vérifier
     * rapidement les valeurs nutritionnelles avant validation.
     */
    sourceUrl: { type: String, trim: true },
    /**
     * Propriétaire du produit. `null` pour les produits « système » (catalogue
     * historique importé/administré, sans auteur nominatif).
     */
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /** Visibilité : privée (visible du seul propriétaire) ou publique (catalogue commun). */
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    /**
     * Cycle de modération :
     * - `pending`   : soumis, en attente de revue administrateur ;
     * - `approved`  : validé, publié dans le catalogue commun ;
     * - `rejected`  : refusé (reste utilisable en privé par le propriétaire) ;
     * - `archived`  : retiré du catalogue après avoir été public (obsolète/doublon).
     */
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'archived'],
      default: 'pending',
    },
    /** Motif du refus, communiqué au propriétaire (statut `rejected`). */
    rejectionReason: { type: String, trim: true },
    /** Administrateur ayant effectué la dernière décision de modération. */
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /** Date de la dernière décision de modération. */
    reviewedAt: { type: Date },
  },
  {
    collection: 'nutrition_products',
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = ret['_id'];
        delete ret['_id'];
        return ret;
      },
    },
  },
);

nutritionProductSchema.index({ categoryId: 1 });
// File de modération administrateur (produits en attente / par statut).
nutritionProductSchema.index({ moderationStatus: 1 });
// Listing d'un utilisateur : ses produits + le catalogue public.
nutritionProductSchema.index({ ownerId: 1, visibility: 1 });
// Tri par défaut du catalogue (pagination par offset).
nutritionProductSchema.index({ brand: 1, name: 1 });

export type NutritionProductDocument = InferSchemaType<typeof nutritionProductSchema>;

export const NutritionProductModel =
  models['NutritionProduct'] ?? model('NutritionProduct', nutritionProductSchema);
