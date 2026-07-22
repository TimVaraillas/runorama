import mongoose, { type InferSchemaType } from 'mongoose';

const { Schema, model, models } = mongoose;

/**
 * Schéma d'un utilisateur (collection `users`).
 * Le mot de passe n'est jamais stocké en clair : seul `passwordHash` est conservé,
 * et il est exclu par défaut des requêtes (`select: false`) ainsi que de la sérialisation.
 */
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = ret['_id'];
        delete ret['_id'];
        delete ret['passwordHash'];
        return ret;
      },
    },
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = models['User'] ?? model('User', userSchema);
