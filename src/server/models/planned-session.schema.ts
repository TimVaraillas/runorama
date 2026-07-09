import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Schéma d'une séance planifiée sur le calendrier.
 */
const plannedSessionSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    /** Date au format ISO YYYY-MM-DD. */
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ['planned', 'completed', 'skipped'],
      default: 'planned',
    },
    notes: String,
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

plannedSessionSchema.index({ date: 1 });

export type PlannedSessionDocument = InferSchemaType<typeof plannedSessionSchema>;

export const PlannedSessionModel =
  models['PlannedSession'] ?? model('PlannedSession', plannedSessionSchema);
