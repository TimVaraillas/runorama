import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Schéma d'une catégorie de produit nutritionnel (collection `nutrition_categories`).
 * Exemples : « Gels », « Boissons d'effort », « Barres ».
 */
const nutritionCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  {
    collection: 'nutrition_categories',
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

export type NutritionCategoryDocument = InferSchemaType<typeof nutritionCategorySchema>;

export const NutritionCategoryModel =
  models['NutritionCategory'] ?? model('NutritionCategory', nutritionCategorySchema);
