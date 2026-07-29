import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { connectToDatabase } from '../db/mongoose';
import { SessionModel } from '../models/session.schema';
import { PlannedSessionModel } from '../models/planned-session.schema';
import { NutritionCategoryModel } from '../models/nutrition-category.schema';
import { NutritionProductModel } from '../models/nutrition-product.schema';
import { NutritionEventModel } from '../models/nutrition-event.schema';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';

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
  const categoryId = out['categoryId'];
  if (categoryId && typeof categoryId === 'object') {
    const category = serialize(categoryId as Record<string, unknown>);
    out['category'] = category;
    out['categoryId'] = category?.['id'];
  }
  const userId = out['userId'];
  if (userId && typeof userId === 'object') {
    const owner = serialize(userId as Record<string, unknown>);
    if (owner) {
      out['owner'] = {
        id: owner['id'],
        firstName: owner['firstName'],
        lastName: owner['lastName'],
        email: owner['email'],
      };
    }
    out['userId'] = owner?.['id'];
  }
  const items = out['items'];
  if (Array.isArray(items)) {
    out['items'] = items.map((raw) => {
      if (!raw || typeof raw !== 'object') {
        return raw;
      }
      const item = { ...(raw as Record<string, unknown>) };
      const productId = item['productId'];
      if (productId && typeof productId === 'object') {
        const product = serialize(productId as Record<string, unknown>);
        item['product'] = product;
        item['productId'] = product?.['id'];
      }
      return item;
    });
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

  // Toutes les routes de cette API nécessitent une authentification.
  // (La base produits reste lisible par tout utilisateur connecté ; seule
  // l'écriture produits/catégories exige en plus le rôle admin.)
  router.use(requireAuth);

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
  router.get('/sessions', async (req: Request, res: Response) => {
    const sessions = await SessionModel.find({ userId: req.user!.id })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json(serializeMany(sessions));
  });

  router.get('/sessions/:id', async (req: Request, res: Response) => {
    const session = await SessionModel.findOne({
      _id: req.params['id'],
      userId: req.user!.id,
    }).lean();
    if (!session) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.json(serialize(session));
  });

  router.post('/sessions', async (req: Request, res: Response) => {
    const created = await SessionModel.create({ ...req.body, userId: req.user!.id });
    return res.status(201).json(created.toJSON());
  });

  router.put('/sessions/:id', async (req: Request, res: Response) => {
    const { userId: _ignored, ...payload } = req.body ?? {};
    const updated = await SessionModel.findOneAndUpdate(
      { _id: req.params['id'], userId: req.user!.id },
      payload,
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/sessions/:id', async (req: Request, res: Response) => {
    const deleted = await SessionModel.findOneAndDelete({
      _id: req.params['id'],
      userId: req.user!.id,
    });
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
    const filter: Record<string, unknown> = { userId: req.user!.id };
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
    const created = await PlannedSessionModel.create({ ...req.body, userId: req.user!.id });
    return res.status(201).json(created.toJSON());
  });

  router.put('/planned-sessions/:id', async (req: Request, res: Response) => {
    const { userId: _ignored, ...payload } = req.body ?? {};
    const updated = await PlannedSessionModel.findOneAndUpdate(
      { _id: req.params['id'], userId: req.user!.id },
      payload,
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) {
      return res.status(404).json({ message: 'Séance planifiée introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/planned-sessions/:id', async (req: Request, res: Response) => {
    const deleted = await PlannedSessionModel.findOneAndDelete({
      _id: req.params['id'],
      userId: req.user!.id,
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Séance planifiée introuvable' });
    }
    return res.status(204).end();
  });

  // ----------------------------------------------------------------------
  // Nutrition — Catégories de produits
  // ----------------------------------------------------------------------
  router.get('/nutrition/categories', async (_req: Request, res: Response) => {
    const categories = await NutritionCategoryModel.find().sort({ name: 1 }).lean();
    return res.json(serializeMany(categories));
  });

  router.post('/nutrition/categories', requireAdmin, async (req: Request, res: Response) => {
    try {
      const created = await NutritionCategoryModel.create(req.body);
      return res.status(201).json(created.toJSON());
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return res.status(409).json({ message: 'Cette catégorie existe déjà' });
      }
      throw error;
    }
  });

  router.put('/nutrition/categories/:id', requireAdmin, async (req: Request, res: Response) => {
    const updated = await NutritionCategoryModel.findByIdAndUpdate(req.params['id'], req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/nutrition/categories/:id', requireAdmin, async (req: Request, res: Response) => {
    const inUse = await NutritionProductModel.exists({ categoryId: req.params['id'] });
    if (inUse) {
      return res
        .status(409)
        .json({ message: 'Impossible de supprimer une catégorie contenant des produits' });
    }
    const deleted = await NutritionCategoryModel.findByIdAndDelete(req.params['id']);
    if (!deleted) {
      return res.status(404).json({ message: 'Catégorie introuvable' });
    }
    return res.status(204).end();
  });

  // ----------------------------------------------------------------------
  // Nutrition — Produits
  // ----------------------------------------------------------------------
  router.get('/nutrition/products', async (req: Request, res: Response) => {
    const { categoryId } = req.query as { categoryId?: string };
    const filter: Record<string, unknown> = {};
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      filter['categoryId'] = categoryId;
    }
    const products = await NutritionProductModel.find(filter)
      .populate('categoryId')
      .sort({ brand: 1, name: 1 })
      .lean();
    return res.json(serializeMany(products));
  });

  router.post('/nutrition/products', requireAdmin, async (req: Request, res: Response) => {
    const created = await NutritionProductModel.create(req.body);
    return res.status(201).json(created.toJSON());
  });

  router.put('/nutrition/products/:id', requireAdmin, async (req: Request, res: Response) => {
    const updated = await NutritionProductModel.findByIdAndUpdate(req.params['id'], req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/nutrition/products/:id', requireAdmin, async (req: Request, res: Response) => {
    const deleted = await NutritionProductModel.findByIdAndDelete(req.params['id']);
    if (!deleted) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }
    return res.status(204).end();
  });

  // ----------------------------------------------------------------------
  // Nutrition — Évènements / stratégies alimentaires
  // ----------------------------------------------------------------------
  // Portée d'accès aux stratégies alimentaires :
  // - un administrateur accède aux stratégies de tous les utilisateurs ;
  // - un utilisateur classique n'accède qu'aux siennes.
  const eventScope = (req: Request): Record<string, unknown> =>
    req.user!.role === 'admin' ? {} : { userId: req.user!.id };

  router.get('/nutrition/events', async (req: Request, res: Response) => {
    const query = NutritionEventModel.find(eventScope(req)).populate('items.productId');
    // L'admin voit toutes les stratégies : on expose leur propriétaire.
    if (req.user!.role === 'admin') {
      query.populate('userId', 'firstName lastName email');
    }
    const events = await query.sort({ date: 1 }).lean();
    return res.json(serializeMany(events));
  });

  router.get('/nutrition/events/:id', async (req: Request, res: Response) => {
    const query = NutritionEventModel.findOne({
      _id: req.params['id'],
      ...eventScope(req),
    }).populate('items.productId');
    if (req.user!.role === 'admin') {
      query.populate('userId', 'firstName lastName email');
    }
    const event = await query.lean();
    if (!event) {
      return res.status(404).json({ message: 'Évènement introuvable' });
    }
    return res.json(serialize(event));
  });

  router.post('/nutrition/events', async (req: Request, res: Response) => {
    const created = await NutritionEventModel.create({ ...req.body, userId: req.user!.id });
    return res.status(201).json(created.toJSON());
  });

  router.put('/nutrition/events/:id', async (req: Request, res: Response) => {
    const { userId: _ignored, ...payload } = req.body ?? {};
    const updated = await NutritionEventModel.findOneAndUpdate(
      { _id: req.params['id'], ...eventScope(req) },
      payload,
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) {
      return res.status(404).json({ message: 'Évènement introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/nutrition/events/:id', async (req: Request, res: Response) => {
    const deleted = await NutritionEventModel.findOneAndDelete({
      _id: req.params['id'],
      ...eventScope(req),
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Évènement introuvable' });
    }
    return res.status(204).end();
  });

  return router;
}
