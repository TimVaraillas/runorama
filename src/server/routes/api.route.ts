import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { connectToDatabase } from '../db/mongoose';
import { SessionModel } from '../models/session.schema';
import { PlannedSessionModel } from '../models/planned-session.schema';

/**
 * Normalise un document `lean` Mongo pour l'API :
 * remplace `_id` (ObjectId) par `id` (string) et retire `__v`.
 * Si `sessionId` est peuplé (objet), l'expose sous `session` et garde `sessionId` en string.
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
  const sessionId = out['sessionId'];
  if (sessionId && typeof sessionId === 'object') {
    const session = serialize(sessionId as Record<string, unknown>);
    out['session'] = session;
    out['sessionId'] = session?.['id'];
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
  // Séances (sessions)
  // ----------------------------------------------------------------------
  router.get('/sessions', async (_req: Request, res: Response) => {
    const sessions = await SessionModel.find().sort({ updatedAt: -1 }).lean();
    return res.json(serializeMany(sessions));
  });

  router.get('/sessions/:id', async (req: Request, res: Response) => {
    const session = await SessionModel.findById(req.params['id']).lean();
    if (!session) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.json(serialize(session));
  });

  router.post('/sessions', async (req: Request, res: Response) => {
    const created = await SessionModel.create(req.body);
    return res.status(201).json(created.toJSON());
  });

  router.put('/sessions/:id', async (req: Request, res: Response) => {
    const updated = await SessionModel.findByIdAndUpdate(req.params['id'], req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/sessions/:id', async (req: Request, res: Response) => {
    const deleted = await SessionModel.findByIdAndDelete(req.params['id']);
    if (!deleted) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.status(204).end();
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
      .populate('sessionId')
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
