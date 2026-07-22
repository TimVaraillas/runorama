import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { Exercise, ExerciseTarget, RangeValue, Session } from '../../../core/models';
import {
  faPlus,
  faTrash,
  faLayerGroup,
  faDumbbell,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : formulaire d'ajout/modification d'une séance.
 *
 * Construit une séance composée de blocs et d'exercices via un formulaire
 * réactif. Émet `save` avec la charge utile prête pour l'API et `cancel` à
 * l'annulation. Passez une `session` en entrée pour pré-remplir (mode édition).
 */
@Component({
  selector: 'ui-session-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-6">
      <!-- Informations générales -->
      <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label [class]="labelClass" for="session-name">Nom de la séance</label>
          <input
            id="session-name"
            type="text"
            formControlName="name"
            [class]="inputClass"
            placeholder="Ex : Intervalles VO2max 6x400m"
          />
        </div>
        <div>
          <label [class]="labelClass" for="session-desc">Description</label>
          <textarea
            id="session-desc"
            rows="2"
            formControlName="description"
            [class]="inputClass"
            placeholder="Objectif et déroulé de la séance…"
          ></textarea>
        </div>
      </section>

      <!-- Blocs -->
      <div formArrayName="blocks" class="space-y-4">
        @for (block of blocks.controls; track $index; let bi = $index) {
          <section [formGroupName]="bi" class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <div class="flex items-center justify-between gap-3">
              <span class="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ui-icon [icon]="faLayerGroup" size="sm" />
                Bloc {{ bi + 1 }}
              </span>
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                [disabled]="blocks.length === 1"
                (click)="removeBlock(bi)"
                aria-label="Supprimer le bloc"
              >
                <ui-icon [icon]="faTrash" size="sm" />
              </button>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div class="sm:col-span-2">
                <label [class]="labelClass">Nom du bloc</label>
                <input type="text" formControlName="name" [class]="inputClass" placeholder="Ex : Échauffement" />
              </div>
              <div>
                <label [class]="labelClass">Répétitions</label>
                <input type="number" min="1" formControlName="repeat" [class]="inputClass" />
              </div>
            </div>

            <div>
              <label [class]="labelClass">Description du bloc</label>
              <input type="text" formControlName="description" [class]="inputClass" placeholder="Facultatif" />
            </div>

            <!-- Exercices -->
            <div formArrayName="exercises" class="space-y-3">
              <span class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <ui-icon [icon]="faDumbbell" size="xs" />
                Exercices
              </span>

              @for (exercise of exercisesOf(bi).controls; track $index; let ei = $index) {
                <div [formGroupName]="ei" class="space-y-3 rounded-lg bg-slate-50 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="grid flex-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label [class]="labelClass">Type</label>
                        <select formControlName="metric" [class]="inputClass">
                          <option value="duration">Durée</option>
                          <option value="distance">Distance</option>
                        </select>
                      </div>
                      @if (exercise.get('metric')?.value === 'distance') {
                        <div>
                          <label [class]="labelClass">Distance (m)</label>
                          <input type="number" min="0" formControlName="distance" [class]="inputClass" />
                        </div>
                      } @else {
                        <div>
                          <label [class]="labelClass">Durée (s)</label>
                          <input type="number" min="0" formControlName="duration" [class]="inputClass" />
                        </div>
                      }
                      <div>
                        <label [class]="labelClass">Instruction</label>
                        <input type="text" formControlName="instruction" [class]="inputClass" placeholder="Facultatif" />
                      </div>
                    </div>
                    <button
                      type="button"
                      class="mt-6 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      [disabled]="exercisesOf(bi).length === 1"
                      (click)="removeExercise(bi, ei)"
                      aria-label="Supprimer l'exercice"
                    >
                      <ui-icon [icon]="faTrash" size="sm" />
                    </button>
                  </div>

                  <!-- Cible d'effort -->
                  <div class="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label [class]="labelClass">Intensité</label>
                      <input type="text" formControlName="intensity" [class]="inputClass" placeholder="Ex : Zone 3" />
                    </div>
                    <div>
                      <label [class]="labelClass">Allure (km/h)</label>
                      <div class="flex items-center gap-1">
                        <input type="number" step="0.1" min="0" formControlName="paceMin" [class]="inputClass" placeholder="min" />
                        <span class="text-slate-400">–</span>
                        <input type="number" step="0.1" min="0" formControlName="paceMax" [class]="inputClass" placeholder="max" />
                      </div>
                    </div>
                    <div>
                      <label [class]="labelClass">FC (bpm)</label>
                      <div class="flex items-center gap-1">
                        <input type="number" min="0" formControlName="pulseMin" [class]="inputClass" placeholder="min" />
                        <span class="text-slate-400">–</span>
                        <input type="number" min="0" formControlName="pulseMax" [class]="inputClass" placeholder="max" />
                      </div>
                    </div>
                    <div>
                      <label [class]="labelClass">Zone</label>
                      <input type="number" min="1" max="5" formControlName="zone" [class]="inputClass" />
                    </div>
                  </div>
                </div>
              }

              <ui-button type="button" color="default" variant="ghost" size="sm" [icon]="faPlus" (clicked)="addExercise(bi)">
                Ajouter un exercice
              </ui-button>
            </div>
          </section>
        }

        <ui-button type="button" color="secondary" variant="outlined" [icon]="faPlus" (clicked)="addBlock()">
          Ajouter un bloc
        </ui-button>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <ui-button type="button" color="default" variant="ghost" (clicked)="cancel.emit()">Annuler</ui-button>
        <ui-button type="submit" [disabled]="form.invalid">
          {{ session() ? 'Enregistrer' : 'Créer la séance' }}
        </ui-button>
      </div>
    </form>
  `,
})
export class SessionFormComponent {
  private readonly fb = inject(FormBuilder);

  /** Séance à éditer (mode modification). Absente = création. */
  readonly session = input<Session | null>(null);

  readonly save = output<Partial<Session>>();
  readonly cancel = output<void>();

  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faLayerGroup = faLayerGroup;
  readonly faDumbbell = faDumbbell;

  protected readonly labelClass = 'mb-1 block text-xs font-medium text-slate-600';
  protected readonly inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    blocks: this.fb.array([this.buildBlock()]),
  });

  constructor() {
    // Pré-remplit le formulaire quand une séance à éditer est fournie.
    effect(() => {
      const session = this.session();
      if (session) {
        this.patchFrom(session);
      }
    });
  }

  get blocks(): FormArray {
    return this.form.get('blocks') as FormArray;
  }

  exercisesOf(blockIndex: number): FormArray {
    return this.blocks.at(blockIndex).get('exercises') as FormArray;
  }

  addBlock(): void {
    this.blocks.push(this.buildBlock());
  }

  removeBlock(index: number): void {
    if (this.blocks.length > 1) {
      this.blocks.removeAt(index);
    }
  }

  addExercise(blockIndex: number): void {
    this.exercisesOf(blockIndex).push(this.buildExercise());
  }

  removeExercise(blockIndex: number, exerciseIndex: number): void {
    const exercises = this.exercisesOf(blockIndex);
    if (exercises.length > 1) {
      exercises.removeAt(exerciseIndex);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.toPayload());
  }

  // ----------------------------------------------------------------------
  // Construction des groupes de formulaire
  // ----------------------------------------------------------------------
  private buildBlock(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      description: [''],
      repeat: [1, [Validators.required, Validators.min(1)]],
      exercises: this.fb.array([this.buildExercise()]),
    });
  }

  private buildExercise(): FormGroup {
    return this.fb.group({
      metric: ['duration'],
      duration: [null as number | null],
      distance: [null as number | null],
      instruction: [''],
      intensity: [''],
      paceMin: [null as number | null],
      paceMax: [null as number | null],
      pulseMin: [null as number | null],
      pulseMax: [null as number | null],
      zone: [null as number | null],
    });
  }

  // ----------------------------------------------------------------------
  // Sérialisation vers le modèle Session
  // ----------------------------------------------------------------------
  private toPayload(): Partial<Session> {
    const raw = this.form.getRawValue() as {
      name: string | null;
      description: string | null;
      blocks: Array<Record<string, unknown>>;
    };
    return {
      name: (raw.name ?? '').trim(),
      description: this.clean(raw.description),
      blocks: (raw.blocks ?? []).map((b) => ({
        name: ((b['name'] as string | null) ?? '').trim(),
        description: this.clean(b['description'] as string | null),
        repeat: Number(b['repeat']) || 1,
        exercises: ((b['exercises'] as Array<Record<string, unknown>>) ?? []).map((e) =>
          this.toExercise(e),
        ),
      })),
    };
  }

  private toExercise(e: Record<string, unknown>): Exercise {
    const exercise: Exercise = {};
    const instruction = this.clean(e['instruction'] as string | null);
    if (instruction) {
      exercise.instruction = instruction;
    }
    if (e['metric'] === 'distance') {
      const distance = this.num(e['distance']);
      if (distance != null) {
        exercise.distance = distance;
      }
    } else {
      const duration = this.num(e['duration']);
      if (duration != null) {
        exercise.duration = duration;
      }
    }
    const target = this.toTarget(e);
    if (target) {
      exercise.target = target;
    }
    return exercise;
  }

  private toTarget(e: Record<string, unknown>): ExerciseTarget | undefined {
    const target: ExerciseTarget = {};
    const intensity = this.clean(e['intensity'] as string | null);
    if (intensity) {
      target.intensity = intensity;
    }
    const pace = this.range(e['paceMin'], e['paceMax']);
    if (pace != null) {
      target.pace = pace;
    }
    const pulse = this.range(e['pulseMin'], e['pulseMax']);
    if (pulse != null) {
      target.pulse = pulse;
    }
    const zone = this.num(e['zone']);
    if (zone != null) {
      target.zone = zone;
    }
    return Object.keys(target).length > 0 ? target : undefined;
  }

  /** Convertit une paire min/max en valeur unique ou plage. */
  private range(min: unknown, max: unknown): RangeValue | undefined {
    const lo = this.num(min);
    if (lo == null) {
      return undefined;
    }
    const hi = this.num(max);
    if (hi == null || hi === lo) {
      return lo;
    }
    return [lo, hi];
  }

  private num(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private clean(value: string | null | undefined): string | undefined {
    const trimmed = (value ?? '').trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  // ----------------------------------------------------------------------
  // Pré-remplissage (mode édition)
  // ----------------------------------------------------------------------
  private patchFrom(session: Session): void {
    this.form.patchValue({ name: session.name, description: session.description ?? '' });
    this.blocks.clear();
    for (const block of session.blocks) {
      const group = this.buildBlock();
      const exercises = group.get('exercises') as FormArray;
      exercises.clear();
      group.patchValue({
        name: block.name,
        description: block.description ?? '',
        repeat: block.repeat,
      });
      for (const exercise of block.exercises) {
        exercises.push(this.exerciseFrom(exercise));
      }
      if (exercises.length === 0) {
        exercises.push(this.buildExercise());
      }
      this.blocks.push(group);
    }
    if (this.blocks.length === 0) {
      this.blocks.push(this.buildBlock());
    }
  }

  private exerciseFrom(exercise: Exercise): FormGroup {
    const group = this.buildExercise();
    const [paceMin, paceMax] = this.splitRange(exercise.target?.pace);
    const [pulseMin, pulseMax] = this.splitRange(exercise.target?.pulse);
    group.patchValue({
      metric: exercise.distance != null ? 'distance' : 'duration',
      duration: exercise.duration ?? null,
      distance: exercise.distance ?? null,
      instruction: exercise.instruction ?? '',
      intensity: exercise.target?.intensity ?? '',
      paceMin,
      paceMax,
      pulseMin,
      pulseMax,
      zone: exercise.target?.zone ?? null,
    });
    return group;
  }

  private splitRange(value: RangeValue | undefined): [number | null, number | null] {
    if (value == null) {
      return [null, null];
    }
    return Array.isArray(value) ? [value[0], value[1]] : [value, null];
  }
}
