import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import type { NutritionEvent, NutritionProduct } from '../../../core/models';
import { buildStrategyPdfHtml } from '../../../core/utils/nutrition-pdf.util';

/**
 * Service d'export d'une stratégie alimentaire au format PDF.
 *
 * Génère un document HTML autonome (inventaire + plan de consommation) et
 * ouvre la boîte d'impression du navigateur, où l'utilisateur choisit
 * « Enregistrer en PDF ». Cette approche évite toute dépendance lourde tout en
 * produisant un rendu propre et paginé.
 */
@Injectable({ providedIn: 'root' })
export class NutritionExportService {
  private readonly document = inject(DOCUMENT);

  /**
   * Ouvre l'aperçu imprimable de la stratégie et déclenche l'impression.
   * @returns `true` si la fenêtre a pu être ouverte, `false` sinon (popup bloquée).
   */
  exportStrategyToPdf(event: NutritionEvent, products: NutritionProduct[]): boolean {
    const win = this.document.defaultView?.open('', '_blank');
    if (!win) return false;

    const html = buildStrategyPdfHtml(event, products);
    win.document.open();
    win.document.write(html);
    win.document.close();

    // Le contenu est inline (aucune ressource externe) : un court délai suffit
    // pour laisser le rendu se stabiliser avant d'ouvrir la boîte d'impression.
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        /* la fenêtre a pu être fermée entre-temps */
      }
    }, 300);

    return true;
  }
}
