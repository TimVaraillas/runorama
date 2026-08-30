import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from '../../atoms/button/button.component';
import { NutritionGoalsEditorComponent } from '../../molecules/nutrition-goals-editor/nutrition-goals-editor.component';
import {
  NUTRITION_EVENT_CATEGORIES,
  type NutritionEvent,
  type NutritionEventCategory,
  type NutritionGoals,
} from '../../../core/models';
import { createDefaultGoals, resolveGoals } from '../../../core/utils/nutrition-goals.util';

/**
 * Valide qu'un chrono cible strictement positif est renseigné (heures +
 * minutes). Appliqué au groupe pour couvrir les deux champs.
 */
function chronoRequiredValidator(group: AbstractControl): ValidationErrors | null {
  const hours = group.get('targetHours')?.value ?? 0;
  const minutes = group.get('targetMinutes')?.value ?? 0;
  return hours * 60 + minutes > 0 ? null : { chronoRequired: true };
}

/**
 * Organism : formulaire de création/modification d'un évènement (stratégie).
 *
 * Émet `save` avec la charge utile prête pour l'API (le chrono cible est
 * converti en minutes) et `cancel` à l'annulation.
 */
@Component({
  selector: 'ui-nutrition-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, NutritionGoalsEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label [class]="labelClass" for="event-name">Nom de l'évènement</label>
          <input
            id="event-name"
            type="text"
            formControlName="name"
            [class]="inputClass"
            placeholder="Ex : Trail des Templiers"
          />
        </div>

        <div>
          <label [class]="labelClass" for="event-description">Description (facultative)</label>
          <textarea
            id="event-description"
            rows="2"
            formControlName="description"
            [class]="inputClass"
            placeholder="Objectif, contexte…"
          ></textarea>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label [class]="labelClass" for="event-date">Date</label>
            <input id="event-date" type="date" formControlName="date" [class]="inputClass" />
          </div>
          <div>
            <label [class]="labelClass" for="event-location">Lieu (facultatif)</label>
            <input
              id="event-location"
              type="text"
              formControlName="location"
              [class]="inputClass"
              placeholder="Ex : Millau"
            />
          </div>
        </div>

        <div>
          <label [class]="labelClass" for="event-category">Étiquette (facultative)</label>
          <select id="event-category" formControlName="category" [class]="inputClass">
            <option [ngValue]="null">Aucune</option>
            @for (category of categories; track category.value) {
              <option [ngValue]="category.value">{{ category.label }}</option>
            }
          </select>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-sm font-semibold text-slate-800">Parcours (facultatif)</h3>
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label [class]="labelClass" for="event-distance">Distance (km)</label>
            <input id="event-distance" type="number" min="0" step="0.1" formControlName="distance" [class]="inputClass" />
          </div>
          <div>
            <label [class]="labelClass" for="event-dplus">D+ (m)</label>
            <input id="event-dplus" type="number" min="0" step="1" formControlName="elevationGain" [class]="inputClass" />
          </div>
          <div>
            <label [class]="labelClass" for="event-dminus">D- (m)</label>
            <input id="event-dminus" type="number" min="0" step="1" formControlName="elevationLoss" [class]="inputClass" />
          </div>
        </div>
      </section>

      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="text-sm font-semibold text-slate-800">Objectifs</h3>
        <div>
          <label [class]="labelClass">Chrono cible</label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              formControlName="targetHours"
              [class]="inputClass"
              placeholder="Heures"
              aria-label="Heures"
            />
            <span class="text-slate-400">h</span>
            <input
              type="number"
              min="0"
              max="59"
              step="1"
              formControlName="targetMinutes"
              [class]="inputClass"
              placeholder="Minutes"
              aria-label="Minutes"
            />
            <span class="text-slate-400">min</span>
          </div>
          @if (form.hasError('chronoRequired') && form.get('targetHours')?.touched) {
            <p class="mt-1 text-xs text-rose-600">
              Le chrono cible est requis pour établir une stratégie alimentaire.
            </p>
          } @else {
            <p class="mt-1 text-xs text-slate-400">
              Base du plan de consommation et des besoins totaux (à partir des besoins horaires).
            </p>
          }
        </div>

        <div class="space-y-2">
          <p [class]="labelClass">Objectifs horaires par nutriment</p>
          <p class="text-xs text-slate-400">
            Ajoutez les nutriments à suivre et définissez leur besoin horaire cible.
          </p>
          <ui-nutrition-goals-editor
            [goals]="goalsDraft()"
            (goalsChange)="goalsDraft.set($event)"
          />
        </div>
      </section>

      <div class="flex items-center justify-end gap-3">
        <ui-button type="button" color="default" variant="ghost" (clicked)="cancel.emit()">Annuler</ui-button>
        <ui-button type="submit" [disabled]="form.invalid">
          {{ event() ? 'Enregistrer' : "Créer l'évènement" }}
        </ui-button>
      </div>
    </form>
  `,
})
export class NutritionEventFormComponent {
  private readonly fb = inject(FormBuilder);

  /** Évènement à éditer (mode modification). Absent = création. */
  readonly event = input<NutritionEvent | null>(null);

  readonly save = output<Partial<NutritionEvent>>();
  readonly cancel = output<void>();

  protected readonly labelClass = 'mb-1 block text-xs font-medium text-slate-600';
  protected readonly inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  /** Étiquettes disponibles pour le sélecteur. */
  protected readonly categories = NUTRITION_EVENT_CATEGORIES;

  /** Objectifs nutritionnels édités (pilotés par le composant réutilisable). */
  protected readonly goalsDraft = signal<NutritionGoals>(createDefaultGoals());

  readonly form = this.fb.group(
    {
      name: ['', Validators.required],
      description: [''],
      date: ['', Validators.required],
      location: [''],
      category: [null as NutritionEventCategory | null],
      distance: [null as number | null, Validators.min(0)],
      elevationGain: [null as number | null, Validators.min(0)],
      elevationLoss: [null as number | null, Validators.min(0)],
      targetHours: [null as number | null, Validators.min(0)],
      targetMinutes: [null as number | null, [Validators.min(0), Validators.max(59)]],
    },
    { validators: chronoRequiredValidator },
  );

  constructor() {
    // Pré-remplit le formulaire quand un évènement à éditer est fourni.
    effect(() => {
      const event = this.event();
      if (event) {
        const total = event.targetTimeMinutes ?? null;
        this.form.reset({
          name: event.name,
          description: event.description ?? '',
          date: event.date,
          location: event.location ?? '',
          category: event.category ?? null,
          distance: event.distance ?? null,
          elevationGain: event.elevationGain ?? null,
          elevationLoss: event.elevationLoss ?? null,
          targetHours: total !== null ? Math.floor(total / 60) : null,
          targetMinutes: total !== null ? total % 60 : null,
        });
        this.goalsDraft.set(resolveGoals(event));
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    const hours = v.targetHours ?? 0;
    const minutes = v.targetMinutes ?? 0;
    const totalMinutes = hours * 60 + minutes;

    const payload: Partial<NutritionEvent> = {
      name: v.name!.trim(),
      description: v.description?.trim() || undefined,
      date: v.date!,
      location: v.location?.trim() || undefined,
      category: v.category ?? undefined,
      distance: v.distance ?? undefined,
      elevationGain: v.elevationGain ?? undefined,
      elevationLoss: v.elevationLoss ?? undefined,
      targetTimeMinutes: totalMinutes > 0 ? totalMinutes : undefined,
      goals: this.goalsDraft(),
    };

    this.save.emit(payload);
  }
}
