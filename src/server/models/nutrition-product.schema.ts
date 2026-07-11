import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Schéma d'un produit nutritionnel (collection `nutritionproducts`).
 * Rattaché à une catégorie et porteur de sa composition pour 1 unité.
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
    /** Sel en milligrammes. */
    salt: { type: Number, required: true, min: 0 },
    /** Photo du produit (data URL base64), facultative. */
    image: { type: String },
  },
  {
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

export type NutritionProductDocument = InferSchemaType<typeof nutritionProductSchema>;

export const NutritionProductModel =
  models['NutritionProduct'] ?? model('NutritionProduct', nutritionProductSchema);
