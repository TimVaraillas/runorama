import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * Atom : valeur nutritionnelle affichée avec son libellé et son unité.
 * Utilisé notamment dans les cartes produit.
 */
@Component({
  selector: 'ui-nutrient-stat',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col rounded-lg bg-slate-100 px-3 py-2' },
  template: `
    <span class="text-[0.65rem] font-medium uppercase tracking-wide text-slate-400">
      {{ label() }}
    </span>
    <span class="text-sm font-semibold tabular-nums text-slate-800">
      {{ value() | number: '1.0-2' }}<span class="ml-0.5 text-xs font-normal text-slate-400">{{
        unit()
      }}</span>
    </span>
  `,
})
export class NutrientStatComponent {
  /** Libellé court (ex : « Glucides »). */
  readonly label = input.required<string>();
  /** Valeur numérique. */
  readonly value = input.required<number>();
  /** Unité affichée après la valeur (ex : « g », « kcal », « mg »). */
  readonly unit = input('');
}
