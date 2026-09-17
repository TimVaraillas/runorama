import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import type {
  GpxTrack,
  PacingPlan,
  PacingScenario,
  RaceStrategy,
} from '../../../core/models';
import {
  buildPacingSegments,
  createAutomaticPacingPlan,
  PACING_TERRAIN_LABELS,
  type PacingSegment,
} from '../../../core/utils/pacing.util';
import { formatPassageTime } from '../../../core/utils/passage-time.util';
import { newLocalId } from '../../../core/utils/aid-station.util';
import {
  faClone,
  faGaugeHigh,
  faLock,
  faLockOpen,
  faPause,
  faPen,
  faPersonRunning,
  faPlus,
  faStar,
  faStopwatch,
  faTrash,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

/** Charge utile émise à chaque modification des scénarios de pacing. */
export type PacingSavePayload = Pick<
  RaceStrategy,
  'pacingScenarios' | 'referenceScenarioId' | 'pacingPlan' | 'targetTimeMinutes'
>;

/** État interne : liste des scénarios + identifiant du scénario de référence. */
interface ScenarioState {
  scenarios: PacingScenario[];
  referenceId: string | null;
}

@Component({
  selector: 'ui-pacing-panel',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (track(); as route) {
      <!-- Sélecteur de scénarios -->
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-6 py-3">
        @for (scenario of state().scenarios; track scenario.id) {
          <button
            type="button"
            [class]="scenarioPillClass(scenario.id)"
            (click)="selectScenario(scenario.id)"
          >
            @if (scenario.id === state().referenceId) {
              <ui-icon [icon]="faStar" size="xs" class="text-amber-500" />
            }
            <span>{{ scenario.name }}</span>
            <span class="tabular-nums text-xs text-slate-400">{{ durationLabel(scenario.targetTimeMinutes) }}</span>
          </button>
        }
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100"
          (click)="addScenario()"
        >
          <ui-icon [icon]="faPlus" size="xs" />
          Ajouter
        </button>

        <div class="ml-auto flex flex-wrap items-center gap-2">
          @if (!editPanelOpen()) {
            <ui-button
              size="sm"
              color="primary"
              variant="full"
              [icon]="faPen"
              title="Éditer le scénario"
              (clicked)="openEditPanel()"
            >
              Éditer
            </ui-button>
          }

          <ui-button
            size="sm"
            color="secondary"
            variant="ghost"
            [icon]="faStar"
            [disabled]="isReference()"
            title="Définir comme scenario de référence"
            (clicked)="setSelectedAsReference()"
          />
          <ui-button
            size="sm"
            color="default"
            variant="ghost"
            [icon]="faClone"
            (clicked)="duplicateSelected()"
            title="Dupliquer"
          />
          <ui-button
            size="sm"
            color="danger"
            variant="ghost"
            [icon]="faTrash"
            [disabled]="state().scenarios.length <= 1"
            (clicked)="deleteSelected()"
            title="Supprimer"
          />
        </div>
      </div>

      <div class="flex items-start">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border-b border-slate-200 px-6 py-5">
            <div class="flex flex-wrap items-center gap-6 text-sm">
              <span class="inline-flex items-center gap-1.5 text-slate-600">
                <ui-icon [icon]="faStopwatch" size="sm" class="text-brand-500" />
                <span class="text-slate-400">Chrono cible</span>
                <span class="tabular-nums text-slate-500 font-medium">{{ durationLabel(targetTime()) }}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 text-slate-600">
                <ui-icon [icon]="faPersonRunning" size="sm" class="text-brand-500" />
                <span class="text-slate-400">En course</span>
                <span class="tabular-nums text-slate-500 font-medium">{{ durationLabel(runningMinutes()) }}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 text-slate-600">
                <ui-icon [icon]="faPause" size="sm" class="text-brand-500" />
                <span class="text-slate-400">Arrêts</span>
                <span class="tabular-nums text-slate-500 font-medium">{{ durationLabel(stopMinutes()) }}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 text-slate-600">
                <ui-icon [icon]="faGaugeHigh" size="sm" class="text-brand-500" />
                <span class="text-slate-400">Allure moyenne</span>
                <span class="tabular-nums text-slate-500 font-medium">{{ globalPaceLabel(route) }}</span>
              </span>
            </div>
          </div>

          <div class="space-y-4 px-3 pt-3">
            @if (warning()) {
              <p class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {{ warning() }}
              </p>
            }

            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table class="min-w-250 w-full text-left text-sm">
                <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                  <th class="px-3 py-3 font-medium">Segment</th><th class="px-3 py-3 text-right font-medium">Dist. / D+ / D-</th><th class="px-3 py-3 font-medium">Terrain</th><th class="px-3 py-3 text-right font-medium">Temps</th><th class="px-3 py-3 text-right font-medium">Allure</th><th class="px-3 py-3 text-right font-medium">Vitesse</th><th class="px-3 py-3 text-right font-medium">Arrivée</th><th class="px-3 py-3"></th>
                </tr></thead>
                <tbody class="divide-y divide-slate-100">
                  @for (segment of segments(); track segment.id) {
                    <tr class="align-middle">
                      <td class="px-3 py-3"><span class="font-semibold text-slate-800">{{ segment.fromLabel }}</span><span class="mx-1 text-slate-300">→</span><span class="font-semibold text-slate-800">{{ segment.toLabel }}</span></td>
                      <td class="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600">{{ segment.distance.toFixed(1) }} km · +{{ round(segment.elevationGain) }} / -{{ round(segment.elevationLoss) }}</td>
                      <td class="px-3 py-3"><select class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs" [value]="segment.terrain" (change)="setTerrain(segment.id, $any($event.target).value)">@for (terrain of terrains; track terrain) { <option [value]="terrain">{{ terrainLabel(terrain) }}</option> }</select></td>
                      <td class="px-3 py-3 text-right"><input class="w-16 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums" type="number" min="0" [value]="segment.durationMinutes" (change)="setDuration(segment.id, $any($event.target).valueAsNumber)" /> <span class="text-xs text-slate-400">min</span></td>
                      <td class="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">{{ paceLabel(segment) }}</td>
                      <td class="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">{{ speedLabel(segment) }}</td>
                      <td class="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-800">{{ arrivalLabel(segment) }}</td>
                      <td class="px-3 py-3"><button type="button" class="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" [attr.aria-label]="segment.locked ? 'Déverrouiller le segment' : 'Verrouiller le segment'" (click)="toggleLock(segment.id)"><ui-icon [icon]="segment.locked ? faLock : faLockOpen" size="sm" /></button></td>
                    </tr>
                    @if (segment.stopMinutes > 0) { <tr class="bg-amber-50/60 text-xs text-amber-800"><td class="px-3 py-2 font-medium" colspan="6">Arrêt à {{ segment.toLabel }}</td><td class="px-3 py-2 text-right tabular-nums">{{ segment.stopMinutes }} min · départ {{ formatTime(segment.arrivalMinutes + segment.stopMinutes) }}</td><td></td></tr> }
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Aside : édition du scénario, collé à droite depuis la barre grise (pas de card) -->
        @if (editPanelOpen()) {
          <aside
            class="sticky top-0 w-100 shrink-0 self-stretch border-l border-slate-200 bg-white"
            aria-label="Éditer le scénario"
          >
            <div class="flex items-center justify-between px-4 py-3">
              <h2 class="font-display text-base font-bold text-slate-900">Éditer le scénario</h2>
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                (click)="closeEditPanel()"
                aria-label="Fermer"
              >
                <ui-icon [icon]="faXmark" size="md" />
              </button>
            </div>

            <div class="space-y-5 p-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Nom du scénario</label>
                <input
                  type="text"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  [value]="editFormName()"
                  (input)="onEditNameChange($any($event.target).value)"
                  placeholder="Ex. Réaliste, Optimiste..."
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700">Cible</label>
                <div class="mb-2 inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
                  <button
                    type="button"
                    [class]="targetModeButtonClass('duration')"
                    (click)="setTargetMode('duration')"
                  >
                    Chrono
                  </button>
                  <button
                    type="button"
                    [class]="targetModeButtonClass('pace')"
                    (click)="setTargetMode('pace')"
                  >
                    Allure
                  </button>
                </div>

                @if (targetMode() === 'duration') {
                  <div class="relative">
                    <input
                      type="text"
                      class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-12 text-sm tabular-nums text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      [value]="editFormDuration()"
                      (input)="onEditDurationChange($any($event.target).value)"
                      placeholder="ex. 10h30 ou 10:30"
                    />
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                      hh:mm
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-400">
                    Format : 10h30 ou 10:30
                    @if (editFormPace()) {
                      · soit ≈ {{ editFormPace() }} /km
                    }
                  </p>
                } @else {
                  <div class="relative">
                    <input
                      type="text"
                      class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-14 text-sm tabular-nums text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      [value]="editFormPace()"
                      (input)="onEditPaceChange($any($event.target).value)"
                      placeholder="ex. 5:30"
                    />
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                      /km
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-400">
                   @if (editFormDuration()) {
                      Soit ≈ {{ editFormDuration() }}
                    }
                  </p>
                }
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700">Répartition automatique</label>
                <div class="flex flex-wrap gap-2">
                  @for (option of strategies; track option.value) {
                    <ui-button
                      size="sm"
                      color="default"
                      variant="outlined"
                      [icon]="faWandMagicSparkles"
                      (clicked)="applyAutomatic(option.value)"
                    >
                      {{ option.label }}
                    </ui-button>
                  }
                </div>
                <p class="mt-1 text-xs text-slate-400">
                  Recalcule la répartition des segments selon le chrono cible.
                </p>
              </div>

              @if (editError()) {
                <p class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {{ editError() }}
                </p>
              }
            </div>
          </aside>
        }
      </div>
    } @else {
      <div class="m-3 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Importez une trace GPX pour planifier les allures.
      </div>
    }
  `,
})
export class PacingPanelComponent {
  readonly event = input.required<RaceStrategy>();
  readonly track = input<GpxTrack | null>(null);
  readonly save = output<PacingSavePayload>();

  protected readonly faWandMagicSparkles = faWandMagicSparkles;
  protected readonly faStopwatch = faStopwatch;
  protected readonly faPersonRunning = faPersonRunning;
  protected readonly faPause = faPause;
  protected readonly faGaugeHigh = faGaugeHigh;
  protected readonly faLock = faLock;
  protected readonly faLockOpen = faLockOpen;
  protected readonly faStar = faStar;
  protected readonly faPlus = faPlus;
  protected readonly faPen = faPen;
  protected readonly faClone = faClone;
  protected readonly faTrash = faTrash;
  protected readonly faXmark = faXmark;

  protected readonly terrains = Object.keys(PACING_TERRAIN_LABELS) as PacingSegment['terrain'][];
  protected readonly strategies = [
    { value: 'CAUTIOUS', label: 'Prudent' },
    { value: 'BALANCED', label: 'Équilibré' },
    { value: 'AGGRESSIVE', label: 'Offensif' },
    { value: 'NEGATIVE_SPLIT', label: 'Negative split' },
  ] as const;

  protected readonly warning = signal<string | null>(null);

  /** État du panneau latéral d'édition du scénario. */
  protected readonly editPanelOpen = signal(false);
  protected readonly editFormName = signal('');
  protected readonly editFormDuration = signal('');
  protected readonly editFormPace = signal('');
  protected readonly editError = signal<string | null>(null);
  /** Grandeur pilotée par l'utilisateur dans la section « Cible » (l'autre est dérivée). */
  protected readonly targetMode = signal<'duration' | 'pace'>('duration');

  /** État issu de la course (scénarios existants ou plan legacy converti). */
  private readonly initialState = computed<ScenarioState>(() => this.normalize(this.event()));
  /** Modifications locales appliquées par-dessus l'état initial. */
  private readonly override = signal<ScenarioState | null>(null);
  protected readonly state = computed<ScenarioState>(() => this.override() ?? this.initialState());

  /** Identifiant du scénario sélectionné (édition). */
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed<PacingScenario | null>(() => {
    const state = this.state();
    const id = this.selectedId() ?? state.referenceId ?? state.scenarios[0]?.id ?? null;
    return state.scenarios.find((scenario) => scenario.id === id) ?? state.scenarios[0] ?? null;
  });
  protected readonly isReference = computed(() => this.selected()?.id === this.state().referenceId);

  protected readonly targetTime = computed(() => this.selected()?.targetTimeMinutes ?? 0);
  protected readonly segments = computed(() => {
    const track = this.track();
    const scenario = this.selected();
    return track && scenario
      ? buildPacingSegments(track, this.event().aidStations ?? [], this.event().waypoints ?? [], scenario.pacingPlan, scenario.targetTimeMinutes)
      : [];
  });
  protected readonly stopMinutes = computed(() => this.segments().reduce((sum, segment) => sum + segment.stopMinutes, 0));
  protected readonly runningMinutes = computed(() => this.segments().reduce((sum, segment) => sum + segment.durationMinutes, 0));

  protected globalPaceLabel(track: GpxTrack): string {
    const targetTime = this.targetTime();
    if (track.distance <= 0 || targetTime <= 0) return '—';
    const totalSeconds = Math.round((targetTime / track.distance) * 60);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')} /km`;
  }

  protected scenarioPillClass(id: string): string {
    const active = this.selected()?.id === id;
    return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
      active
        ? 'border-brand-300 bg-brand-50 text-brand-700'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
    }`;
  }

  protected targetModeButtonClass(mode: 'duration' | 'pace'): string {
    const active = this.targetMode() === mode;
    return `rounded px-2 py-1 text-center font-medium transition-colors ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;
  }

  protected setTargetMode(mode: 'duration' | 'pace'): void {
    this.targetMode.set(mode);
  }

  protected selectScenario(id: string): void {
    this.closeEditPanel();
    this.warning.set(null);
    this.selectedId.set(id);
  }

  protected addScenario(): void {
    const state = this.state();
    const base = this.selected();
    const scenario: PacingScenario = {
      id: newLocalId('scenario'),
      name: `Scénario ${state.scenarios.length + 1}`,
      pacingPlan: this.clonePlan(base?.pacingPlan),
      targetTimeMinutes: base?.targetTimeMinutes ?? 0,
    };
    const scenarios = [...state.scenarios, scenario];
    const referenceId = state.referenceId ?? scenario.id;
    this.commit({ scenarios, referenceId }, scenario.id);
    this.openEditPanel();
  }

  protected duplicateSelected(): void {
    const state = this.state();
    const source = this.selected();
    if (!source) return;
    const copy: PacingScenario = {
      id: newLocalId('scenario'),
      name: `${source.name} (copie)`,
      pacingPlan: this.clonePlan(source.pacingPlan),
      targetTimeMinutes: source.targetTimeMinutes,
    };
    this.commit({ ...state, scenarios: [...state.scenarios, copy] }, copy.id);
  }

  protected openEditPanel(): void {
    const scenario = this.selected();
    if (!scenario) return;
    this.editFormName.set(scenario.name);
    this.editFormDuration.set(this.durationLabel(scenario.targetTimeMinutes));
    this.targetMode.set('duration');
    const distance = this.track()?.distance ?? 0;
    if (distance > 0 && scenario.targetTimeMinutes > 0) {
      this.editFormPace.set(this.formatPace(scenario.targetTimeMinutes / distance));
    } else {
      this.editFormPace.set('');
    }
    this.editError.set(null);
    this.editPanelOpen.set(true);
  }

  protected closeEditPanel(): void {
    this.editPanelOpen.set(false);
    this.editError.set(null);
  }

  protected onEditNameChange(value: string): void {
    this.editFormName.set(value);
    const trimmed = value.trim();
    if (!trimmed) {
      this.editError.set('Le nom du scénario est requis.');
      return;
    }
    this.editError.set(null);
    this.updateSelected((current) => ({ ...current, name: trimmed }));
  }

  protected onEditDurationChange(value: string): void {
    this.editFormDuration.set(value);
    const minutes = this.parseDuration(value);
    if (minutes === null || minutes <= 0) {
      this.editError.set('Le chrono cible est invalide.');
      return;
    }
    const distance = this.track()?.distance ?? 0;
    if (distance > 0) {
      this.editFormPace.set(this.formatPace(minutes / distance));
    }
    this.commitTarget(minutes);
  }

  protected onEditPaceChange(value: string): void {
    this.editFormPace.set(value);
    const pace = this.parsePace(value);
    const distance = this.track()?.distance ?? 0;
    if (pace === null || pace <= 0 || distance <= 0) {
      this.editError.set("L'allure cible est invalide.");
      return;
    }
    const minutes = Math.round(pace * distance);
    this.editFormDuration.set(this.durationLabel(minutes));
    this.commitTarget(minutes);
  }

  /** Recalcule le plan pour le chrono cible donné et sauvegarde immédiatement. */
  private commitTarget(minutes: number): void {
    const track = this.track();
    const scenario = this.selected();
    if (!scenario) return;

    let plan = scenario.pacingPlan;
    if (track && minutes !== scenario.targetTimeMinutes) {
      const strategy =
        scenario.pacingPlan.strategy && scenario.pacingPlan.strategy !== 'CUSTOM'
          ? scenario.pacingPlan.strategy
          : 'BALANCED';
      const newPlan = createAutomaticPacingPlan(
        track,
        this.event().aidStations ?? [],
        this.event().waypoints ?? [],
        minutes,
        scenario.pacingPlan,
        strategy,
      );
      if (!newPlan) {
        this.editError.set('Les segments verrouillés et les arrêts dépassent le chrono cible.');
        return;
      }
      plan = newPlan;
    }

    this.editError.set(null);
    this.updateSelected((current) => ({ ...current, pacingPlan: plan, targetTimeMinutes: minutes }));
  }

  protected setSelectedAsReference(): void {
    const scenario = this.selected();
    if (!scenario) return;
    this.commit({ ...this.state(), referenceId: scenario.id });
  }

  protected deleteSelected(): void {
    const state = this.state();
    const scenario = this.selected();
    if (!scenario || state.scenarios.length <= 1) return;
    const scenarios = state.scenarios.filter((item) => item.id !== scenario.id);
    const referenceId = state.referenceId === scenario.id ? scenarios[0]!.id : state.referenceId;
    this.commit({ scenarios, referenceId }, referenceId ?? scenarios[0]!.id);
  }

  protected applyAutomatic(strategy: NonNullable<PacingPlan['strategy']>): void {
    const track = this.track();
    const scenario = this.selected();
    if (!track || !scenario) return;
    // Depuis le panneau d'édition, on distribue selon le chrono cible saisi.
    const target = this.editPanelOpen()
      ? this.parseDuration(this.editFormDuration()) ?? scenario.targetTimeMinutes
      : scenario.targetTimeMinutes;
    if (!target) return;
    const plan = createAutomaticPacingPlan(track, this.event().aidStations ?? [], this.event().waypoints ?? [], target, scenario.pacingPlan, strategy);
    if (!plan) {
      const message = 'Les segments verrouillés et les arrêts dépassent le chrono cible.';
      this.editPanelOpen() ? this.editError.set(message) : this.warning.set(message);
      return;
    }
    this.warning.set(null);
    this.editError.set(null);
    this.updateSelected((current) => ({ ...current, pacingPlan: plan, targetTimeMinutes: target }));
    if (this.editPanelOpen()) {
      this.editFormDuration.set(this.durationLabel(target));
      const distance = track.distance;
      this.editFormPace.set(distance > 0 ? this.formatPace(target / distance) : '');
    }
  }

  protected setDuration(id: string, value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    const scenario = this.selected();
    if (!scenario) return;
    const plan = {
      ...scenario.pacingPlan,
      segmentDurations: { ...scenario.pacingPlan.segmentDurations, [id]: value },
      strategy: 'CUSTOM' as const,
    };
    const targetTimeMinutes = this.stopMinutes() + this.segments().reduce((sum, segment) => sum + (segment.id === id ? value : segment.durationMinutes), 0);
    this.updateSelected((current) => ({ ...current, pacingPlan: plan, targetTimeMinutes }));
  }

  protected setTerrain(id: string, terrain: PacingSegment['terrain']): void {
    const scenario = this.selected();
    if (!scenario) return;
    const plan = { ...scenario.pacingPlan, terrains: { ...(scenario.pacingPlan.terrains ?? {}), [id]: terrain } };
    this.updateSelected((current) => ({ ...current, pacingPlan: plan }));
  }

  protected toggleLock(id: string): void {
    const scenario = this.selected();
    if (!scenario) return;
    const locks = new Set(scenario.pacingPlan.lockedSegmentIds ?? []);
    locks.has(id) ? locks.delete(id) : locks.add(id);
    const plan = { ...scenario.pacingPlan, lockedSegmentIds: [...locks] };
    this.updateSelected((current) => ({ ...current, pacingPlan: plan }));
  }

  protected terrainLabel(terrain: PacingSegment['terrain']): string { return PACING_TERRAIN_LABELS[terrain]; }
  protected paceLabel(segment: PacingSegment): string { if (!segment.distance || !segment.durationMinutes) return '—'; const minutes = Math.floor(segment.durationMinutes / segment.distance); const seconds = Math.round(((segment.durationMinutes / segment.distance) % 1) * 60); return `${minutes}:${seconds.toString().padStart(2, '0')}/km`; }
  protected speedLabel(segment: PacingSegment): string { return segment.durationMinutes ? `${(segment.distance / segment.durationMinutes * 60).toFixed(1)} km/h` : '—'; }
  protected arrivalLabel(segment: PacingSegment): string { return this.formatTime(segment.arrivalMinutes); }
  protected formatTime(minutes: number): string { return formatPassageTime(this.event().startTime, minutes); }
  protected durationLabel(minutes: number): string { return `${Math.floor(minutes / 60)}h${Math.round(minutes % 60).toString().padStart(2, '0')}`; }
  protected round(value: number): number { return Math.round(value); }

  /** Normalise la course en scénarios (convertit le plan legacy au besoin). */
  private normalize(event: RaceStrategy): ScenarioState {
    const scenarios = event.pacingScenarios;
    if (scenarios && scenarios.length > 0) {
      const referenceId = event.referenceScenarioId ?? scenarios[0]!.id;
      return { scenarios, referenceId };
    }
    const legacy: PacingScenario = {
      id: 'default',
      name: 'Réaliste',
      pacingPlan: this.clonePlan(event.pacingPlan),
      targetTimeMinutes: event.targetTimeMinutes ?? 0,
    };
    return { scenarios: [legacy], referenceId: legacy.id };
  }

  /** Applique une mutation au scénario sélectionné puis persiste. */
  private updateSelected(mutator: (scenario: PacingScenario) => PacingScenario): void {
    const state = this.state();
    const scenario = this.selected();
    if (!scenario) return;
    const scenarios = state.scenarios.map((item) => (item.id === scenario.id ? mutator(item) : item));
    this.commit({ ...state, scenarios });
  }

  private commit(next: ScenarioState, selectId?: string): void {
    this.override.set(next);
    if (selectId !== undefined) this.selectedId.set(selectId);
    const reference = next.scenarios.find((scenario) => scenario.id === next.referenceId) ?? next.scenarios[0] ?? null;
    this.save.emit({
      pacingScenarios: next.scenarios,
      referenceScenarioId: reference?.id,
      pacingPlan: reference?.pacingPlan,
      targetTimeMinutes: reference?.targetTimeMinutes ?? 0,
    });
  }

  private clonePlan(plan: PacingPlan | undefined): PacingPlan {
    return {
      segmentDurations: { ...(plan?.segmentDurations ?? {}) },
      lockedSegmentIds: [...(plan?.lockedSegmentIds ?? [])],
      terrains: { ...(plan?.terrains ?? {}) },
      strategy: plan?.strategy,
      fatiguePercent: plan?.fatiguePercent,
      negativeSplitPercent: plan?.negativeSplitPercent,
    };
  }

  /** Convertit « 10h30 », « 10:30 », « 10h » ou « 630 » en minutes (null si invalide). */
  private parseDuration(value: string): number | null {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim().toLowerCase().replace(/min(utes?)?/g, '').trim();
    const match = /^\s*(\d+)\s*[h:]\s*(\d{0,2})\s*$/.exec(trimmed);
    if (match) {
      const hours = Number(match[1]);
      const minutes = match[2] ? Number(match[2]) : 0;
      if (minutes >= 60) return null;
      return hours * 60 + minutes;
    }
    const justHours = /^\s*(\d+)\s*h\s*$/.exec(trimmed);
    if (justHours) {
      return Number(justHours[1]) * 60;
    }
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return Math.round(asNumber);
    }
    return null;
  }

  /** Formate une allure en minutes décimales/km au format « mm:ss ». */
  private formatPace(paceMinKm: number): string {
    if (!Number.isFinite(paceMinKm) || paceMinKm <= 0) return '';
    const totalSeconds = Math.round(paceMinKm * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /** Parse une allure saisie (ex. « 5:30 », « 05:30 », « 5.5 ») en minutes décimales/km. */
  private parsePace(value: string): number | null {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim().replace(/['"\/km]/gi, '').trim();
    const colonMatch = /^\s*(\d+)\s*[:hm']\s*(\d{1,2})\s*$/.exec(trimmed);
    if (colonMatch) {
      const min = Number(colonMatch[1]);
      const sec = Number(colonMatch[2]);
      if (sec >= 60) return null;
      return min + sec / 60;
    }
    const decMatch = /^\s*(\d+)(?:[.,](\d+))?\s*$/.exec(trimmed);
    if (decMatch) {
      const num = Number(decMatch[2] ? `${decMatch[1]}.${decMatch[2]}` : decMatch[1]);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    return null;
  }
}
