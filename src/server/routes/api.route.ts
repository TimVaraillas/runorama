import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { connectToDatabase } from '../db/mongoose';
import { WorkoutModel } from '../models/workout.schema';
import { PlannedSessionModel } from '../models/planned-session.schema';
import { toGarminWorkout } from '../services/garmin-export';

/**
 * Normalise un document `lean` Mongo pour l'API :
 * remplace `_id` (ObjectId) par `id` (string) et retire `__v`.
 * Si `workoutId` est peuplé (objet), l'expose sous `workout` et garde `workoutId` en string.
 */
function serialize(doc: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!doc) {
    return doc;
  }
  const { _id, __v, ...rest } = doc as Record<string, unknown> & { _id?: unknown; __v?: unknown };
  const out: Record<string, unknown> = { ...rest };
  if (_id !== undefined && _id !== null) {
    out['id'] = String(_id);
  }
  const workoutId = out['workoutId'];
  if (workoutId && typeof workoutId === 'object') {
    const workout = serialize(workoutId as Record<string, unknown>);
    out['workout'] = workout;
    out['workoutId'] = workout?.['id'];
  }
  return out;
}

/** Sérialise une liste de documents `lean`. */
function serializeMany(docs: Record<string, unknown>[]): Array<Record<string, unknown> | null> {
  return docs.map((d) => serialize(d));
}

/**
 * Router de l'API REST de Runorama.
 * Toutes les routes sont préfixées par `/api` (voir server.ts).
 */
export function createApiRouter(): Router {
  const router = Router();

  // S'assure que la connexion Mongo est établie avant toute requête API.
  router.use(async (_req, _res, next) => {
    try {
      await connectToDatabase();
      next();
    } catch (error) {
      next(error);
    }
  });

  // Rejette proprement un identifiant qui n'est pas un ObjectId valide
  // (évite un CastError 500 quand l'id vaut "undefined" ou est malformé).
  router.param('id', (_req: Request, res: Response, next, id) => {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    return next();
  });

  // ----------------------------------------------------------------------
  // Séances (workouts)
  // ----------------------------------------------------------------------
  router.get('/workouts', async (_req: Request, res: Response) => {
    const workouts = await WorkoutModel.find().sort({ updatedAt: -1 }).lean();
    return res.json(serializeMany(workouts));
  });

  router.get('/workouts/:id', async (req: Request, res: Response) => {
    const workout = await WorkoutModel.findById(req.params['id']).lean();
    if (!workout) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.json(serialize(workout));
  });

  router.post('/workouts', async (req: Request, res: Response) => {
    const created = await WorkoutModel.create(req.body);
    return res.status(201).json(created.toJSON());
  });

  router.put('/workouts/:id', async (req: Request, res: Response) => {
    const updated = await WorkoutModel.findByIdAndUpdate(req.params['id'], req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/workouts/:id', async (req: Request, res: Response) => {
    const deleted = await WorkoutModel.findByIdAndDelete(req.params['id']);
    if (!deleted) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.status(204).end();
  });

  /** Export d'une séance au format Garmin Connect. */
  router.get('/workouts/:id/garmin', async (req: Request, res: Response) => {
    const workout = await WorkoutModel.findById(req.params['id']).lean();
    if (!workout) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    const garmin = toGarminWorkout(workout as never);
    return res
      .setHeader('Content-Disposition', `attachment; filename="${workout.name}.json"`)
      .json(garmin);
  });

  // ----------------------------------------------------------------------
  // Planning (séances planifiées)
  // ----------------------------------------------------------------------
  router.get('/planned-sessions', async (req: Request, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const filter: Record<string, unknown> = {};
    if (from || to) {
      filter['date'] = {};
      if (from) (filter['date'] as Record<string, string>)['$gte'] = from;
      if (to) (filter['date'] as Record<string, string>)['$lte'] = to;
    }
    const sessions = await PlannedSessionModel.find(filter)
      .populate('workoutId')
      .sort({ date: 1 })
      .lean();
    return res.json(serializeMany(sessions));
  });

  router.post('/planned-sessions', async (req: Request, res: Response) => {
    const created = await PlannedSessionModel.create(req.body);
    return res.status(201).json(created.toJSON());
  });

  router.put('/planned-sessions/:id', async (req: Request, res: Response) => {
    const updated = await PlannedSessionModel.findByIdAndUpdate(req.params['id'], req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: 'Séance planifiée introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/planned-sessions/:id', async (req: Request, res: Response) => {
    const deleted = await PlannedSessionModel.findByIdAndDelete(req.params['id']);
    if (!deleted) {
      return res.status(404).json({ message: 'Séance planifiée introuvable' });
    }
    return res.status(204).end();
  });

  return router;
}
