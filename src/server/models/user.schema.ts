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
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Confirmation d'adresse e-mail : le compte n'est utilisable (connexion)
    // qu'une fois l'e-mail vérifié. Comme pour la réinitialisation, seul le
    // hash du token de vérification est stocké, avec une date d'expiration.
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    // Réinitialisation de mot de passe : on ne stocke jamais le token en clair,
    // seulement son empreinte SHA-256, accompagnée d'une date d'expiration.
    // Les deux champs sont exclus par défaut des requêtes (`select: false`).
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = ret['_id'];
        delete ret['_id'];
        delete ret['passwordHash'];
        delete ret['emailVerificationTokenHash'];
        delete ret['emailVerificationExpires'];
        delete ret['resetPasswordTokenHash'];
        delete ret['resetPasswordExpires'];
        return ret;
      },
    },
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = models['User'] ?? model('User', userSchema);
