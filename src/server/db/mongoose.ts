import mongoose from 'mongoose';

/**
 * Connexion Mongoose partagée.
 * Réutilise la connexion existante en dev (hot-reload) pour éviter d'ouvrir
 * plusieurs sockets vers MongoDB.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

export function connectToDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose);
  }

  if (!connectionPromise) {
    const uri = process.env['MONGODB_URI'] ?? 'mongodb://127.0.0.1:27017/runorama';
    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  return connectionPromise;
}
