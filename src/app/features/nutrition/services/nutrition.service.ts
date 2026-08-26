import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  NutritionCategory,
  NutritionEvent,
  NutritionEventResult,
  NutritionInsights,
  NutritionProduct,
} from '../../../core/models';
import type { ProductModerationStatus } from '../../../core/models/nutrition.model';

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
   * Liste les produits visibles par l'utilisateur (catalogue public validé +
   * ses propres produits). Filtrable par catégorie, et par statut de modération
   * pour les administrateurs (file de modération).
   */
  listProducts(options?: { categoryId?: string; status?: ProductModerationStatus }): Observable<NutritionProduct[]> {
    let params = new HttpParams();
    if (options?.categoryId) params = params.set('categoryId', options.categoryId);
    if (options?.status) params = params.set('status', options.status);
    return this.http.get<NutritionProduct[]>(this.productsUrl, { params });
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

  /**
   * Finalise une course : enregistre le bilan (`result`). Le serveur propage
   * les évaluations produits vers les données personnelles et recompte les
   * usages. Retourne l'évènement à jour (avec `result`).
   */
  saveEventResult(id: string, result: NutritionEventResult): Observable<NutritionEvent> {
    return this.http.put<NutritionEvent>(`${this.eventsUrl}/${id}/result`, result);
  }

  // --- Insights (agrégats multi-courses) ---

  /** Récupère les insights agrégés sur les courses finalisées de l'utilisateur. */
  getInsights(): Observable<NutritionInsights> {
    return this.http.get<NutritionInsights>('/api/nutrition/insights');
  }
}
