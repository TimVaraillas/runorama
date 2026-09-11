import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import type { RaceStrategy, NutritionProduct, GpxTrack } from '../../../core/models';
import { buildStrategyPdfHtml } from '../../../core/utils/nutrition-pdf.util';

/**
 * Service d'export d'une stratégie alimentaire au format PDF.
 *
 * Génère un document HTML autonome (inventaire + plan de nutrition) et
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
  exportStrategyToPdf(
    event: RaceStrategy,
    products: NutritionProduct[],
    track?: GpxTrack | null,
  ): boolean {
    const win = this.document.defaultView?.open('', '_blank');
    if (!win) return false;

    const html = buildStrategyPdfHtml(event, products, track);
    win.document.open();
    win.document.write(html);
    win.document.close();

    // L'impression est déclenchée par le document lui-même une fois les tuiles de
    // la carte chargées (voir le script inline généré). On se contente ici de
    // donner le focus à la fenêtre.
    setTimeout(() => {
      try {
        win.focus();
      } catch {
        /* la fenêtre a pu être fermée entre-temps */
      }
    }, 300);

    return true;
  }
}
