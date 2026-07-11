import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Atom : valeur nutritionnelle affichée avec son libellé et son unité.
 * Utilisé notamment dans les cartes produit.
 */
@Component({
  selector: 'ui-nutrient-stat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col rounded-lg bg-slate-50 px-3 py-2">
      <span class="text-[0.65rem] font-medium uppercase tracking-wide text-slate-400">
        {{ label() }}
      </span>
      <span class="text-sm font-semibold tabular-nums text-slate-800">
        {{ value() }}<span class="ml-0.5 text-xs font-normal text-slate-400">{{ unit() }}</span>
      </span>
    </div>
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
