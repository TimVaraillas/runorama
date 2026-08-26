import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NutritionService } from '../../../features/nutrition/services/nutrition.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../components/atoms/icon/icon.component';
import type { NutritionInsights } from '../../../core/models';
import {
  faChartLine,
  faFaceGrinStars,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Sous-page Nutrition : insights agrégés sur les courses finalisées.
 *
 * Présente les corrélations entre glucides/h et ressenti digestif, ainsi que
 * les produits les mieux tolérés et les plus problématiques.
 */
@Component({
  selector: 'app-nutrition-insights-page',
  standalone: true,
  imports: [IconComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      @if (insights(); as data) {
        @if (data.racesCount === 0) {
          <div
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
          >
            <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ui-icon [icon]="faChartLine" size="xl" />
            </div>
            <p class="text-slate-600">Aucune course finalisée pour le moment.</p>
            <p class="text-sm text-slate-400">
              Finalisez vos courses depuis leur inventaire pour alimenter vos statistiques.
            </p>
          </div>
        } @else {
          <!-- Résumé -->
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-sm font-medium text-slate-500">Courses finalisées</p>
              <p class="mt-1 text-3xl font-bold text-slate-800">{{ data.racesCount }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-sm font-medium text-slate-500">Ressenti général moyen</p>
              <p class="mt-1 text-3xl font-bold text-slate-800">{{ formatRating(data.avgOverallRating) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-sm font-medium text-slate-500">Ressenti nutritionnel moyen</p>
              <p class="mt-1 text-3xl font-bold text-slate-800">{{ formatRating(data.avgNutritionRating) }}</p>
            </div>
          </div>

          <!-- Corrélation glucides/h ↔ digestion -->
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <h2 class="mb-4 text-lg font-semibold text-slate-800">
              Glucides/h &amp; ressenti digestif
            </h2>
            @if (nonEmptyBuckets(data).length === 0) {
              <p class="text-sm text-slate-400">Pas encore assez de données.</p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-slate-200 text-left text-slate-500">
                      <th class="py-2 pr-4 font-medium">Tranche (g/h)</th>
                      <th class="py-2 pr-4 font-medium">Courses</th>
                      <th class="py-2 pr-4 font-medium">Problèmes digestifs moy.</th>
                      <th class="py-2 font-medium">Énergie moy.</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (bucket of nonEmptyBuckets(data); track bucket.min) {
                      <tr class="border-b border-slate-100 last:border-0">
                        <td class="py-2 pr-4 font-medium text-slate-700">
                          {{ bucketLabel(bucket.min, bucket.max) }}
                        </td>
                        <td class="py-2 pr-4 text-slate-600">{{ bucket.count }}</td>
                        <td class="py-2 pr-4 text-slate-600">
                          {{ bucket.avgDigestiveProblems | number: '1.0-1' }}
                        </td>
                        <td class="py-2 text-slate-600">
                          {{ bucket.avgEnergyRating | number: '1.0-1' }} / 5
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- Produits -->
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <ui-icon [icon]="faFaceGrinStars" size="sm" class="text-emerald-500" />
                Mieux tolérés / appréciés
              </h2>
              @if (data.topProducts.length === 0) {
                <p class="text-sm text-slate-400">Pas encore d'évaluation produit.</p>
              } @else {
                <ul class="space-y-3">
                  @for (product of data.topProducts; track product.productId) {
                    <li class="flex items-center justify-between gap-4">
                      <div class="min-w-0">
                        <p class="truncate font-medium text-slate-700">{{ product.name }}</p>
                        <p class="truncate text-xs text-slate-400">
                          {{ product.brand }} · {{ product.eventCount }} course(s)
                        </p>
                      </div>
                      <div class="shrink-0 text-right text-xs text-slate-500">
                        <p>Goût : {{ formatRating(product.avgTaste) }}</p>
                        <p>Tolérance : {{ formatRating(product.avgTolerance) }}</p>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <ui-icon [icon]="faTriangleExclamation" size="sm" class="text-amber-500" />
                À surveiller
              </h2>
              @if (data.problematicProducts.length === 0) {
                <p class="text-sm text-slate-400">Aucun produit problématique détecté.</p>
              } @else {
                <ul class="space-y-3">
                  @for (product of data.problematicProducts; track product.productId) {
                    <li class="flex items-center justify-between gap-4">
                      <div class="min-w-0">
                        <p class="truncate font-medium text-slate-700">{{ product.name }}</p>
                        <p class="truncate text-xs text-slate-400">
                          {{ product.brand }} · {{ product.eventCount }} course(s)
                        </p>
                      </div>
                      <div class="shrink-0 text-right text-xs text-slate-500">
                        <p>Goût : {{ formatRating(product.avgTaste) }}</p>
                        <p>Tolérance : {{ formatRating(product.avgTolerance) }}</p>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          </div>
        }
      } @else {
        <p class="text-slate-400">Chargement des insights…</p>
      }
    </section>
  `,
})
export class NutritionInsightsPage {
  private readonly service = inject(NutritionService);
  private readonly toast = inject(ToastService);

  protected readonly faChartLine = faChartLine;
  protected readonly faFaceGrinStars = faFaceGrinStars;
  protected readonly faTriangleExclamation = faTriangleExclamation;

  protected readonly insights = signal<NutritionInsights | null>(null);

  constructor() {
    this.service
      .getInsights()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (data) => this.insights.set(data),
        error: () => {
          this.toast.error('Impossible de charger les insights.');
          this.insights.set({
            racesCount: 0,
            avgOverallRating: null,
            avgNutritionRating: null,
            carbsBuckets: [],
            topProducts: [],
            problematicProducts: [],
          });
        },
      });
  }

  /** Formate une note moyenne 0–5, ou « — » si absente. */
  protected formatRating(value: number | null): string {
    return value == null ? '—' : `${value.toFixed(1)} / 5`;
  }

  /** Filtre les tranches contenant au moins une course. */
  protected nonEmptyBuckets(data: NutritionInsights) {
    return data.carbsBuckets.filter((b) => b.count > 0);
  }

  /** Libellé lisible d'une tranche glucidique. */
  protected bucketLabel(min: number, max: number | null): string {
    return max == null ? `${min}+` : `${min}–${max}`;
  }
}
