import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Schéma Mongoose d'une cible d'effort d'un bloc.
 */
const targetSchema = new Schema(
  {
    type: { type: String, enum: ['pace', 'heartRate', 'cadence', 'open'], required: true },
    zone: {
      type: String,
      enum: ['easy', 'endurance', 'tempo', 'threshold', 'vo2', 'anaerobic', 'recovery'],
    },
    from: Number,
    to: Number,
  },
  { _id: false },
);

/**
 * Schéma d'un pas simple.
 */
const stepSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: ['step'], default: 'step' },
    intent: {
      type: String,
      enum: ['warmup', 'active', 'recovery', 'rest', 'cooldown', 'interval'],
      required: true,
    },
    durationType: {
      type: String,
      enum: ['distance', 'time', 'lapButton'],
      required: true,
    },
    durationValue: Number,
    target: { type: targetSchema, required: true },
    notes: String,
  },
  { _id: false },
);

/**
 * Schéma d'un bloc répété (contient des pas).
 */
const repeatSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: ['repeat'], default: 'repeat' },
    repeat: { type: Number, required: true, min: 1 },
    steps: { type: [stepSchema], default: [] },
  },
  { _id: false },
);

/**
 * Schéma d'une séance.
 * `elements` est un tableau mixte de pas simples et de blocs répétés.
 */
const workoutSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    sport: { type: String, enum: ['running', 'trail', 'treadmill'], default: 'running' },
    elements: { type: [Schema.Types.Mixed], default: [] },
    estimatedDistanceMeters: Number,
    estimatedDurationSeconds: Number,
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

export type WorkoutDocument = InferSchemaType<typeof workoutSchema>;

export const WorkoutModel =
  models['Workout'] ?? model('Workout', workoutSchema);

// Réexport des sous-schémas utiles aux tests éventuels.
export { stepSchema, repeatSchema, targetSchema };
