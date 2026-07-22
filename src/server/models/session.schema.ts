import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Cible d'effort d'un exercice.
 * `pace` (km/h) et `pulse` (bpm) acceptent une valeur unique ou une plage [min, max].
 */
const targetSchema = new Schema(
  {
    intensity: String,
    pace: { type: Schema.Types.Mixed },
    pulse: { type: Schema.Types.Mixed },
    zone: Number,
  },
  { _id: false },
);

/**
 * Exercice élémentaire : `duration` (s) OU `distance` (m), au moins un requis.
 */
const exerciseSchema = new Schema(
  {
    instruction: String,
    duration: Number,
    distance: Number,
    target: { type: targetSchema, default: undefined },
  },
  { _id: false },
);

/**
 * Bloc de la séance, répété `repeat` fois.
 */
const blockSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    repeat: { type: Number, required: true, min: 1, default: 1 },
    exercises: { type: [exerciseSchema], default: [] },
  },
  { _id: false },
);

/**
 * Schéma d'une séance (collection `sessions`).
 */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    blocks: { type: [blockSchema], default: [] },
  },
  {
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

export type SessionDocument = InferSchemaType<typeof sessionSchema>;

export const SessionModel = models['Session'] ?? model('Session', sessionSchema);

// Réexport des sous-schémas utiles aux tests éventuels.
export { blockSchema, exerciseSchema, targetSchema };
