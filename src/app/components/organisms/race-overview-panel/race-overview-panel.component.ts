import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { GpxTrack, NutrientGoalKey, RaceStrategy } from '../../../core/models';
import { NUTRIENT_GOALS } from '../../../core/models';
import {
  faArrowTrendDown,
  faArrowTrendUp,
  faCalendarDay,
  faCheck,
  faGaugeHigh,
  faLocationDot,
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
        <!-- Contexte de la course -->


        <!-- Indicateurs clés -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          @for (metric of metrics(); track metric.label) {
            <div class="rounded-md border border-slate-200 bg-white p-4">
              <div class="flex items-center gap-2 text-slate-400">
                <ui-icon [icon]="metric.icon" size="sm" class="text-brand-500" />
                <span class="text-xs font-medium uppercase tracking-wide">{{ metric.label }}</span>
              </div>
              <p class="mt-2 text-lg font-semibold tabular-nums text-slate-900">{{ metric.value }}</p>
            </div>
          }
        </div>

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
    const ev = this.event();
    const distance = this.distanceKm();
    const targetTime = ev.targetTimeMinutes ?? 0;
    return [
      { icon: faRoute, label: 'Distance', value: distance ? `${this.round1(distance)} km` : '—' },
      { icon: faArrowTrendUp, label: 'Dénivelé +', value: this.elevationGain() ? `+${Math.round(this.elevationGain())} m` : '—' },
      { icon: faArrowTrendDown, label: 'Dénivelé -', value: this.elevationLoss() ? `-${Math.round(this.elevationLoss())} m` : '—' },
      { icon: faStopwatch, label: 'Chrono cible', value: targetTime ? this.formatDuration(targetTime) : '—' },
      { icon: faGaugeHigh, label: 'Allure', value: this.globalPace(distance, targetTime) },
      { icon: faLocationDot, label: 'Ravitos', value: `${ev.aidStations?.length ?? 0}` },
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
