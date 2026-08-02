import type { NutritionProduct } from '../models/nutrition.model';

/**
 * Capacités d'action sur un produit selon l'utilisateur courant.
 *
 * Centralise la logique d'autorisation côté UI (miroir des règles serveur) afin
 * que le tableau, la grille et la carte restent cohérents :
 * - un administrateur peut éditer/supprimer n'importe quel produit et modérer ;
 * - un propriétaire peut éditer/supprimer son produit tant qu'il n'est pas
 *   public (une fois publié, l'édition passe par l'administrateur).
 */
export interface ProductCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canReject: boolean;
  canArchive: boolean;
}

/** Calcule les capacités d'action sur un produit pour l'utilisateur courant. */
export function productCapabilities(
  product: NutritionProduct,
  currentUserId: string | null,
  isAdmin: boolean,
): ProductCapabilities {
  const isOwner = Boolean(product.ownerId) && product.ownerId === currentUserId;
  const isPublic = product.visibility === 'public';
  const status = product.moderationStatus;
  const canManage = isAdmin || (isOwner && !isPublic);
  return {
    canEdit: canManage,
    canDelete: canManage,
    canApprove: isAdmin && status !== 'approved',
    canReject: isAdmin && status === 'pending',
    canArchive: isAdmin && status === 'approved',
  };
}
