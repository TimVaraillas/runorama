import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from '../../atoms/button/button.component';
import { TimePickerComponent } from '../../atoms/time-picker/time-picker.component';
import { DatePickerComponent } from '../../atoms/date-picker/date-picker.component';
import { NutritionGoalsEditorComponent } from '../../molecules/nutrition-goals-editor/nutrition-goals-editor.component';
import {
  RACE_STRATEGY_CATEGORIES,
  type RaceStrategy,
  type RaceStrategyCategory,
  type NutritionGoals,
} from '../../../core/models';
import { createDefaultGoals, resolveGoals } from '../../../core/utils/nutrition-goals.util';

/**
 * Organism : formulaire de création/modification d'un évènement (stratégie).
 *
 * Émet `save` avec la charge utile prête pour l'API (le chrono cible est
 * converti en minutes) et `cancel` à l'annulation.
 */
@Component({
  selector: 'ui-race-strategy-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, TimePickerComponent, DatePickerComponent, NutritionGoalsEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label [class]="labelClass" for="event-name">Nom de la course</label>
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
            <ui-date-picker
              label="Date"
              [labelClass]="labelClass"
              [triggerClass]="inputClass"
              [(value)]="dateValue"
            />
          </div>
          <div>
            <ui-time-picker
              label="Heure de départ"
              [labelClass]="labelClass"
              [triggerClass]="inputClass"
              [(hours)]="startHour"
              [(minutes)]="startMinute"
            />
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
          <ui-time-picker
            label="Chrono cible"
            [labelClass]="labelClass"
            [triggerClass]="inputClass"
            [(hours)]="chronoHours"
            [(minutes)]="chronoMinutes"
            [maxHours]="99"
          />
          @if (chronoInvalid() && submitted()) {
            <p class="mt-1 text-xs text-rose-600">
              Le chrono cible est requis pour établir une stratégie de course.
            </p>
          } @else {
            <p class="mt-1 text-xs text-slate-400">
              Base du plan de nutrition et des besoins totaux (à partir des besoins horaires).
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
        <ui-button type="submit" [disabled]="form.invalid || chronoInvalid() || dateInvalid()">
          {{ event() ? 'Enregistrer' : 'Créer la course' }}
        </ui-button>
      </div>
    </form>
  `,
})
export class RaceStrategyFormComponent {
  private readonly fb = inject(FormBuilder);

  /** Évènement à éditer (mode modification). Absent = création. */
  readonly event = input<RaceStrategy | null>(null);

  readonly save = output<Partial<RaceStrategy>>();
  readonly cancel = output<void>();

  protected readonly labelClass = 'mb-1 block text-xs font-medium text-slate-600';
  protected readonly inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  /** Étiquettes disponibles pour le sélecteur. */
  protected readonly categories = RACE_STRATEGY_CATEGORIES;

  /** Objectifs nutritionnels édités (pilotés par le composant réutilisable). */
  protected readonly goalsDraft = signal<NutritionGoals>(createDefaultGoals());

  /** Heure de départ (pilotée par le sélecteur, hors FormGroup). */
  protected readonly startHour = signal(8);
  protected readonly startMinute = signal(0);

  /** Date de la course (pilotée par le sélecteur, hors FormGroup), ISO `YYYY-MM-DD`. */
  protected readonly dateValue = signal('');
  protected readonly dateInvalid = computed(() => !this.dateValue());

  /** Chrono cible (piloté par le sélecteur, hors FormGroup). */
  protected readonly chronoHours = signal(0);
  protected readonly chronoMinutes = signal(0);
  protected readonly chronoInvalid = computed(() => this.chronoHours() * 60 + this.chronoMinutes() <= 0);

  /** Passe à `true` à la première tentative de soumission (affichage des erreurs). */
  protected readonly submitted = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    location: [''],
    category: [null as RaceStrategyCategory | null],
    distance: [null as number | null, Validators.min(0)],
    elevationGain: [null as number | null, Validators.min(0)],
    elevationLoss: [null as number | null, Validators.min(0)],
  });

  constructor() {
    // Pré-remplit le formulaire quand un évènement à éditer est fourni.
    effect(() => {
      const event = this.event();
      if (event) {
        const total = event.targetTimeMinutes ?? 0;
        const [startH, startM] = (event.startTime ?? '08:00').split(':').map(Number);
        this.form.reset({
          name: event.name,
          description: event.description ?? '',
          location: event.location ?? '',
          category: event.category ?? null,
          distance: event.distance ?? null,
          elevationGain: event.elevationGain ?? null,
          elevationLoss: event.elevationLoss ?? null,
        });
        this.dateValue.set(event.date ?? '');
        this.startHour.set(startH ?? 8);
        this.startMinute.set(startM ?? 0);
        this.chronoHours.set(Math.floor(total / 60));
        this.chronoMinutes.set(total % 60);
        this.goalsDraft.set(resolveGoals(event));
      }
    });
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.chronoInvalid() || this.dateInvalid()) return;
    const v = this.form.getRawValue();

    const totalMinutes = this.chronoHours() * 60 + this.chronoMinutes();
    const startTime = `${this.startHour().toString().padStart(2, '0')}:${this.startMinute().toString().padStart(2, '0')}`;

    const payload: Partial<RaceStrategy> = {
      name: v.name!.trim(),
      description: v.description?.trim() || undefined,
      date: this.dateValue(),
      startTime,
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
