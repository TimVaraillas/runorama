import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { connectToDatabase } from '../db/mongoose';
import { NutritionCategoryModel } from '../models/nutrition-category.schema';
import { NutritionProductModel } from '../models/nutrition-product.schema';
import { NutritionProductFeedbackModel } from '../models/nutrition-product-feedback.schema';
import { NutritionEventModel } from '../models/nutrition-event.schema';
import { UserModel } from '../models/user.schema';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
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
    const { categoryId, status } = req.query as { categoryId?: string; status?: string };
    const isAdmin = req.user!.role === 'admin';
    const filter: Record<string, unknown> = {};
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      filter['categoryId'] = categoryId;
    }

    if (isAdmin) {
      const allowedStatuses = ['pending', 'approved', 'rejected', 'archived'];
      if (status && allowedStatuses.includes(status)) {
        filter['moderationStatus'] = status;
      }
    } else {
      // Catalogue public validé OU produits appartenant à l'utilisateur.
      filter['$or'] = [
        { visibility: 'public', moderationStatus: 'approved' },
        { ownerId: req.user!.id },
      ];
    }

    const query = NutritionProductModel.find(filter).populate('categoryId');
    // Le propriétaire n'est exposé qu'aux administrateurs (file de modération).
    if (isAdmin) {
      query.populate('ownerId', 'firstName lastName email');
    }
    const products = await query.sort({ brand: 1, name: 1 }).lean();
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
    return res.json(serialized);
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

    const inUse = await NutritionEventModel.exists({
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

  /** Coerce en nombre fini borné, ou `undefined`. */
  function num(value: unknown, min = 0, max = Number.POSITIVE_INFINITY): number | undefined {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    return Math.min(Math.max(n, min), max);
  }

  const RACE_STATUSES = ['finished', 'dnf_abandon', 'dnf_medical', 'dnf_nutrition', 'dnf_other'];
  const FREQ_LEVELS = ['never', 'sometimes', 'often'];
  const DIGESTIVE_PROBLEMS = [
    'nausea',
    'vomiting',
    'bloating',
    'diarrhea',
    'reflux',
    'cramps',
    'other',
  ];

  /**
   * Construit un objet `result` assaini à partir d'un corps de requête libre.
   * Ignore silencieusement les valeurs invalides pour éviter tout 500.
   */
  function sanitizeResult(body: unknown): Record<string, unknown> | null {
    const src = (body ?? {}) as Record<string, unknown>;
    const status = typeof src['status'] === 'string' ? String(src['status']) : '';
    if (!RACE_STATUSES.includes(status)) {
      return null;
    }
    const nutritionSrc = (src['nutrition'] ?? {}) as Record<string, unknown>;
    const digestiveSrc = (src['digestive'] ?? {}) as Record<string, unknown>;

    const consumption = Array.isArray(src['consumption'])
      ? (src['consumption'] as Record<string, unknown>[])
          .filter((c) => c && mongoose.isValidObjectId(String(c['productId'])))
          .map((c) => ({
            productId: String(c['productId']),
            plannedQuantity: num(c['plannedQuantity']) ?? 0,
            actualQuantity: num(c['actualQuantity']) ?? 0,
          }))
      : [];

    const offPlan = Array.isArray(src['offPlan'])
      ? (src['offPlan'] as Record<string, unknown>[])
          .filter((o) => o && typeof o['label'] === 'string' && String(o['label']).trim())
          .map((o) => ({
            label: String(o['label']).trim(),
            quantity: num(o['quantity']),
            energy: num(o['energy']),
            carbs: num(o['carbs']),
            fats: num(o['fats']),
            proteins: num(o['proteins']),
            sodium: num(o['sodium']),
            waterMl: num(o['waterMl']),
          }))
      : [];

    const productFeedback = Array.isArray(src['productFeedback'])
      ? (src['productFeedback'] as Record<string, unknown>[])
          .filter((p) => p && mongoose.isValidObjectId(String(p['productId'])))
          .map((p) => ({
            productId: String(p['productId']),
            taste: num(p['taste'], 0, 5),
            tolerance: num(p['tolerance'], 0, 5),
            comment: typeof p['comment'] === 'string' ? String(p['comment']).trim() : '',
          }))
      : [];

    const problems = Array.isArray(digestiveSrc['problems'])
      ? (digestiveSrc['problems'] as unknown[])
          .map((x) => String(x))
          .filter((x) => DIGESTIVE_PROBLEMS.includes(x))
      : [];

    return {
      status,
      overallRating: num(src['overallRating'], 0, 5),
      actualDurationMinutes: num(src['actualDurationMinutes']),
      nutrition: {
        overallRating: num(nutritionSrc['overallRating'], 0, 5),
        energyRating: num(nutritionSrc['energyRating'], 0, 5),
        hunger: FREQ_LEVELS.includes(String(nutritionSrc['hunger']))
          ? String(nutritionSrc['hunger'])
          : undefined,
        thirst: FREQ_LEVELS.includes(String(nutritionSrc['thirst']))
          ? String(nutritionSrc['thirst'])
          : undefined,
      },
      digestive: {
        problems,
        none: Boolean(digestiveSrc['none']),
        otherDetail:
          typeof digestiveSrc['otherDetail'] === 'string'
            ? String(digestiveSrc['otherDetail']).trim()
            : '',
      },
      consumption,
      plannedWaterMl: num(src['plannedWaterMl']),
      actualWaterMl: num(src['actualWaterMl']),
      offPlan,
      productFeedback,
      finalizedAt: new Date(),
    };
  }

  /**
   * Propage les évaluations produits d'un bilan de course vers les données
   * personnelles (`nutrition_product_feedback`) : goût, tolérance, commentaire.
   */
  async function syncProductFeedback(
    userId: string,
    entries: Array<{ productId: string; taste?: number; tolerance?: number; comment?: string }>,
  ): Promise<void> {
    const ops = entries
      .filter((e) => e.taste != null || e.tolerance != null || (e.comment ?? '') !== '')
      .map((e) => {
        const set: Record<string, unknown> = {};
        if (e.taste != null) set['taste'] = e.taste;
        if (e.tolerance != null) set['tolerance'] = e.tolerance;
        if ((e.comment ?? '') !== '') set['comment'] = e.comment;
        return {
          updateOne: {
            filter: { userId, productId: e.productId },
            update: { $set: set, $setOnInsert: { userId, productId: e.productId } },
            upsert: true,
          },
        };
      });
    if (ops.length > 0) {
      await NutritionProductFeedbackModel.bulkWrite(ops);
    }
  }

  /**
   * Recalcule, pour un utilisateur, les compteurs d'usage produit à partir de
   * toutes ses courses finalisées : nombre total d'unités consommées et nombre
   * d'évènements distincts. Idempotent (remet à zéro puis recompte).
   */
  async function recomputeProductUsage(userId: string): Promise<void> {
    const events = await NutritionEventModel.find({
      userId,
      result: { $exists: true, $ne: null },
    })
      .select('result.consumption')
      .lean();

    const usage = new Map<string, { total: number; events: number }>();
    for (const ev of events) {
      const consumption =
        ((ev as { result?: { consumption?: Array<{ productId: unknown; actualQuantity?: number }> } })
          .result?.consumption) ?? [];
      const seen = new Set<string>();
      for (const c of consumption) {
        const qty = Number(c.actualQuantity) || 0;
        if (qty <= 0) continue;
        const pid = String(c.productId);
        const agg = usage.get(pid) ?? { total: 0, events: 0 };
        agg.total += qty;
        if (!seen.has(pid)) {
          agg.events += 1;
          seen.add(pid);
        }
        usage.set(pid, agg);
      }
    }

    // Remet à zéro les compteurs existants, puis applique les valeurs recomptées.
    await NutritionProductFeedbackModel.updateMany(
      { userId },
      { $set: { usageTotal: 0, eventCount: 0 } },
    );
    const ops = [...usage.entries()].map(([productId, agg]) => ({
      updateOne: {
        filter: { userId, productId },
        update: {
          $set: { usageTotal: agg.total, eventCount: agg.events },
          $setOnInsert: { userId, productId },
        },
        upsert: true,
      },
    }));
    if (ops.length > 0) {
      await NutritionProductFeedbackModel.bulkWrite(ops);
    }
  }

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

  // Finalisation d'une course : enregistre le bilan (`result`), propage les
  // évaluations produits vers les données personnelles et recompte les usages.
  router.put('/nutrition/events/:id/result', async (req: Request, res: Response) => {
    const result = sanitizeResult(req.body);
    if (!result) {
      return res
        .status(400)
        .json({ message: 'Statut de course invalide ou manquant (finished/dnf_*).' });
    }
    const event = await NutritionEventModel.findOne({
      _id: req.params['id'],
      ...eventScope(req),
    }).select('_id userId');
    if (!event) {
      return res.status(404).json({ message: 'Évènement introuvable' });
    }
    const ownerId = String((event as { userId: unknown }).userId);

    await NutritionEventModel.updateOne({ _id: event._id }, { $set: { result } });
    await syncProductFeedback(
      ownerId,
      result['productFeedback'] as Array<{
        productId: string;
        taste?: number;
        tolerance?: number;
        comment?: string;
      }>,
    );
    await recomputeProductUsage(ownerId);

    const updated = await NutritionEventModel.findById(event._id)
      .populate('items.productId')
      .lean();
    return res.json(serialize(updated));
  });

  // ----------------------------------------------------------------------
  // Nutrition — Insights (agrégats sur les courses finalisées)
  // ----------------------------------------------------------------------
  router.get('/nutrition/insights', async (req: Request, res: Response) => {
    const events = await NutritionEventModel.find({ userId: req.user!.id, result: { $exists: true, $ne: null } })
      .populate('items.productId')
      .lean();

    const avg = (values: number[]): number | null =>
      values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

    const overall: number[] = [];
    const nutritionRatings: number[] = [];
    // Tranches glucides/h → digestion & énergie.
    const bucketDefs = [
      { min: 0, max: 60 },
      { min: 60, max: 70 },
      { min: 70, max: 80 },
      { min: 80, max: 90 },
      { min: 90, max: null as number | null },
    ];
    const buckets = bucketDefs.map((b) => ({
      ...b,
      problems: [] as number[],
      energy: [] as number[],
    }));
    // Agrégats produits (goût/tolérance) par produit.
    const productAgg = new Map<
      string,
      { brand: string; name: string; events: number; taste: number[]; tolerance: number[] }
    >();

    for (const ev of events) {
      const result = (ev as { result?: Record<string, unknown> }).result;
      if (!result) continue;
      if (typeof result['overallRating'] === 'number') overall.push(result['overallRating'] as number);
      const nutrition = (result['nutrition'] ?? {}) as Record<string, unknown>;
      if (typeof nutrition['overallRating'] === 'number')
        nutritionRatings.push(nutrition['overallRating'] as number);

      // Glucides/h réel = (glucides des produits consommés + hors-plan) / durée.
      const durationMin = Number(result['actualDurationMinutes']) || 0;
      const hours = durationMin > 0 ? durationMin / 60 : 0;
      let carbsTotal = 0;
      const itemsById = new Map<string, { carbs?: number }>();
      for (const raw of (ev as { items?: unknown[] }).items ?? []) {
        const item = raw as { productId?: { _id?: unknown; carbs?: number } };
        const p = item.productId;
        if (p && typeof p === 'object' && p._id) itemsById.set(String(p._id), p);
      }
      for (const c of (result['consumption'] as Array<{ productId: unknown; actualQuantity?: number }>) ?? []) {
        const p = itemsById.get(String(c.productId));
        carbsTotal += (Number(p?.carbs) || 0) * (Number(c.actualQuantity) || 0);
      }
      for (const o of (result['offPlan'] as Array<{ carbs?: number }>) ?? []) {
        carbsTotal += Number(o.carbs) || 0;
      }
      const carbsPerHour = hours > 0 ? carbsTotal / hours : 0;

      const digestive = (result['digestive'] ?? {}) as { problems?: unknown[] };
      const problemCount = Array.isArray(digestive.problems) ? digestive.problems.length : 0;
      const energyRating =
        typeof nutrition['energyRating'] === 'number' ? (nutrition['energyRating'] as number) : null;

      if (hours > 0) {
        const bucket = buckets.find(
          (b) => carbsPerHour >= b.min && (b.max === null || carbsPerHour < b.max),
        );
        if (bucket) {
          bucket.problems.push(problemCount);
          if (energyRating !== null) bucket.energy.push(energyRating);
        }
      }

      // Produits : agrège goût/tolérance depuis result.productFeedback.
      const nameById = new Map<string, { brand: string; name: string }>();
      for (const raw of (ev as { items?: unknown[] }).items ?? []) {
        const p = (raw as { productId?: { _id?: unknown; brand?: string; name?: string } }).productId;
        if (p && typeof p === 'object' && p._id)
          nameById.set(String(p._id), { brand: p.brand ?? '', name: p.name ?? '' });
      }
      for (const pf of (result['productFeedback'] as Array<{
        productId: unknown;
        taste?: number;
        tolerance?: number;
      }>) ?? []) {
        const pid = String(pf.productId);
        const meta = nameById.get(pid) ?? { brand: '', name: '' };
        const agg =
          productAgg.get(pid) ??
          { brand: meta.brand, name: meta.name, events: 0, taste: [], tolerance: [] };
        agg.events += 1;
        if (typeof pf.taste === 'number') agg.taste.push(pf.taste);
        if (typeof pf.tolerance === 'number') agg.tolerance.push(pf.tolerance);
        productAgg.set(pid, agg);
      }
    }

    const productInsights = [...productAgg.entries()].map(([productId, a]) => ({
      productId,
      brand: a.brand,
      name: a.name,
      eventCount: a.events,
      avgTaste: avg(a.taste),
      avgTolerance: avg(a.tolerance),
    }));
    const withTolerance = productInsights.filter((p) => p.avgTolerance !== null);

    return res.json({
      racesCount: events.length,
      avgOverallRating: avg(overall),
      avgNutritionRating: avg(nutritionRatings),
      carbsBuckets: buckets
        .filter((b) => b.problems.length > 0 || b.energy.length > 0)
        .map((b) => ({
          min: b.min,
          max: b.max,
          count: b.problems.length,
          avgDigestiveProblems: avg(b.problems) ?? 0,
          avgEnergyRating: avg(b.energy) ?? 0,
        })),
      topProducts: [...withTolerance]
        .sort((a, b) => (b.avgTolerance ?? 0) - (a.avgTolerance ?? 0))
        .slice(0, 5),
      problematicProducts: [...withTolerance]
        .sort((a, b) => (a.avgTolerance ?? 0) - (b.avgTolerance ?? 0))
        .filter((p) => (p.avgTolerance ?? 5) < 3)
        .slice(0, 5),
    });
  });

  return router;
}

