import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Page layout du volet Nutrition.
 * La navigation entre les sous-pages (Produits / Stratégies / Insights) est
 * portée par l'en-tête principal ; ce layout n'affiche que la sous-page routée.
 */
@Component({
  selector: 'app-nutrition-layout',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class NutritionLayoutPage {}
