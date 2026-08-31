import express, { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { connectToDatabase } from '../db/mongoose';
import { NutritionCategoryModel } from '../models/nutrition-category.schema';
import { NutritionProductModel } from '../models/nutrition-product.schema';
import { NutritionProductFeedbackModel } from '../models/nutrition-product-feedback.schema';
import { RaceStrategyModel } from '../models/race-strategy.schema';
import { GpxTrackModel } from '../models/gpx-track.schema';
import { UserModel } from '../models/user.schema';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
import {
  GpxError,
  processGpx,
  simplifyForDisplay,
  type ProcessedTrackPoint,
} from '../../app/core/utils/gpx.util';
import {
  sendProductApprovedEmail,
  sendProductRejectedEmail,
  sendProductSubmittedEmail,
} from '../email/email.service';

/** URL de base de l'application (liens des e-mails). */
function appBaseUrl(): string {
  return process.env['APP_BASE_URL'] ?? 'http://localhost:4200';
}

/** Libellé lisible d'un produit (« Marque — Nom »). */
function productLabel(product: { brand?: unknown; name?: unknown }): string {
  return `${String(product.brand ?? '').trim()} — ${String(product.name ?? '').trim()}`;
}

/** Échappe une chaîne pour une utilisation littérale dans une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Notifie (best-effort) tous les administrateurs qu'un produit a été soumis.
 * Les erreurs d'envoi sont journalisées sans interrompre la requête.
 */
async function notifyAdminsOfSubmission(product: {
  brand?: unknown;
  name?: unknown;
  sourceUrl?: unknown;
  owner?: { firstName?: string; lastName?: string } | null;
}): Promise<void> {
  try {
    const admins = await UserModel.find({ role: 'admin' }).select('email').lean();
    const recipients = admins
      .map((a) => (a as { email?: string }).email)
      .filter((email): email is string => Boolean(email));
    if (recipients.length === 0) {
      return;
    }
    const ownerName = product.owner
      ? `${product.owner.firstName ?? ''} ${product.owner.lastName ?? ''}`.trim() || 'Un utilisateur'
      : 'Un utilisateur';
    await sendProductSubmittedEmail(recipients, {
      productName: String(product.name ?? '').trim(),
      brand: String(product.brand ?? '').trim(),
      ownerName,
      reviewLink: `${appBaseUrl()}/nutrition/products?status=pending`,
      sourceUrl: typeof product.sourceUrl === 'string' ? product.sourceUrl : undefined,
    });
  } catch (error) {
    console.error('[modération] Notification administrateurs échouée :', error);
  }
}

/** Champs d'un produit modifiables par le client (jamais le statut ni le propriétaire). */
const PRODUCT_FIELDS = [
  'categoryId',
  'brand',
  'name',
  'unitWeight',
  'energy',
  'carbs',
  'fats',
  'proteins',
  'sodium',
  'image',
  'sourceUrl',
] as const;

/** Extrait uniquement les champs produit autorisés depuis un corps de requête. */
function pickProductFields(body: unknown): Record<string, unknown> {
  const source = (body ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of PRODUCT_FIELDS) {
    if (key in source) {
      out[key] = source[key];
    }
  }
  return out;
}

/**
 * Notifie (best-effort) le propriétaire d'un produit d'une décision de
 * modération. Sans effet pour les produits « système » (sans propriétaire).
 */
async function notifyOwnerOfDecision(
  product: { ownerId?: unknown; brand?: unknown; name?: unknown },
  decision: 'approved' | 'rejected',
  reason = '',
): Promise<void> {
  try {
    if (!product.ownerId) {
      return;
    }
    const owner = await UserModel.findById(String(product.ownerId)).select('email').lean();
    const email = (owner as { email?: string } | null)?.email;
    if (!email) {
      return;
    }
    const label = productLabel(product);
    const link = `${appBaseUrl()}/nutrition/products`;
    if (decision === 'approved') {
      await sendProductApprovedEmail(email, label, link);
    } else {
      await sendProductRejectedEmail(email, label, reason, link);
    }
  } catch (error) {
    console.error('[modération] Notification propriétaire échouée :', error);
  }
}

/**
 * Normalise un document `lean` Mongo pour l'API :
 * remplace `_id` (ObjectId) par `id` (string) et retire `__v`.
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
  // Produit communautaire : propriétaire dénormalisé pour les administrateurs.
  const ownerId = out['ownerId'];
  if (ownerId && typeof ownerId === 'object') {
    const owner = serialize(ownerId as Record<string, unknown>);
    if (owner) {
      out['owner'] = {
        id: owner['id'],
        firstName: owner['firstName'],
        lastName: owner['lastName'],
        email: owner['email'],
      };
    }
    out['ownerId'] = owner?.['id'];
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

/** Colonnes parallèles d'une trace (format de stockage compact). */
interface TrackColumns {
  lat: number[];
  lon: number[];
  ele: number[];
  dist: number[];
  dPlus: number[];
  dMinus: number[];
}

/** Convertit des points de trace en colonnes parallèles (stockage). */
function toColumns(points: readonly ProcessedTrackPoint[]): TrackColumns {
  return {
    lat: points.map((p) => p.lat),
    lon: points.map((p) => p.lon),
    ele: points.map((p) => p.ele),
    dist: points.map((p) => p.distance),
    dPlus: points.map((p) => p.elevationGain),
    dMinus: points.map((p) => p.elevationLoss),
  };
}

/** Reconstruit des points de trace (pour le client) depuis des colonnes. */
function fromColumns(cols: TrackColumns): ProcessedTrackPoint[] {
  return cols.lat.map((lat, i) => ({
    lat,
    lon: cols.lon[i] ?? 0,
    ele: cols.ele[i] ?? 0,
    distance: cols.dist[i] ?? 0,
    elevationGain: cols.dPlus[i] ?? 0,
    elevationLoss: cols.dMinus[i] ?? 0,
  }));
}

/**
 * Charge utile d'une trace envoyée au client : totaux, bbox et **points
 * simplifiés** (rendu du profil). La pleine résolution et le GPX brut restent
 * côté serveur.
 */
function toClientTrack(track: Record<string, unknown>): Record<string, unknown> {
  const totals = (track['totals'] ?? {}) as Record<string, number>;
  const simplified = (track['simplified'] ?? {}) as TrackColumns;
  return {
    id: String(track['_id'] ?? track['id']),
    eventId: String(track['eventId']),
    fileName: track['fileName'] ?? null,
    distance: totals['distance'],
    elevationGain: totals['elevationGain'],
    elevationLoss: totals['elevationLoss'],
    minAltitude: totals['minAltitude'],
    maxAltitude: totals['maxAltitude'],
    pointCount: totals['pointCount'],
    bbox: track['bbox'],
    points: fromColumns(simplified),
  };
}

/**
 * Écart relatif entre une valeur GPX et la valeur saisie dans l'évènement.
 * Renvoie `null` si l'évènement n'a pas de valeur de référence exploitable.
 */
function discrepancy(
  gpxValue: number,
  eventValue: number | null | undefined,
): { gpx: number; event: number; deltaPct: number } | null {
  if (eventValue == null || eventValue === 0) {
    return null;
  }
  const deltaPct = ((gpxValue - eventValue) / eventValue) * 100;
  return { gpx: gpxValue, event: eventValue, deltaPct: Math.round(deltaPct * 10) / 10 };
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
  // Nutrition — Produits (bibliothèque communautaire)
  // ----------------------------------------------------------------------
  // Portée de lecture :
  // - administrateur : tous les produits, filtrables par statut de modération ;
  // - utilisateur : le catalogue public validé + ses propres produits (quel
  //   que soit leur statut), jamais les produits privés d'autrui.
  router.get('/nutrition/products', async (req: Request, res: Response) => {
    const { categoryId, status, search, favoritesOnly, all } = req.query as {
      categoryId?: string;
      status?: string;
      search?: string;
      favoritesOnly?: string;
      all?: string;
    };
    const isAdmin = req.user!.role === 'admin';
    const userId = req.user!.id;
    const and: Record<string, unknown>[] = [];

    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      and.push({ categoryId });
    }

    if (isAdmin) {
      const allowedStatuses = ['pending', 'approved', 'rejected', 'archived'];
      if (status && allowedStatuses.includes(status)) {
        and.push({ moderationStatus: status });
      }
    } else {
      // Catalogue public validé OU produits appartenant à l'utilisateur.
      and.push({
        $or: [{ visibility: 'public', moderationStatus: 'approved' }, { ownerId: userId }],
      });
    }

    // Recherche texte serveur sur le nom et la marque (insensible à la casse).
    if (typeof search === 'string' && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      and.push({ $or: [{ name: rx }, { brand: rx }] });
    }

    // Filtre « favoris » : les favoris sont des données personnelles stockées
    // dans une collection dédiée ; on récupère d'abord les identifiants.
    if (favoritesOnly === 'true') {
      const favorites = await NutritionProductFeedbackModel.find({ userId, favorite: true })
        .select('productId')
        .lean();
      const favoriteIds = favorites.map((f) => (f as { productId: unknown }).productId);
      and.push({ _id: { $in: favoriteIds } });
    }

    const filter = and.length > 0 ? { $and: and } : {};

    // `all=true` renvoie la liste complète (usage inventaire / plan de conso).
    const wantAll = all === 'true';
    const parsedLimit = Math.min(Math.max(Number.parseInt(String(req.query['limit'] ?? ''), 10) || 50, 1), 100);
    const parsedOffset = Math.max(Number.parseInt(String(req.query['offset'] ?? ''), 10) || 0, 0);

    const query = NutritionProductModel.find(filter).populate('categoryId');
    // Le propriétaire n'est exposé qu'aux administrateurs (file de modération).
    if (isAdmin) {
      query.populate('ownerId', 'firstName lastName email');
    }
    query.sort({ brand: 1, name: 1 });
    if (!wantAll) {
      query.skip(parsedOffset).limit(parsedLimit);
    }
    const products = await query.lean();
    const serialized = serializeMany(products);

    // Hydrate chaque produit avec les données personnelles (privées) de
    // l'utilisateur courant : favori et note libre. Une seule requête, indexée
    // par `{ userId, productId }`.
    const productIds = serialized
      .map((p) => p?.['id'])
      .filter((id): id is string => typeof id === 'string');
    if (productIds.length > 0) {
      const feedbacks = await NutritionProductFeedbackModel.find({
        userId: req.user!.id,
        productId: { $in: productIds },
      })
        .select('productId favorite comment taste tolerance usageTotal eventCount')
        .lean();
      const byProduct = new Map<
        string,
        {
          favorite: boolean;
          comment: string;
          taste?: number;
          tolerance?: number;
          usageTotal: number;
          eventCount: number;
        }
      >();
      for (const feedback of feedbacks) {
        const f = feedback as {
          productId: unknown;
          favorite?: boolean;
          comment?: string;
          taste?: number;
          tolerance?: number;
          usageTotal?: number;
          eventCount?: number;
        };
        byProduct.set(String(f.productId), {
          favorite: Boolean(f.favorite),
          comment: f.comment ?? '',
          taste: f.taste,
          tolerance: f.tolerance,
          usageTotal: f.usageTotal ?? 0,
          eventCount: f.eventCount ?? 0,
        });
      }
      for (const product of serialized) {
        if (!product) {
          continue;
        }
        const personal = byProduct.get(String(product['id']));
        product['favorite'] = personal?.favorite ?? false;
        product['comment'] = personal?.comment ?? '';
        product['taste'] = personal?.taste;
        product['tolerance'] = personal?.tolerance;
        product['usageTotal'] = personal?.usageTotal ?? 0;
        product['eventCount'] = personal?.eventCount ?? 0;
      }
    }

    if (wantAll) {
      return res.json(serialized);
    }
    const total = await NutritionProductModel.countDocuments(filter);
    return res.json({
      items: serialized,
      total,
      hasMore: parsedOffset + serialized.length < total,
    });
  });

  // Comptage des produits par statut de modération (badges de la file admin).
  // Respecte les filtres de contexte (catégorie + recherche).
  router.get('/nutrition/products/counts', requireAdmin, async (req: Request, res: Response) => {
    const { categoryId, search } = req.query as { categoryId?: string; search?: string };
    const and: Record<string, unknown>[] = [];
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      and.push({ categoryId });
    }
    if (typeof search === 'string' && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      and.push({ $or: [{ name: rx }, { brand: rx }] });
    }
    const filter = and.length > 0 ? { $and: and } : {};

    const rows = (await NutritionProductModel.aggregate([
      { $match: filter },
      { $group: { _id: '$moderationStatus', count: { $sum: 1 } } },
    ])) as Array<{ _id: string; count: number }>;

    const counts = { all: 0, pending: 0, approved: 0, rejected: 0, archived: 0 };
    for (const row of rows) {
      const key = String(row._id);
      if (key === 'pending' || key === 'approved' || key === 'rejected' || key === 'archived') {
        counts[key] = row.count;
      }
      counts.all += row.count;
    }
    return res.json(counts);
  });

  // Création d'un produit. Ouverte à tout utilisateur authentifié :
  // - un administrateur publie directement dans le catalogue commun ;
  // - un utilisateur crée un produit privé, en attente de validation, et les
  //   administrateurs sont notifiés par e-mail.
  router.post('/nutrition/products', async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === 'admin';
    const fields = pickProductFields(req.body);
    if (isAdmin) {
      const created = await NutritionProductModel.create({
        ...fields,
        ownerId: req.user!.id,
        visibility: 'public',
        moderationStatus: 'approved',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      });
      return res.status(201).json(created.toJSON());
    }

    const created = await NutritionProductModel.create({
      ...fields,
      ownerId: req.user!.id,
      visibility: 'private',
      moderationStatus: 'pending',
    });
    const owner = await UserModel.findById(req.user!.id).select('firstName lastName').lean();
    await notifyAdminsOfSubmission({
      brand: created.get('brand'),
      name: created.get('name'),
      sourceUrl: created.get('sourceUrl'),
      owner: owner as { firstName?: string; lastName?: string } | null,
    });
    return res.status(201).json(created.toJSON());
  });

  // Édition d'un produit.
  // - administrateur : peut corriger n'importe quel produit (notamment avant
  //   validation) sans changer son statut ;
  // - propriétaire : peut éditer son produit tant qu'il n'est pas public.
  //   Éditer un produit refusé le resoumet automatiquement (repasse en attente).
  router.put('/nutrition/products/:id', async (req: Request, res: Response) => {
    const existing = await NutritionProductModel.findById(req.params['id']);
    if (!existing) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }
    const isAdmin = req.user!.role === 'admin';
    const isOwner = Boolean(existing.ownerId) && String(existing.ownerId) === req.user!.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (!isAdmin && existing.get('visibility') === 'public') {
      return res
        .status(403)
        .json({ message: 'Ce produit est publié : son édition est réservée aux administrateurs.' });
    }

    existing.set(pickProductFields(req.body));

    // Un produit refusé qui est corrigé par son propriétaire repart en revue.
    let resubmitted = false;
    if (!isAdmin && existing.get('moderationStatus') === 'rejected') {
      existing.set({
        moderationStatus: 'pending',
        rejectionReason: undefined,
        reviewedBy: null,
        reviewedAt: undefined,
      });
      resubmitted = true;
    }

    await existing.save();

    if (resubmitted) {
      const owner = await UserModel.findById(req.user!.id).select('firstName lastName').lean();
      await notifyAdminsOfSubmission({
        brand: existing.get('brand'),
        name: existing.get('name'),
        sourceUrl: existing.get('sourceUrl'),
        owner: owner as { firstName?: string; lastName?: string } | null,
      });
    }
    return res.json(existing.toJSON());
  });

  // Validation d'un produit : il devient public et rejoint le catalogue commun.
  router.post('/nutrition/products/:id/approve', requireAdmin, async (req: Request, res: Response) => {
    const product = await NutritionProductModel.findById(req.params['id']);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }
    product.set({
      visibility: 'public',
      moderationStatus: 'approved',
      rejectionReason: undefined,
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
    });
    await product.save();
    await notifyOwnerOfDecision(product, 'approved');
    return res.json(product.toJSON());
  });

  // Refus d'un produit : il reste privé et utilisable par son propriétaire.
  router.post('/nutrition/products/:id/reject', requireAdmin, async (req: Request, res: Response) => {
    const product = await NutritionProductModel.findById(req.params['id']);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    product.set({
      visibility: 'private',
      moderationStatus: 'rejected',
      rejectionReason: reason || undefined,
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
    });
    await product.save();
    await notifyOwnerOfDecision(product, 'rejected', reason);
    return res.json(product.toJSON());
  });

  // Archivage d'un produit public devenu obsolète/doublon : retiré du catalogue
  // sans être supprimé (il reste référencé dans les stratégies existantes).
  router.post('/nutrition/products/:id/archive', requireAdmin, async (req: Request, res: Response) => {
    const product = await NutritionProductModel.findById(req.params['id']);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }
    product.set({
      visibility: 'private',
      moderationStatus: 'archived',
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
    });
    await product.save();
    return res.json(product.toJSON());
  });

  // ----------------------------------------------------------------------
  // Nutrition — Données personnelles sur un produit (favori, note, évaluations)
  // ----------------------------------------------------------------------
  // Ces routes gèrent le retour personnel (privé) de l'utilisateur courant à
  // propos d'un produit qu'il peut voir. Elles n'altèrent jamais le produit
  // partagé et sont conçues pour accueillir de futures évaluations.

  /**
   * Vérifie qu'un produit est visible par l'utilisateur courant : catalogue
   * public validé, ou produit lui appartenant (ou administrateur).
   */
  async function findVisibleProduct(req: Request): Promise<{ _id: unknown } | null> {
    const isAdmin = req.user!.role === 'admin';
    const filter: Record<string, unknown> = { _id: req.params['id'] };
    if (!isAdmin) {
      filter['$or'] = [
        { visibility: 'public', moderationStatus: 'approved' },
        { ownerId: req.user!.id },
      ];
    }
    return NutritionProductModel.findOne(filter).select('_id').lean();
  }

  // Ajoute/met à jour le favori et/ou la note personnelle sur un produit.
  router.put('/nutrition/products/:id/feedback', async (req: Request, res: Response) => {
    const product = await findVisibleProduct(req);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }

    const update: Record<string, unknown> = {};
    if (typeof req.body?.favorite === 'boolean') {
      update['favorite'] = req.body.favorite;
    }
    if (typeof req.body?.comment === 'string') {
      update['comment'] = req.body.comment.trim();
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à enregistrer (favorite/comment).' });
    }

    const feedback = await NutritionProductFeedbackModel.findOneAndUpdate(
      { userId: req.user!.id, productId: req.params['id'] },
      { $set: update, $setOnInsert: { userId: req.user!.id, productId: req.params['id'] } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({
      favorite: Boolean((feedback as { favorite?: boolean }).favorite),
      comment: (feedback as { comment?: string }).comment ?? '',
    });
  });

  // Retire le favori et la note personnelle d'un produit (pour l'utilisateur).
  router.delete('/nutrition/products/:id/feedback', async (req: Request, res: Response) => {
    await NutritionProductFeedbackModel.deleteOne({
      userId: req.user!.id,
      productId: req.params['id'],
    });
    return res.status(204).end();
  });

  // ----------------------------------------------------------------------
  // Nutrition — Suppression d'un produit
  // ----------------------------------------------------------------------
  // Suppression d'un produit. Réservée à l'administrateur ou au propriétaire.
  // Refusée si le produit est référencé par une stratégie (préférer l'archivage).
  router.delete('/nutrition/products/:id', async (req: Request, res: Response) => {
    const product = await NutritionProductModel.findById(req.params['id']);
    if (!product) {
      return res.status(404).json({ message: 'Produit introuvable' });
    }
    const isAdmin = req.user!.role === 'admin';
    const isOwner = Boolean(product.ownerId) && String(product.ownerId) === req.user!.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const inUse = await RaceStrategyModel.exists({
      $or: [{ 'items.productId': product._id }, { 'intakes.productId': product._id }],
    });
    if (inUse) {
      return res.status(409).json({
        message: 'Ce produit est utilisé dans une stratégie. Retirez-le d\u2019abord ou archivez-le.',
      });
    }

    await product.deleteOne();
    // Nettoyage des données personnelles associées (favoris/notes/évaluations).
    await NutritionProductFeedbackModel.deleteMany({ productId: product._id });
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

  router.get('/race-strategies', async (req: Request, res: Response) => {
    const query = RaceStrategyModel.find(eventScope(req)).populate('items.productId');
    // L'admin voit toutes les stratégies : on expose leur propriétaire.
    if (req.user!.role === 'admin') {
      query.populate('userId', 'firstName lastName email');
    }
    const events = await query.sort({ date: 1 }).lean();
    return res.json(serializeMany(events));
  });

  router.get('/race-strategies/:id', async (req: Request, res: Response) => {
    const query = RaceStrategyModel.findOne({
      _id: req.params['id'],
      ...eventScope(req),
    }).populate('items.productId');
    if (req.user!.role === 'admin') {
      query.populate('userId', 'firstName lastName email');
    }
    const event = await query.lean();
    if (!event) {
      return res.status(404).json({ message: 'Course introuvable' });
    }
    return res.json(serialize(event));
  });

  router.post('/race-strategies', async (req: Request, res: Response) => {
    const created = await RaceStrategyModel.create({ ...req.body, userId: req.user!.id });
    return res.status(201).json(created.toJSON());
  });

  router.put('/race-strategies/:id', async (req: Request, res: Response) => {
    const { userId: _ignored, ...payload } = req.body ?? {};
    const updated = await RaceStrategyModel.findOneAndUpdate(
      { _id: req.params['id'], ...eventScope(req) },
      payload,
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) {
      return res.status(404).json({ message: 'Course introuvable' });
    }
    return res.json(updated.toJSON());
  });

  router.delete('/race-strategies/:id', async (req: Request, res: Response) => {
    const deleted = await RaceStrategyModel.findOneAndDelete({
      _id: req.params['id'],
      ...eventScope(req),
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Course introuvable' });
    }
    // Supprime la trace GPX associée (parcours réel) le cas échéant.
    await GpxTrackModel.deleteMany({ eventId: deleted._id });
    return res.status(204).end();
  });

  // ----------------------------------------------------------------------
  // Nutrition — Trace GPX (parcours réel) d'une stratégie
  // ----------------------------------------------------------------------
  // Corps volumineux (jusqu'à 25 Mo) reçu en texte brut : le parseur JSON
  // global (5 Mo) ne s'applique pas car le client envoie du `application/gpx+xml`.
  const gpxBodyParser = express.text({ type: () => true, limit: '25mb' });

  // Import / remplacement de la trace GPX d'une stratégie.
  router.post(
    '/race-strategies/:id/gpx',
    gpxBodyParser,
    async (req: Request, res: Response) => {
      const event = await RaceStrategyModel.findOne({
        _id: req.params['id'],
        ...eventScope(req),
      });
      if (!event) {
        return res.status(404).json({ message: 'Course introuvable' });
      }

      const raw = typeof req.body === 'string' ? req.body : '';
      if (!raw.trim()) {
        return res.status(422).json({ code: 'EMPTY', message: 'Le fichier GPX est vide.' });
      }

      let processed;
      try {
        processed = processGpx(raw);
      } catch (error) {
        if (error instanceof GpxError) {
          return res.status(422).json({ code: error.code, message: error.message });
        }
        throw error;
      }

      const simplified = simplifyForDisplay(processed.points);
      const hash = createHash('sha256').update(raw).digest('hex');
      const fileName =
        typeof req.query['fileName'] === 'string' ? req.query['fileName'] : undefined;

      const track = await GpxTrackModel.findOneAndUpdate(
        { eventId: event._id },
        {
          $set: {
            userId: event.userId,
            fileName,
            rawGpx: raw,
            hash,
            totals: processed.totals,
            bbox: processed.bbox,
            full: toColumns(processed.points),
            simplified: toColumns(simplified),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();

      // Met à jour uniquement le résumé GPX de l'évènement (jamais les données
      // saisies par l'utilisateur : distance/D+ ne sont pas écrasés).
      await RaceStrategyModel.updateOne(
        { _id: event._id },
        {
          $set: {
            gpxTrackId: (track as { _id: unknown })._id,
            gpxDistance: processed.totals.distance,
            gpxElevationGain: processed.totals.elevationGain,
            gpxElevationLoss: processed.totals.elevationLoss,
          },
        },
      );

      return res.status(201).json({
        track: toClientTrack(track as Record<string, unknown>),
        discrepancies: {
          distance: discrepancy(processed.totals.distance, event.distance),
          elevationGain: discrepancy(processed.totals.elevationGain, event.elevationGain),
          elevationLoss: discrepancy(processed.totals.elevationLoss, event.elevationLoss),
        },
      });
    },
  );

  // Lecture de la trace GPX (points simplifiés pour le profil).
  router.get('/race-strategies/:id/gpx', async (req: Request, res: Response) => {
    const event = await RaceStrategyModel.findOne({
      _id: req.params['id'],
      ...eventScope(req),
    })
      .select('_id')
      .lean();
    if (!event) {
      return res.status(404).json({ message: 'Course introuvable' });
    }
    const track = await GpxTrackModel.findOne({ eventId: req.params['id'] }).lean();
    if (!track) {
      return res.status(404).json({ message: 'Aucune trace GPX pour cette stratégie.' });
    }
    return res.json(toClientTrack(track as Record<string, unknown>));
  });

  // Suppression de la trace GPX et nettoyage du résumé de l'évènement.
  router.delete('/race-strategies/:id/gpx', async (req: Request, res: Response) => {
    const event = await RaceStrategyModel.findOne({
      _id: req.params['id'],
      ...eventScope(req),
    }).select('_id');
    if (!event) {
      return res.status(404).json({ message: 'Course introuvable' });
    }
    await GpxTrackModel.deleteMany({ eventId: event._id });
    await RaceStrategyModel.updateOne(
      { _id: event._id },
      { $unset: { gpxTrackId: '', gpxDistance: '', gpxElevationGain: '', gpxElevationLoss: '' } },
    );
    return res.status(204).end();
  });


  return router;
}


