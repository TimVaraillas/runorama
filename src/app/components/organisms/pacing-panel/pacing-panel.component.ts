import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { GaugeComponent } from '../../atoms/gauge/gauge.component';
import { TimePickerComponent } from '../../atoms/time-picker/time-picker.component';
import type { AidStation, GpxTrack, PacingMethod, PacingPlan, PacingScenario, RaceStrategy } from '../../../core/models';
import {
  computePacing,
  DEFAULT_CLIMB_COEFFICIENT,
  DEFAULT_PACING_METHOD,
  PACING_DIFFICULTY_LABELS,
  PACING_METHOD_LABELS,
  type PacingResult,
} from '../../../core/utils/pacing.util';
import { formatPassageTime } from '../../../core/utils/passage-time.util';
import { newLocalId } from '../../../core/utils/aid-station.util';
import {
  faArrowsRotate,
  faCalculator,
  faClone,
  faFloppyDisk,
  faGaugeHigh,
  faLock,
  faLockOpen,
  faMountain,
  faPause,
  faPen,
  faPersonRunning,
  faPlus,
  faRotateLeft,
  faStar,
  faStopwatch,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

/** Charge utile émise à chaque modification des scénarios de pacing. */
export type PacingSavePayload = Pick<
  RaceStrategy,
  'pacingScenarios' | 'referenceScenarioId' | 'pacingPlan' | 'targetTimeMinutes' | 'segmentDifficulties' | 'aidStations'
>;

/** État interne : liste des scénarios + identifiant du scénario de référence. */
interface ScenarioState {
  scenarios: PacingScenario[];
  referenceId: string | null;
}

@Component({
  selector: 'ui-pacing-panel',
  standalone: true,
  imports: [ButtonComponent, IconComponent, GaugeComponent, TimePickerComponent],
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
            <span class="tabular-nums text-xs text-slate-400">{{ durationLabel(scenarioTotal(scenario)) }}</span>
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

             <ui-button
              size="sm"
              color="secondary"
              variant="full"
              [icon]="faCalculator"
              title="Recalculer les tronçons non verrouillés"
              (clicked)="recalcPacing()"
            >
              Recalculer
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
                <span class="tabular-nums text-slate-500 font-medium">{{ averagePaceLabel(route) }}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 text-slate-600">
                <ui-icon [icon]="faMountain" size="sm" class="text-brand-500" />
                <span class="text-slate-400">Km-effort</span>
                <span class="tabular-nums text-slate-500 font-medium">{{ round(kmEffort()) }} km</span>
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
              <table class="min-w-250 w-full table-fixed text-left text-sm">
                <colgroup>
                  <col style="width: 18%" /><col style="width: 10%" /><col style="width: 9%" /><col style="width: 9%" /><col style="width: 11%" /><col style="width: 11%" /><col style="width: 11%" /><col style="width: 11%" /><col style="width: 10%" />
                </colgroup>
                <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                  <th class="px-3 py-3 font-medium">Segment</th><th class="px-3 py-3 font-medium">Distance</th><th class="px-3 py-3 font-medium">D+</th><th class="px-3 py-3 font-medium">D-</th><th class="px-3 py-3 font-medium">Difficulté</th><th class="px-3 py-3 font-medium">Temps</th><th class="px-3 py-3 font-medium">Allure</th><th class="px-3 py-3 font-medium">Arrivée</th><th class="px-3 py-3"></th>
                </tr></thead>
                <tbody class="divide-y divide-slate-100">
                  @for (segment of segments(); track segment.id) {
                    <tr class="align-middle">
                      <td class="px-3 py-3"><span class="font-semibold text-slate-800">{{ segment.fromLabel }}</span><span class="mx-1 text-slate-300">→</span><span class="font-semibold text-slate-800">{{ segment.toLabel }}</span></td>
                      <td class="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">{{ segment.distance.toFixed(1) }} km</td>
                      <td class="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">+{{ round(segment.elevationGain) }} m</td>
                      <td class="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">-{{ round(segment.elevationLoss) }} m</td>
                      <td class="px-3 py-3"><span class="inline-flex items-center gap-1" [title]="difficultyLabel(segment.difficulty) + ' · ' + segment.difficulty + '/5'">@for (dot of difficultyLevels; track dot) { <span class="h-2 w-2 rounded-full" [class]="dot <= segment.difficulty ? 'bg-brand-500' : 'bg-slate-200'"></span> }</span></td>
                      <td class="whitespace-nowrap px-3 py-3"><span class="tabular-nums text-slate-700">{{ formatMinutes(segment.durationMinutes) }}</span>@if (segment.locked) { <ui-icon [icon]="faLock" size="xs" class="ml-1.5 text-brand-500" /> }</td>
                      <td class="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">{{ paceLabel(segment) }}</td>
                      <td class="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-slate-800">{{ arrivalLabel(segment) }}</td>
                      <td class="px-3 py-3"><div class="flex items-center justify-end gap-1"><ui-button size="sm" [color]="segment.locked ? 'secondary' : 'default'" variant="ghost" [class.opacity-40]="!segment.locked" [icon]="segment.locked ? faLock : faLockOpen" [tooltipContent]="segment.locked ? 'Déverrouiller' : 'Verrouiller'" tooltipPosition="left" (clicked)="toggleSegmentLock(segment.id)" /><ui-button size="sm" [color]="editingSegmentId() === segment.id ? 'primary' : 'default'" variant="ghost" [icon]="faPen" tooltipContent="Éditer le tronçon" tooltipPosition="left" (clicked)="toggleSegmentEditor(segment.id)" /></div></td>
                    </tr>
                    @if (editingSegmentId() === segment.id) {
                      <tr class="bg-slate-50">
                        <td colspan="9" class="px-4 py-4">
                          <div class="flex flex-wrap items-start gap-x-8 gap-y-4">
                            <div>
                              <span class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Difficulté</span>
                              <div class="flex items-center gap-2">
                                <div class="inline-flex gap-1">
                                  @for (level of difficultyLevels; track level) {
                                    <button type="button" [class]="difficultyButtonClass(segment, level)" [title]="difficultyLabel(level)" (click)="setDifficulty(segment.id, level)">{{ level }}</button>
                                  }
                                </div>
                                <span class="block w-28 truncate text-xs text-slate-400">{{ difficultyLabel(segment.difficulty) }}</span>
                              </div>
                            </div>

                            <div>
                              <span class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Ajuster le tronçon</span>
                              <div class="flex items-center gap-2">
                                <div class="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
                                  <button type="button" [class]="segmentMetricButtonClass('duration')" (click)="setSegmentMetric('duration')">Durée</button>
                                  <button type="button" [class]="segmentMetricButtonClass('speed')" (click)="setSegmentMetric('speed')">Vitesse</button>
                                </div>
                                @if (segmentMetric() === 'duration') {
                                  <div class="relative">
                                    <input type="number" min="1" class="w-24 rounded-md border border-slate-300 px-2 py-1 pr-10 text-right text-sm tabular-nums" [value]="round(segment.durationMinutes)" (change)="setSegmentDuration(segment.id, $any($event.target).valueAsNumber)" />
                                    <span class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400">min</span>
                                  </div>
                                } @else {
                                  <div class="relative">
                                    <input type="number" min="0.1" step="0.1" class="w-24 rounded-md border border-slate-300 px-2 py-1 pr-12 text-right text-sm tabular-nums" [value]="segment.speedKmh.toFixed(1)" (change)="setSegmentSpeed(segment.id, $any($event.target).valueAsNumber)" />
                                    <span class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400">km/h</span>
                                  </div>
                                }
                              </div>
                            </div>

                            <div class="ml-auto flex items-center justify-end gap-2 self-center">
                              <ui-button size="sm" [color]="segment.locked ? 'secondary' : 'default'" variant="ghost" [icon]="segment.locked ? faLock : faLockOpen" [tooltipContent]="segment.locked ? 'Déverrouiller' : 'Verrouiller'" tooltipPosition="left" (clicked)="toggleSegmentLock(segment.id)" />
                              <ui-button size="sm" color="default" variant="ghost" [icon]="faRotateLeft" tooltipContent="Réinitialiser" tooltipPosition="left" (clicked)="resetSegment(segment.id)" />
                              <ui-button size="sm" color="primary" variant="full" [icon]="faFloppyDisk" (clicked)="closeSegmentEditor()">Enregistrer</ui-button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                    @if (segmentStopStationId(segment); as stationId) {
                      <tr class="bg-secondary-50/80 text-xs text-secondary-800">
                        <td class="px-3 py-2 font-medium" colspan="5">Arrêt à {{ segment.toLabel }}</td>
                        <td class="px-3 py-2 tabular-nums" colspan="3">{{ segment.stopMinutes }} min · départ {{ formatTime(segment.arrivalMinutes + segment.stopMinutes) }}</td>
                        <td class="px-3 py-2"><div class="flex items-center justify-end gap-1"><ui-button size="sm" [color]="'default'" variant="ghost" [icon]="faPen" tooltipContent="Modifier l'arrêt" tooltipPosition="left" (clicked)="toggleStopEditor(stationId)" /></div></td>
                      </tr>
                      @if (editingStopId() === stationId) {
                        <tr class="bg-secondary-50/30">
                          <td colspan="9" class="px-4 py-4">
                            <div class="flex flex-wrap items-start gap-x-8 gap-y-4">
                              <div>
                                <span class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-secondary-700">Temps d'arrêt · {{ segment.toLabel }}</span>
                                <div class="relative">
                                  <input type="number" min="0" class="w-24 rounded-md border border-slate-300 px-2 py-1 pr-10 text-right text-sm tabular-nums" [value]="segment.stopMinutes" (change)="setStopDuration(stationId, $any($event.target).valueAsNumber)" />
                                  <span class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400">min</span>
                                </div>
                              </div>
                              <div class="ml-auto flex items-center justify-end gap-2 self-center">
                                <ui-button size="sm" color="primary" variant="full" [icon]="faFloppyDisk" (clicked)="closeStopEditor()">Enregistrer</ui-button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      }
                    }
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
                <label class="mb-1 block text-sm font-medium text-slate-700">Type de scénario</label>
                <select
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  [value]="derivedBaseId() ?? ''"
                  (change)="setDerivation($any($event.target).value)"
                >
                  <option value="">Indépendant</option>
                  @for (other of otherScenarios(); track other.id) {
                    <option [value]="other.id">Dérivé de « {{ other.name }} »</option>
                  }
                </select>
              </div>

              @if (derivedBaseId()) {
                <div>
                  <ui-gauge
                    label="Écart d'allure"
                    [value]="pacePercent()"
                    [min]="-30"
                    [max]="30"
                    unit="%"
                    [color]="pacePercent() > 0 ? 'brand' : pacePercent() < 0 ? 'secondary' : 'neutral'"
                    (valueChange)="setPacePercent($event)"
                  />
                  <p class="mt-1 text-xs text-slate-400">
                    Chrono cible résultant : {{ durationLabel(targetTime()) }}
                  </p>
                </div>
              } @else {
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700">Cible</label>
                  <div class="mb-2 inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button type="button" [class]="targetModeButtonClass('duration')" (click)="setTargetMode('duration')">Chrono</button>
                    <button type="button" [class]="targetModeButtonClass('pace')" (click)="setTargetMode('pace')">Allure</button>
                  </div>

                  @if (targetMode() === 'duration') {
                    <ui-time-picker
                      [hours]="chronoHours()"
                      (hoursChange)="setChronoHours($event)"
                      [minutes]="chronoMinutes()"
                      (minutesChange)="setChronoMinutes($event)"
                      [maxHours]="99"
                    />
                    <p class="mt-1 text-xs text-slate-400">
                      @if (editFormPace()) { ≈ {{ editFormPace() }} /km }
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
                      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">/km</span>
                    </div>
                    <p class="mt-1 text-xs text-slate-400">
                      Format : mm:ss par kilomètre (ex. 5:30)
                      @if (editFormDuration()) { · soit ≈ {{ editFormDuration() }} }
                    </p>
                  }
                </div>

                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700">Méthode de dénivelé</label>
                  <select
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    [value]="method()"
                    (change)="setMethod($any($event.target).value)"
                  >
                    @for (m of methodOptions; track m) {
                      <option [value]="m">{{ methodLabel(m) }}</option>
                    }
                  </select>
                </div>

                @if (method() !== 'MINETTI') {
                  <div>
                    <label class="mb-1 block text-sm font-medium text-slate-700">Coefficient de montée</label>
                    <div class="relative">
                      <input
                        type="number"
                        min="1"
                        class="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm tabular-nums text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        [value]="climbCoefficient()"
                        (input)="setClimbCoefficient($any($event.target).valueAsNumber)"
                      />
                      <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">m D+ / km</span>
                    </div>
                    <p class="mt-1 text-xs text-slate-400">Mètres de D+ équivalents à 1 km plat (défaut 100).</p>
                  </div>
                }

                <div>
                  <ui-gauge
                    label="Facteur de fatigue"
                    [value]="fatiguePercent()"
                    [min]="0"
                    [max]="30"
                    unit="%"
                    [color]="fatiguePercent() > 15 ? 'danger' : fatiguePercent() > 5 ? 'warning' : 'brand'"
                    (valueChange)="setFatiguePercent($event)"
                  />
                  <p class="mt-1 text-xs text-slate-400">
                    Ralentissement progressif en fin de course (selon le km-effort parcouru).
                  </p>
                </div>
              }

              @if (editError()) {
                <p class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {{ editError() }}
                </p>
              }

              <div class="pt-1">
                <ui-button
                  size="md"
                  color="primary"
                  variant="full"
                  [icon]="faCalculator"
                  (clicked)="recalcPacing()"
                >
                  Calculer
                </ui-button>
              </div>
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

  protected readonly faStopwatch = faStopwatch;
  protected readonly faPersonRunning = faPersonRunning;
  protected readonly faPause = faPause;
  protected readonly faGaugeHigh = faGaugeHigh;
  protected readonly faMountain = faMountain;
  protected readonly faLock = faLock;
  protected readonly faStar = faStar;
  protected readonly faPlus = faPlus;
  protected readonly faPen = faPen;
  protected readonly faClone = faClone;
  protected readonly faTrash = faTrash;
  protected readonly faXmark = faXmark;
  protected readonly faFloppyDisk = faFloppyDisk;
  protected readonly faRotateLeft = faRotateLeft;
  protected readonly faLockOpen = faLockOpen;
  protected readonly faArrowsRotate = faArrowsRotate;
  protected readonly faCalculator = faCalculator;

  protected readonly difficultyLevels = [1, 2, 3, 4, 5];
  protected readonly methodOptions: PacingMethod[] = ['MINETTI', 'KM_EFFORT', 'NAISMITH'];

  protected readonly warning = signal<string | null>(null);

  /** Menu d'édition ouvert pour un tronçon donné (id) + métrique ajustée. */
  protected readonly editingSegmentId = signal<string | null>(null);
  protected readonly segmentMetric = signal<'duration' | 'speed'>('duration');

  /** Menu d'édition ouvert pour l'arrêt d'un ravitaillement (id de la station). */
  protected readonly editingStopId = signal<string | null>(null);

  /** État du panneau latéral d'édition du scénario. */
  protected readonly editPanelOpen = signal(false);
  protected readonly editFormName = signal('');
  protected readonly editFormDuration = signal('');
  protected readonly editFormPace = signal('');
  protected readonly editError = signal<string | null>(null);
  /** Grandeur pilotée par l'utilisateur dans la section « Cible » (l'autre est dérivée). */
  protected readonly targetMode = signal<'duration' | 'pace'>('duration');

  /** État issu de la course (scénarios existants). */
  private readonly initialState = computed<ScenarioState>(() => this.normalize(this.event()));
  /** Modifications locales appliquées par-dessus l'état initial. */
  private readonly override = signal<ScenarioState | null>(null);
  protected readonly state = computed<ScenarioState>(() => this.override() ?? this.initialState());

  /** Difficultés /5 des segments (partagées), avec surcharge locale. */
  private readonly difficultiesOverride = signal<Record<string, number> | null>(null);
  protected readonly difficulties = computed<Record<string, number>>(
    () => this.difficultiesOverride() ?? this.event().segmentDifficulties ?? {},
  );

  /** Ravitaillements de la course, avec surcharge locale (temps d'arrêt édités). */
  private readonly aidStationsOverride = signal<AidStation[] | null>(null);
  protected readonly aidStations = computed<AidStation[]>(
    () => this.aidStationsOverride() ?? this.event().aidStations ?? [],
  );

  /** Identifiant du scénario sélectionné (édition). */
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed<PacingScenario | null>(() => {
    const state = this.state();
    const id = this.selectedId() ?? state.referenceId ?? state.scenarios[0]?.id ?? null;
    return state.scenarios.find((scenario) => scenario.id === id) ?? state.scenarios[0] ?? null;
  });
  protected readonly isReference = computed(() => this.selected()?.id === this.state().referenceId);

  /** Résultat de pacing du scénario sélectionné (résout la dérivation). */
  protected readonly result = computed<PacingResult>(() => {
    const scenario = this.selected();
    return scenario ? this.computeFor(scenario) : this.emptyResult();
  });
  protected readonly segments = computed(() => this.result().segments);
  protected readonly targetTime = computed(() => Math.round(this.result().totalMinutes));
  protected readonly stopMinutes = computed(() => this.result().stopMinutes);
  protected readonly runningMinutes = computed(() => this.result().runningMinutes);
  protected readonly kmEffort = computed(() => this.result().kmEffort);

  protected averagePaceLabel(track: GpxTrack): string {
    const running = this.runningMinutes();
    if (track.distance <= 0 || running <= 0) return '—';
    const totalSeconds = Math.round((running / track.distance) * 60);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')} /km`;
  }

  /** Chrono total d'un scénario donné (pour les pastilles). */
  protected scenarioTotal(scenario: PacingScenario): number {
    return Math.round(this.computeFor(scenario).totalMinutes);
  }

  // Accès aux réglages du scénario sélectionné (pour l'aside).
  protected method(): PacingMethod {
    return this.selected()?.pacingPlan?.method ?? DEFAULT_PACING_METHOD;
  }
  protected climbCoefficient(): number {
    return this.selected()?.pacingPlan?.climbCoefficient ?? DEFAULT_CLIMB_COEFFICIENT;
  }
  protected fatiguePercent(): number {
    return this.selected()?.pacingPlan?.fatiguePercent ?? 0;
  }
  protected derivedBaseId(): string | null {
    return this.selected()?.pacingPlan?.derivedFromScenarioId ?? null;
  }
  protected pacePercent(): number {
    return this.selected()?.pacingPlan?.pacePercent ?? 0;
  }
  protected otherScenarios(): PacingScenario[] {
    const id = this.selected()?.id;
    return this.state().scenarios.filter((scenario) => scenario.id !== id);
  }

  /** Calcule le pacing d'un scénario en résolvant une éventuelle dérivation. */
  private computeFor(scenario: PacingScenario, seen = new Set<string>()): PacingResult {
    const track = this.track();
    const stations = this.aidStations();
    const waypoints = this.event().waypoints ?? [];
    const difficulties = this.difficulties();
    const plan = scenario.pacingPlan;
    if (plan?.derivedFromScenarioId && !seen.has(scenario.id)) {
      seen.add(scenario.id);
      const base = this.state().scenarios.find((item) => item.id === plan.derivedFromScenarioId);
      if (base) {
        // Allure de base « pure » (hors durées figées) décalée du pourcentage.
        const override = this.flatBasePace(base) * (1 + (plan.pacePercent ?? 0) / 100);
        return computePacing(track, stations, waypoints, difficulties, this.withoutOverrides(base.pacingPlan), 0, override);
      }
    }
    return computePacing(track, stations, waypoints, difficulties, plan, scenario.targetTimeMinutes ?? 0);
  }

  /** Allure de référence sur plat d'un scénario, en ignorant les durées figées. */
  private flatBasePace(scenario: PacingScenario, seen = new Set<string>()): number {
    const plan = scenario.pacingPlan;
    if (plan?.derivedFromScenarioId && !seen.has(scenario.id)) {
      seen.add(scenario.id);
      const base = this.state().scenarios.find((item) => item.id === plan.derivedFromScenarioId);
      if (base) return this.flatBasePace(base, seen) * (1 + (plan.pacePercent ?? 0) / 100);
    }
    return computePacing(
      this.track(),
      this.aidStations(),
      this.event().waypoints ?? [],
      this.difficulties(),
      this.withoutOverrides(plan),
      scenario.targetTimeMinutes ?? 0,
    ).basePaceMinKm;
  }

  /** Plan sans durées figées ni verrous (calcul « pur » piloté par l'allure). */
  private withoutOverrides(plan: PacingPlan): PacingPlan {
    return { ...plan, segmentDurations: {}, lockedSegmentIds: [] };
  }

  private emptyResult(): PacingResult {
    return { segments: [], basePaceMinKm: 0, runningMinutes: 0, stopMinutes: 0, totalMinutes: 0, kmEffort: 0, feasible: true };
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
    this.closeSegmentEditor();
    this.closeStopEditor();
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
    if (distance > 0) this.editFormPace.set(this.formatPace(minutes / distance));
    this.editError.set(null);
    this.updateSelected((current) => ({ ...current, targetTimeMinutes: minutes }));
  }

  /** Heures/minutes du chrono cible, dérivées du champ texte (pilotage par le sélecteur). */
  protected chronoHours(): number {
    return Math.floor((this.parseDuration(this.editFormDuration()) ?? 0) / 60);
  }
  protected chronoMinutes(): number {
    return (this.parseDuration(this.editFormDuration()) ?? 0) % 60;
  }
  protected setChronoHours(hours: number): void {
    this.onEditDurationChange(this.durationLabel(hours * 60 + this.chronoMinutes()));
  }
  protected setChronoMinutes(minutes: number): void {
    this.onEditDurationChange(this.durationLabel(this.chronoHours() * 60 + minutes));
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
    this.editError.set(null);
    this.updateSelected((current) => ({ ...current, targetTimeMinutes: minutes }));
  }

  protected setMethod(value: PacingMethod): void {
    this.updateSelectedPlan((plan) => ({ ...plan, method: value }));
  }

  protected setClimbCoefficient(value: number): void {
    if (!Number.isFinite(value) || value < 1) return;
    this.updateSelectedPlan((plan) => ({ ...plan, climbCoefficient: value }));
  }

  protected setFatiguePercent(value: number): void {
    const clamped = Number.isFinite(value) ? Math.max(0, Math.min(30, value)) : 0;
    this.updateSelectedPlan((plan) => ({ ...plan, fatiguePercent: clamped }));
  }

  protected setDerivation(baseId: string): void {
    this.updateSelectedPlan((plan) =>
      baseId
        ? { ...plan, derivedFromScenarioId: baseId, pacePercent: plan.pacePercent ?? 0 }
        : { ...plan, derivedFromScenarioId: undefined, pacePercent: undefined },
    );
  }

  protected setPacePercent(value: number): void {
    this.updateSelectedPlan((plan) => ({ ...plan, pacePercent: Number.isFinite(value) ? value : 0 }));
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

  protected setDifficulty(id: string, value: number | string): void {
    const level = Math.max(1, Math.min(5, Math.round(Number(value))));
    if (!Number.isFinite(level)) return;
    // Applique la nouvelle difficulté puis recalcule les tronçons non verrouillés.
    this.difficultiesOverride.set({ ...this.difficulties(), [id]: level });
    this.recalcPacing();
  }

  protected toggleSegmentEditor(id: string): void {
    this.segmentMetric.set('duration');
    this.editingSegmentId.update((current) => (current === id ? null : id));
  }

  protected closeSegmentEditor(): void {
    this.editingSegmentId.set(null);
  }

  /** Identifiant du ravitaillement à la fin d'un tronçon (null si ce n'est pas un ravito). */
  protected segmentStopStationId(segment: { id: string }): string | null {
    const endId = segment.id.split(':').at(-1) ?? '';
    return this.aidStations().some((station) => station.id === endId) ? endId : null;
  }

  protected toggleStopEditor(stationId: string): void {
    this.editingStopId.update((current) => (current === stationId ? null : stationId));
  }

  protected closeStopEditor(): void {
    this.editingStopId.set(null);
  }

  /** Modifie le temps d'arrêt d'un ravito ; les durées de course restent figées. */
  protected setStopDuration(stationId: string, minutes: number): void {
    if (!Number.isFinite(minutes) || minutes < 0) return;
    const value = Math.round(minutes);
    // Fige les durées de course pour que le nouvel arrêt n'impacte que le total.
    const state = this.state();
    const scenario = this.selected();
    if (scenario) {
      const overrides = this.snapshotDurations(scenario.pacingPlan);
      const scenarios = state.scenarios.map((item) =>
        item.id === scenario.id ? { ...item, pacingPlan: { ...item.pacingPlan, segmentDurations: overrides } } : item,
      );
      this.override.set({ ...state, scenarios });
    }
    this.aidStationsOverride.set(
      this.aidStations().map((station) =>
        station.id === stationId ? { ...station, stopDurationMinutes: value } : station,
      ),
    );
    this.emit();
  }

  protected setSegmentMetric(metric: 'duration' | 'speed'): void {
    this.segmentMetric.set(metric);
  }

  protected difficultyButtonClass(segment: { difficulty: number }, level: number): string {
    const active = segment.difficulty === level;
    return `grid h-8 w-8 place-items-center rounded-md border text-sm font-medium transition-colors ${
      active
        ? 'border-brand-300 bg-brand-50 text-brand-700'
        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
    }`;
  }

  protected segmentMetricButtonClass(metric: 'duration' | 'speed'): string {
    const active = this.segmentMetric() === metric;
    return `rounded px-2 py-1 text-center font-medium transition-colors ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;
  }

  /**
   * Modifie la durée d'un tronçon sans le verrouiller : reporte l'écart sur le
   * chrono cible, l'allure de référence restant inchangée (les autres tronçons
   * ne bougent pas). Le verrouillage reste une action explicite de l'utilisateur.
   */
  protected setSegmentDuration(id: string, minutes: number): void {
    if (!Number.isFinite(minutes) || minutes < 0) return;
    const segment = this.segments().find((item) => item.id === id);
    if (!segment) return;
    const value = Math.round(minutes);
    const newTarget = Math.max(1, Math.round(this.targetTime() + (value - Math.round(segment.durationMinutes))));
    this.updateSelected((scenario) => {
      const overrides = this.snapshotDurations(scenario.pacingPlan);
      overrides[id] = value;
      return {
        ...scenario,
        targetTimeMinutes: newTarget,
        pacingPlan: { ...scenario.pacingPlan, segmentDurations: overrides },
      };
    });
  }

  /** Ajuste un tronçon par sa vitesse (km/h), convertie en durée. */
  protected setSegmentSpeed(id: string, kmh: number): void {
    if (!Number.isFinite(kmh) || kmh <= 0) return;
    const segment = this.segments().find((item) => item.id === id);
    if (!segment || segment.distance <= 0) return;
    this.setSegmentDuration(id, (segment.distance / kmh) * 60);
  }

  /** Verrouille/déverrouille explicitement un tronçon (protégé lors du recalcul). */
  protected toggleSegmentLock(id: string): void {
    this.updateSelected((scenario) => {
      const overrides = this.snapshotDurations(scenario.pacingPlan);
      const locked = new Set(scenario.pacingPlan.lockedSegmentIds ?? []);
      if (locked.has(id)) locked.delete(id);
      else locked.add(id);
      return {
        ...scenario,
        pacingPlan: { ...scenario.pacingPlan, segmentDurations: overrides, lockedSegmentIds: [...locked] },
      };
    });
  }

  /** Recalcule le pacing des tronçons non verrouillés (chrono cible + difficultés courants). */
  protected recalcPacing(): void {
    this.updateSelected((scenario) => {
      const locked = new Set(scenario.pacingPlan.lockedSegmentIds ?? []);
      const kept: Record<string, number> = {};
      for (const lid of locked) {
        const value = scenario.pacingPlan.segmentDurations?.[lid];
        if (value != null) kept[lid] = value;
      }
      const recomputed = this.computeFor({ ...scenario, pacingPlan: { ...scenario.pacingPlan, segmentDurations: kept } });
      const overrides: Record<string, number> = {};
      for (const seg of recomputed.segments) overrides[seg.id] = Math.round(seg.durationMinutes);
      return { ...scenario, pacingPlan: { ...scenario.pacingPlan, segmentDurations: overrides, lockedSegmentIds: [...locked] } };
    });
  }

  /** Remet un tronçon en calcul automatique (difficulté par défaut, sans verrou). */
  protected resetSegment(id: string): void {
    const difficulties = { ...this.difficulties() };
    delete difficulties[id];
    this.difficultiesOverride.set(difficulties);
    this.updateSelected((scenario) => {
      const locked = new Set(scenario.pacingPlan.lockedSegmentIds ?? []);
      locked.delete(id);
      const kept: Record<string, number> = {};
      for (const lid of locked) {
        const value = scenario.pacingPlan.segmentDurations?.[lid];
        if (value != null) kept[lid] = value;
      }
      const recomputed = this.computeFor({ ...scenario, pacingPlan: { ...scenario.pacingPlan, segmentDurations: kept } });
      const overrides: Record<string, number> = {};
      for (const seg of recomputed.segments) overrides[seg.id] = Math.round(seg.durationMinutes);
      return { ...scenario, pacingPlan: { ...scenario.pacingPlan, segmentDurations: overrides, lockedSegmentIds: [...locked] } };
    });
  }

  /** Complète les durées forcées avec la valeur courante des tronçons non encore figés. */
  private snapshotDurations(plan: PacingPlan): Record<string, number> {
    const overrides = { ...(plan.segmentDurations ?? {}) };
    for (const segment of this.segments()) {
      if (overrides[segment.id] == null) overrides[segment.id] = Math.round(segment.durationMinutes);
    }
    return overrides;
  }

  /** Applique une mutation au plan du scénario sélectionné puis persiste. */
  private updateSelectedPlan(mutator: (plan: PacingPlan) => PacingPlan): void {
    this.updateSelected((scenario) => ({ ...scenario, pacingPlan: mutator(scenario.pacingPlan) }));
  }

  protected difficultyLabel(level: number): string { return PACING_DIFFICULTY_LABELS[level] ?? ''; }
  protected methodLabel(method: PacingMethod): string { return PACING_METHOD_LABELS[method]; }
  protected paceLabel(segment: { paceMinKm: number }): string {
    if (!segment.paceMinKm) return '—';
    const minutes = Math.floor(segment.paceMinKm);
    const seconds = Math.round((segment.paceMinKm % 1) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }
  protected arrivalLabel(segment: { arrivalMinutes: number }): string { return this.formatTime(segment.arrivalMinutes); }
  protected formatTime(minutes: number): string { return formatPassageTime(this.event().startTime, minutes); }
  protected formatMinutes(minutes: number): string {
    const total = Math.round(minutes);
    if (total < 60) return `${total} min`;
    return `${Math.floor(total / 60)}h${(total % 60).toString().padStart(2, '0')}`;
  }
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
    this.emit();
  }

  /** Émet la charge utile (scénarios + difficultés + miroir du scénario de référence). */
  private emit(): void {
    const state = this.state();
    const reference = state.scenarios.find((scenario) => scenario.id === state.referenceId) ?? state.scenarios[0] ?? null;
    const total = reference ? this.computeFor(reference).totalMinutes : 0;
    this.save.emit({
      pacingScenarios: state.scenarios,
      referenceScenarioId: reference?.id,
      pacingPlan: reference?.pacingPlan,
      targetTimeMinutes: Math.round(total),
      segmentDifficulties: this.difficulties(),
      aidStations: this.aidStations(),
    });
  }

  private clonePlan(plan: PacingPlan | undefined): PacingPlan {
    return {
      method: plan?.method ?? DEFAULT_PACING_METHOD,
      climbCoefficient: plan?.climbCoefficient,
      fatiguePercent: plan?.fatiguePercent,
      derivedFromScenarioId: plan?.derivedFromScenarioId,
      pacePercent: plan?.pacePercent,
      lockedSegmentIds: [...(plan?.lockedSegmentIds ?? [])],
      segmentDurations: { ...(plan?.segmentDurations ?? {}) },
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
