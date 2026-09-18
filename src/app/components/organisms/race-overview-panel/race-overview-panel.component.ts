import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { GpxTrack, NutrientGoalKey, RaceStrategy } from '../../../core/models';
import { NUTRIENT_GOALS } from '../../../core/models';
import { computePacing } from '../../../core/utils/pacing.util';
import { formatPassageTime } from '../../../core/utils/passage-time.util';
import {
  faArrowTrendDown,
  faArrowTrendUp,
  faCalendarDay,
  faCheck,
  faFlagCheckered,
  faGaugeHigh,
  faLocationDot,
  faMountain,
  faMountainSun,
  faPause,
  faPersonRunning,
  faRoute,
  faStopwatch,
  faUtensils,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/** Indicateur clé affiché sous forme de carte. */
interface OverviewMetric {
  icon: IconDefinition;
  label: string;
  value: string;
}

/** Étape de préparation de la course (checklist). */
interface ReadinessItem {
  label: string;
  done: boolean;
}

/** Objectif nutritionnel activé, prêt pour l'affichage. */
interface OverviewGoal {
  label: string;
  value: string;
}

/** Tuile de synthèse du pacing (scénario de référence). */
interface PacingTile {
  icon: IconDefinition;
  label: string;
  value: string;
}

/**
 * Organism : onglet « Vue d'ensemble » d'une course. Synthétise en lecture
 * seule le contexte (date, lieu, chrono), les indicateurs clés du parcours et
 * l'état d'avancement de la préparation (GPX, ravitaillements, pacing, plan de
 * nutrition).
 */
@Component({
  selector: 'ui-race-overview-panel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (event(); as ev) {
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div class="flex flex-wrap items-center gap-6 text-sm">
          <span class="inline-flex items-center gap-1.5 text-slate-600">
            <ui-icon [icon]="faCalendarDay" size="sm" class="text-brand-500" />
            <span class="tabular-nums text-slate-500 font-medium">{{ formatDate(ev.date) }}</span>
          </span>
          <span class="inline-flex items-center gap-1.5 text-slate-600">
            <ui-icon [icon]="faStopwatch" size="sm" class="text-brand-500" />
            <span class="tabular-nums text-slate-500 font-medium">Départ {{ ev.startTime }}</span>
          </span>
          @if (ev.location) {
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faLocationDot" size="sm" class="text-brand-500" />
              <span class="text-slate-500 font-medium">{{ ev.location }}</span>
            </span>
          }
        </div>
      </div>

      <div class="space-y-3 px-3 pt-3">
        <!-- Indicateurs clés du parcours -->
        <section class="rounded-md border border-slate-200 bg-white p-5">
          <h3 class="text-sm font-semibold text-slate-700">Parcours</h3>
          <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            @for (metric of metrics(); track metric.label) {
              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <div class="flex items-center gap-1.5 text-slate-400">
                  <ui-icon [icon]="metric.icon" size="xs" class="text-brand-500" />
                  <span class="text-xs font-medium uppercase tracking-wide">{{ metric.label }}</span>
                </div>
                <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">{{ metric.value }}</p>
              </div>
            }
          </div>
        </section>

        <!-- Synthèse du pacing (scénario de référence) -->
        @if (pacingTiles(); as tiles) {
          <section class="rounded-md border border-slate-200 bg-white p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-semibold text-slate-700">Stratégie de pacing</h3>
              @if (pacingScenarioLabel(); as label) {
                <span class="text-xs text-slate-400">{{ label }}</span>
              }
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              @for (tile of tiles; track tile.label) {
                <div class="rounded-xl bg-slate-50 px-3 py-2">
                  <div class="flex items-center gap-1.5 text-slate-400">
                    <ui-icon [icon]="tile.icon" size="xs" class="text-brand-500" />
                    <span class="text-xs font-medium uppercase tracking-wide">{{ tile.label }}</span>
                  </div>
                  <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">{{ tile.value }}</p>
                </div>
              }
            </div>
          </section>
        }

        <div class="grid gap-3 lg:grid-cols-2">
          <!-- Préparation -->
          <section class="rounded-md border border-slate-200 bg-white p-5">
            <h3 class="text-sm font-semibold text-slate-700">Préparation</h3>
            <p class="mt-0.5 text-xs text-slate-400">
              {{ readinessDone() }} / {{ readiness().length }} étapes complétées
            </p>
            <ul class="mt-4 space-y-2.5">
              @for (item of readiness(); track item.label) {
                <li class="flex items-center gap-3 text-sm">
                  <span
                    [class]="
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full ' +
                      (item.done
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400')
                    "
                  >
                    <ui-icon [icon]="item.done ? faCheck : faXmark" size="xs" />
                  </span>
                  <span [class]="item.done ? 'text-slate-700' : 'text-slate-400'">
                    {{ item.label }}
                  </span>
                </li>
              }
            </ul>
          </section>

          <!-- Objectifs nutritionnels -->
          <section class="rounded-md border border-slate-200 bg-white p-5">
            <h3 class="text-sm font-semibold text-slate-700">Objectifs nutritionnels</h3>
            @if (goals().length) {
              <dl class="mt-4 grid grid-cols-2 gap-3">
                @for (goal of goals(); track goal.label) {
                  <div class="rounded-xl bg-slate-50 px-3 py-2">
                    <dt class="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {{ goal.label }}
                    </dt>
                    <dd class="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                      {{ goal.value }}
                    </dd>
                  </div>
                }
              </dl>
            } @else {
              <p class="mt-4 text-sm text-slate-400">
                Aucun objectif horaire défini pour le moment.
              </p>
            }
          </section>
        </div>
      </div>
    }
  `,
})
export class RaceOverviewPanelComponent {
  /** Course affichée. */
  readonly event = input.required<RaceStrategy>();
  /** Trace GPX importée (source prioritaire pour les métriques du parcours). */
  readonly track = input<GpxTrack | null>(null);

  protected readonly faCalendarDay = faCalendarDay;
  protected readonly faStopwatch = faStopwatch;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;

  /** Distance retenue (km) : GPX prioritaire, puis saisie manuelle. */
  private readonly distanceKm = computed(
    () => this.track()?.distance ?? this.event().gpxDistance ?? this.event().distance ?? 0,
  );
  private readonly elevationGain = computed(
    () => this.track()?.elevationGain ?? this.event().gpxElevationGain ?? this.event().elevationGain ?? 0,
  );
  private readonly elevationLoss = computed(
    () => this.track()?.elevationLoss ?? this.event().gpxElevationLoss ?? this.event().elevationLoss ?? 0,
  );

  protected readonly metrics = computed<OverviewMetric[]>(() => {
    const distance = this.distanceKm();
    return [
      { icon: faRoute, label: 'Distance', value: distance ? `${this.round1(distance)} km` : '—' },
      { icon: faArrowTrendUp, label: 'Dénivelé +', value: this.elevationGain() ? `+${Math.round(this.elevationGain())} m` : '—' },
      { icon: faArrowTrendDown, label: 'Dénivelé -', value: this.elevationLoss() ? `-${Math.round(this.elevationLoss())} m` : '—' },
      { icon: faMountainSun, label: 'Altitude', value: this.altitudeRange() },
      { icon: faMountain, label: 'Km-effort', value: this.pacing().segments.length ? `${Math.round(this.pacing().kmEffort)} km` : '—' },
    ];
  });

  protected readonly readiness = computed<ReadinessItem[]>(() => {
    const ev = this.event();
    return [
      { label: 'Trace GPX importée', done: !!(this.track() || ev.gpxTrackId) },
      { label: 'Ravitaillements positionnés', done: (ev.aidStations?.length ?? 0) > 0 },
      { label: 'Plan de pacing défini', done: (ev.pacingScenarios?.length ?? 0) > 0 || !!ev.pacingPlan },
      { label: 'Objectifs nutritionnels définis', done: this.goals().length > 0 },
      { label: 'Inventaire renseigné', done: (ev.items?.length ?? 0) > 0 },
      { label: 'Plan de nutrition défini', done: (ev.intakes?.length ?? 0) > 0 },
    ];
  });

  protected readonly readinessDone = computed(
    () => this.readiness().filter((item) => item.done).length,
  );

  protected readonly goals = computed<OverviewGoal[]>(() => {
    const goals = this.event().goals;
    if (!goals) return [];
    return NUTRIENT_GOALS.filter((meta) => goals[meta.key as NutrientGoalKey]?.enabled).map(
      (meta) => {
        const goal = goals[meta.key as NutrientGoalKey];
        const suffix = meta.mode === 'hourly' ? `${meta.unit}/h` : meta.unit;
        return { label: meta.label, value: `${goal.hourly} ${suffix}` };
      },
    );
  });

  protected readonly faRoute = faRoute;
  protected readonly faArrowTrendUp = faArrowTrendUp;
  protected readonly faArrowTrendDown = faArrowTrendDown;
  protected readonly faGaugeHigh = faGaugeHigh;
  protected readonly faUtensils = faUtensils;

  /** Résultat de pacing du scénario de référence (miroir top-level). */
  private readonly pacing = computed(() => {
    const ev = this.event();
    return computePacing(
      this.track(),
      ev.aidStations ?? [],
      ev.waypoints ?? [],
      ev.segmentDifficulties,
      ev.pacingPlan,
      ev.targetTimeMinutes ?? 0,
    );
  });

  /** Libellé du scénario de référence (nom + nombre de scénarios). */
  protected readonly pacingScenarioLabel = computed<string | null>(() => {
    const ev = this.event();
    const scenarios = ev.pacingScenarios ?? [];
    if (!scenarios.length) return null;
    const ref = scenarios.find((s) => s.id === ev.referenceScenarioId) ?? scenarios[0];
    const suffix = scenarios.length > 1 ? ` · ${scenarios.length} scénarios` : '';
    return `Réf. « ${ref?.name ?? '—'} »${suffix}`;
  });

  /** Tuiles de synthèse du pacing, ou null si le pacing n'est pas calculable. */
  protected readonly pacingTiles = computed<PacingTile[] | null>(() => {
    const res = this.pacing();
    if (!res.segments.length) return null;
    const ev = this.event();
    return [
      { icon: faStopwatch, label: 'Chrono cible', value: this.formatDuration(Math.round(res.totalMinutes)) },
      { icon: faGaugeHigh, label: 'Allure moyenne', value: this.globalPace(this.distanceKm(), res.runningMinutes) },
      { icon: faPersonRunning, label: 'En course', value: this.formatDuration(Math.round(res.runningMinutes)) },
      { icon: faPause, label: 'Arrêts', value: this.formatDuration(Math.round(res.stopMinutes)) },
      { icon: faFlagCheckered, label: 'Arrivée estimée', value: formatPassageTime(ev.startTime, res.totalMinutes) },
    ];
  });

  /** Plage d'altitude (min–max) issue de la trace GPX, si disponible. */
  private altitudeRange(): string {
    const track = this.track();
    if (!track) return '—';
    return `${Math.round(track.minAltitude)} – ${Math.round(track.maxAltitude)} m`;
  }

  private globalPace(distanceKm: number, targetTimeMinutes: number): string {
    if (distanceKm <= 0 || targetTimeMinutes <= 0) return '—';
    const totalSeconds = Math.round((targetTimeMinutes / distanceKm) * 60);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')} /km`;
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours ? `${hours}h${mins.toString().padStart(2, '0')}` : `${mins} min`;
  }

  private round1(value: number): number {
    return Math.round(value * 10) / 10;
  }

  protected formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return year && month && day ? `${day}/${month}/${year}` : date;
  }
}
