import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';

/**
 * Service d'accès au volet nutrition (catégories et produits) via l'API REST.
 */
@Injectable({ providedIn: 'root' })
export class NutritionService {
  private readonly http = inject(HttpClient);
  private readonly categoriesUrl = '/api/nutrition/categories';
  private readonly productsUrl = '/api/nutrition/products';

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

  /** Liste les produits, éventuellement filtrés par catégorie. */
  listProducts(categoryId?: string): Observable<NutritionProduct[]> {
    let params = new HttpParams();
    if (categoryId) params = params.set('categoryId', categoryId);
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
}
