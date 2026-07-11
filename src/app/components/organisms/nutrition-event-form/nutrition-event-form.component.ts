import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../atoms/button/button.component';
import type { NutritionEvent } from '../../../core/models';

/**
 * Organism : formulaire de création/modification d'un évènement (stratégie).
 *
 * Émet `save` avec la charge utile prête pour l'API (le chrono cible est
 * converti en minutes) et `cancel` à l'annulation.
 */
@Component({
  selector: 'ui-nutrition-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
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
          <label [class]="labelClass">Chrono cible (facultatif)</label>
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
          <p class="mt-1 text-xs text-slate-400">
            Utilisé pour calculer les besoins totaux à partir des besoins horaires.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label [class]="labelClass" for="event-energy">Besoin énergétique (kcal/h)</label>
            <input id="event-energy" type="number" min="0" step="10" formControlName="hourlyEnergy" [class]="inputClass" />
          </div>
          <div>
            <label [class]="labelClass" for="event-carbs">Besoin glucidique (g/h)</label>
            <input id="event-carbs" type="number" min="0" step="5" formControlName="hourlyCarbs" [class]="inputClass" />
          </div>
        </div>
      </section>

      <div class="flex items-center justify-end gap-3">
        <ui-button type="button" variant="ghost" (clicked)="cancel.emit()">Annuler</ui-button>
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

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    date: ['', Validators.required],
    location: [''],
    distance: [null as number | null, Validators.min(0)],
    elevationGain: [null as number | null, Validators.min(0)],
    elevationLoss: [null as number | null, Validators.min(0)],
    targetHours: [null as number | null, Validators.min(0)],
    targetMinutes: [null as number | null, [Validators.min(0), Validators.max(59)]],
    hourlyEnergy: [200 as number | null, [Validators.required, Validators.min(0)]],
    hourlyCarbs: [50 as number | null, [Validators.required, Validators.min(0)]],
  });

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
          distance: event.distance ?? null,
          elevationGain: event.elevationGain ?? null,
          elevationLoss: event.elevationLoss ?? null,
          targetHours: total !== null ? Math.floor(total / 60) : null,
          targetMinutes: total !== null ? total % 60 : null,
          hourlyEnergy: event.hourlyEnergy,
          hourlyCarbs: event.hourlyCarbs,
        });
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
      distance: v.distance ?? undefined,
      elevationGain: v.elevationGain ?? undefined,
      elevationLoss: v.elevationLoss ?? undefined,
      targetTimeMinutes: totalMinutes > 0 ? totalMinutes : undefined,
      hourlyEnergy: v.hourlyEnergy ?? 200,
      hourlyCarbs: v.hourlyCarbs ?? 50,
    };

    this.save.emit(payload);
  }
}
