import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  GpxTrack,
  GpxUploadResult,
  NutritionCategory,
  NutritionEvent,
  NutritionProduct,
} from '../../../core/models';
import type { ProductModerationStatus } from '../../../core/models/nutrition.model';

/** Page de produits renvoyée par la recherche paginée. */
export interface ProductPage {
  items: NutritionProduct[];
  total: number;
  hasMore: boolean;
}

/** Comptage des produits par statut de modération (badges admin). */
export interface ProductStatusCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
}

/**
 * Service d'accès au volet nutrition (catégories et produits) via l'API REST.
 */
@Injectable({ providedIn: 'root' })
export class NutritionService {
  private readonly http = inject(HttpClient);
  private readonly categoriesUrl = '/api/nutrition/categories';
  private readonly productsUrl = '/api/nutrition/products';
  private readonly eventsUrl = '/api/nutrition/events';

  // --- Catégories ---

  listCategories(): Observable<NutritionCategory[]> {
    return this.http.get<NutritionCategory[]>(this.categoriesUrl);
  }

  createCategory(payload: Partial<NutritionCategory>): Observable<NutritionCategory> {
    return this.http.post<NutritionCategory>(this.categoriesUrl, payload);
  }

  updateCategory(id: string, payload: Partial<NutritionCategory>): Observable<NutritionCategory> {
    return this.http.put<NutritionCategory>(`${this.categoriesUrl}/${id}`, payload);
  }

  removeCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.categoriesUrl}/${id}`);
  }

  // --- Produits ---

  /**
   * Liste **tous** les produits visibles par l'utilisateur (catalogue public
   * validé + ses propres produits). Utilisé par l'inventaire / le plan de
   * consommation qui ont besoin de l'ensemble des produits.
   */
  listProducts(options?: { categoryId?: string; status?: ProductModerationStatus }): Observable<NutritionProduct[]> {
    let params = new HttpParams().set('all', 'true');
    if (options?.categoryId) params = params.set('categoryId', options.categoryId);
    if (options?.status) params = params.set('status', options.status);
    return this.http.get<NutritionProduct[]>(this.productsUrl, { params });
  }

  /**
   * Recherche paginée des produits (filtrage serveur). Le tri est stable
   * (`marque`, `nom`) pour un défilement infini cohérent.
   */
  searchProducts(options: {
    search?: string;
    categoryId?: string;
    status?: ProductModerationStatus | '';
    favoritesOnly?: boolean;
    limit: number;
    offset: number;
  }): Observable<ProductPage> {
    let params = new HttpParams()
      .set('limit', String(options.limit))
      .set('offset', String(options.offset));
    if (options.search?.trim()) params = params.set('search', options.search.trim());
    if (options.categoryId) params = params.set('categoryId', options.categoryId);
    if (options.status) params = params.set('status', options.status);
    if (options.favoritesOnly) params = params.set('favoritesOnly', 'true');
    return this.http.get<ProductPage>(this.productsUrl, { params });
  }

  /** Compte les produits par statut de modération (badges de la file admin). */
  countProductsByStatus(options?: {
    search?: string;
    categoryId?: string;
  }): Observable<ProductStatusCounts> {
    let params = new HttpParams();
    if (options?.search?.trim()) params = params.set('search', options.search.trim());
    if (options?.categoryId) params = params.set('categoryId', options.categoryId);
    return this.http.get<ProductStatusCounts>(`${this.productsUrl}/counts`, { params });
  }

  createProduct(payload: Partial<NutritionProduct>): Observable<NutritionProduct> {
    return this.http.post<NutritionProduct>(this.productsUrl, payload);
  }

  updateProduct(id: string, payload: Partial<NutritionProduct>): Observable<NutritionProduct> {
    return this.http.put<NutritionProduct>(`${this.productsUrl}/${id}`, payload);
  }

  removeProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}`);
  }

  /** Valide un produit soumis : il devient public (admin). */
  approveProduct(id: string): Observable<NutritionProduct> {
    return this.http.post<NutritionProduct>(`${this.productsUrl}/${id}/approve`, {});
  }

  /** Refuse un produit soumis, avec un motif communiqué au contributeur (admin). */
  rejectProduct(id: string, reason: string): Observable<NutritionProduct> {
    return this.http.post<NutritionProduct>(`${this.productsUrl}/${id}/reject`, { reason });
  }

  /** Archive un produit public devenu obsolète/doublon (admin). */
  archiveProduct(id: string): Observable<NutritionProduct> {
    return this.http.post<NutritionProduct>(`${this.productsUrl}/${id}/archive`, {});
  }

  // --- Données personnelles (favori, note, évaluations) ---

  /**
   * Enregistre le favori et/ou la note personnelle de l'utilisateur courant sur
   * un produit (upsert). Retourne l'état à jour de ces données privées.
   */
  setProductFeedback(
    id: string,
    payload: { favorite?: boolean; comment?: string },
  ): Observable<{ favorite: boolean; comment: string }> {
    return this.http.put<{ favorite: boolean; comment: string }>(
      `${this.productsUrl}/${id}/feedback`,
      payload,
    );
  }

  /** Retire le favori et la note personnelle de l'utilisateur sur un produit. */
  removeProductFeedback(id: string): Observable<void> {
    return this.http.delete<void>(`${this.productsUrl}/${id}/feedback`);
  }

  // --- Évènements / stratégies alimentaires ---

  listEvents(): Observable<NutritionEvent[]> {
    return this.http.get<NutritionEvent[]>(this.eventsUrl);
  }

  getEvent(id: string): Observable<NutritionEvent> {
    return this.http.get<NutritionEvent>(`${this.eventsUrl}/${id}`);
  }

  createEvent(payload: Partial<NutritionEvent>): Observable<NutritionEvent> {
    return this.http.post<NutritionEvent>(this.eventsUrl, payload);
  }

  updateEvent(id: string, payload: Partial<NutritionEvent>): Observable<NutritionEvent> {
    return this.http.put<NutritionEvent>(`${this.eventsUrl}/${id}`, payload);
  }

  removeEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.eventsUrl}/${id}`);
  }

  // --- Trace GPX (parcours réel) ---

  /**
   * Importe (ou remplace) la trace GPX d'une stratégie. Le contenu brut est
   * envoyé en texte ; le serveur parse, calcule le D+/D- lissé et stocke la
   * trace. Renvoie la trace prête à l'affichage et les écarts détectés vs
   * l'événement (distance/D+/D-) — sans jamais modifier les données saisies.
   */
  uploadGpx(eventId: string, gpx: string, fileName?: string): Observable<GpxUploadResult> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/gpx+xml' });
    let params = new HttpParams();
    if (fileName) params = params.set('fileName', fileName);
    return this.http.post<GpxUploadResult>(`${this.eventsUrl}/${eventId}/gpx`, gpx, {
      headers,
      params,
    });
  }

  /** Charge la trace GPX (points simplifiés pour le profil) d'une stratégie. */
  getGpx(eventId: string): Observable<GpxTrack> {
    return this.http.get<GpxTrack>(`${this.eventsUrl}/${eventId}/gpx`);
  }

  /** Supprime la trace GPX d'une stratégie. */
  removeGpx(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.eventsUrl}/${eventId}/gpx`);
  }
}
