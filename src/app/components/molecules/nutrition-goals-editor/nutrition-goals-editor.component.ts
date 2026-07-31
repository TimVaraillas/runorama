import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../atoms/icon/icon.component';
import {
  NUTRIENT_GOALS,
  type NutrientGoalKey,
  type NutrientGoalMeta,
  type NutritionGoals,
} from '../../../core/models';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

/**
 * Molecule : éditeur d'objectifs nutritionnels horaires.
 *
 * Liste dynamique et réutilisable : chaque objectif actif se règle via un
 * curseur gradué (repères chiffrés et zone recommandée surlignée) et peut être
 * supprimé, tandis qu'un sélecteur permet d'en ajouter de nouveaux. La valeur
 * est pilotée via le modèle bidirectionnel `goals`, ce qui permet de partager
 * l'UI entre le formulaire d'évènement et l'édition inline de l'inventaire.
 */
@Component({
  selector: 'ui-nutrition-goals-editor',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      @for (goal of added(); track goal.key) {
        <div class="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
          <div class="flex items-center gap-3">
            <span class="flex-1 text-sm font-medium text-slate-700">{{ goal.label }}</span>
            <span
              class="inline-flex items-baseline gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-sm font-semibold tabular-nums text-brand-700"
            >
              {{ hourlyOf(goal.key) }}
              <span class="text-xs font-medium text-brand-500">
                {{ goal.unit }}{{ goal.mode === 'hourly' ? '/h' : '' }}
              </span>
            </span>
            <button
              type="button"
              (click)="removeGoal(goal.key)"
              [attr.aria-label]="'Retirer ' + goal.label"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <ui-icon [icon]="faTrash" size="sm" />
            </button>
          </div>

          <!-- Piste graduée avec zone recommandée surlignée -->
          <div class="relative h-4">
            <div
              class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200"
            ></div>

            @if (goal.recommendedMin != null && goal.recommendedMax != null) {
              <div
                class="absolute top-1/2 h-1.5 -translate-y-1/2 bg-secondary-200"
                [style.left.%]="pct(goal.recommendedMin, goal.max)"
                [style.width.%]="pct(goal.recommendedMax - goal.recommendedMin, goal.max)"
              ></div>
            }

            @for (tick of ticksOf(goal); track tick) {
              <div
                class="absolute top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-slate-300"
                [style.left.%]="pct(tick, goal.max)"
              ></div>
            }

            <div
              class="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-600 bg-white shadow-sm"
              [style.left.%]="pct(hourlyOf(goal.key) ?? 0, goal.max)"
            ></div>

            <input
              type="range"
              min="0"
              [max]="goal.max"
              [step]="goal.step"
              [ngModel]="hourlyOf(goal.key)"
              (ngModelChange)="setHourly(goal.key, $event)"
              [attr.aria-label]="(goal.mode === 'hourly' ? 'Objectif horaire ' : 'Objectif total ') + goal.label"
              [attr.aria-valuetext]="
                (hourlyOf(goal.key) ?? 0) +
                ' ' +
                goal.unit +
                (goal.mode === 'hourly' ? ' par heure' : ' au total')
              "
              class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <!-- Étiquettes des graduations -->
          <div class="flex justify-between text-[10px] tabular-nums text-slate-400">
            @for (tick of ticksOf(goal); track tick) {
              <span>{{ tick }}</span>
            }
          </div>

          @if (goal.recommendedMin != null && goal.recommendedMax != null) {
            <p class="flex items-center gap-1.5 text-xs text-slate-400">
              <span class="inline-block h-2 w-2 rounded-full bg-secondary-200"></span>
              Zone recommandée : {{ goal.recommendedMin }}–{{ goal.recommendedMax }}
              {{ goal.unit }}/h
            </p>
          }

          <p class="text-xs leading-snug text-slate-400">{{ goal.hint }}</p>
        </div>
      } @empty {
        <p
          class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-400"
        >
          Aucun objectif défini. Ajoutez-en un ci-dessous.
        </p>
      }

      @if (available().length > 0) {
        <select
          #goalPicker
          aria-label="Ajouter un objectif de nutriment"
          (change)="addGoal(goalPicker.value); goalPicker.value = ''"
          class="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="" disabled selected>+ Ajouter un objectif…</option>
          @for (goal of available(); track goal.key) {
            <option [value]="goal.key">{{ goal.label }}</option>
          }
        </select>
      }
    </div>
  `,
})
export class NutritionGoalsEditorComponent {
  /** Objectifs édités (bidirectionnel). */
  readonly goals = model.required<NutritionGoals>();

  protected readonly faTrash = faTrash;

  /** Objectifs actifs, dans l'ordre du catalogue. */
  protected readonly added = computed(() => {
    const goals = this.goals();
    return NUTRIENT_GOALS.filter((meta) => goals[meta.key]?.enabled);
  });

  /** Nutriments encore disponibles à l'ajout. */
  protected readonly available = computed(() => {
    const goals = this.goals();
    return NUTRIENT_GOALS.filter((meta) => !goals[meta.key]?.enabled);
  });

  /** Valeur horaire courante d'un objectif. */
  protected hourlyOf(key: NutrientGoalKey): number | null {
    return this.goals()[key]?.hourly ?? null;
  }

  /** Position (0–100 %) d'une valeur sur la piste, bornée. */
  protected pct(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.min(100, Math.max(0, (value / max) * 100));
  }

  /** Valeurs des graduations d'un objectif (0 → max par `tickStep`). */
  protected ticksOf(goal: NutrientGoalMeta): number[] {
    const ticks: number[] = [];
    for (let value = 0; value <= goal.max; value += goal.tickStep) {
      ticks.push(value);
    }
    return ticks;
  }

  /** Met à jour la valeur horaire d'un objectif. */
  protected setHourly(key: NutrientGoalKey, value: number | null): void {
    this.patch(key, { hourly: value ?? 0 });
  }

  /** Ajoute un objectif (active le nutriment, restaure sa valeur par défaut si vide). */
  protected addGoal(key: string): void {
    const meta = NUTRIENT_GOALS.find((m) => m.key === key);
    if (!meta) return;
    const current = this.goals()[meta.key];
    const hourly = current && current.hourly > 0 ? current.hourly : meta.defaultHourly;
    this.patch(meta.key, { hourly, enabled: true });
  }

  /** Retire un objectif. */
  protected removeGoal(key: NutrientGoalKey): void {
    this.patch(key, { enabled: false });
  }

  /** Applique une modification partielle à un objectif. */
  private patch(key: NutrientGoalKey, patch: Partial<NutritionGoals[NutrientGoalKey]>): void {
    const goals = this.goals();
    this.goals.set({ ...goals, [key]: { ...goals[key], ...patch } });
  }
}
