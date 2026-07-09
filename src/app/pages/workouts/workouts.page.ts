import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { WorkoutService } from '../../features/workouts/services/workout.service';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { BadgeComponent } from '../../components/atoms/badge/badge.component';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import type { Workout } from '../../core/models';
import { formatDistance, formatDuration } from '../../core/utils/pace.util';
import {
  faPlus,
  faDownload,
  faDumbbell,
  faPersonRunning,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Page : liste et gestion des séances.
 */
@Component({
  selector: 'app-workouts-page',
  standalone: true,
  imports: [ButtonComponent, BadgeComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold text-slate-900">Mes séances</h1>
          <p class="text-slate-500">Créez des séances par blocs et exportez-les vers Garmin.</p>
        </div>
        <ui-button [icon]="faPlus">Nouvelle séance</ui-button>
      </div>

      @if (workouts(); as list) {
        @if (list.length === 0) {
          <div
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
          >
            <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ui-icon [icon]="faPersonRunning" size="xl" />
            </div>
            <p class="text-slate-600">Aucune séance pour le moment.</p>
            <ui-button variant="secondary" [icon]="faPlus">Créer ma première séance</ui-button>
          </div>
        } @else {
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (workout of list; track workout.id) {
              <article class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-2">
                  <h2 class="font-semibold text-slate-900">{{ workout.name }}</h2>
                  <ui-badge tone="brand">{{ workout.sport }}</ui-badge>
                </div>
                @if (workout.description) {
                  <p class="line-clamp-2 text-sm text-slate-500">{{ workout.description }}</p>
                }
                <div class="mt-auto flex items-center gap-4 text-sm text-slate-500">
                  <span class="inline-flex items-center gap-1.5">
                    <ui-icon [icon]="faDumbbell" size="sm" />
                    {{ workout.elements.length }} bloc(s)
                  </span>
                  @if (workout.estimatedDistanceMeters) {
                    <span>{{ formatDistance(workout.estimatedDistanceMeters) }}</span>
                  }
                  @if (workout.estimatedDurationSeconds) {
                    <span>{{ formatDuration(workout.estimatedDurationSeconds) }}</span>
                  }
                </div>
                <a [href]="exportUrl(workout)" download>
                  <ui-button variant="secondary" size="sm" [icon]="faDownload">
                    Export Garmin
                  </ui-button>
                </a>
              </article>
            }
          </div>
        }
      } @else {
        <p class="text-slate-400">Chargement des séances…</p>
      }
    </section>
  `,
})
export class WorkoutsPage {
  private readonly service = inject(WorkoutService);

  readonly faPlus = faPlus;
  readonly faDownload = faDownload;
  readonly faDumbbell = faDumbbell;
  readonly faPersonRunning = faPersonRunning;

  readonly formatDistance = formatDistance;
  readonly formatDuration = formatDuration;

  readonly workouts = toSignal(
    this.service.list().pipe(catchError(() => of([] as Workout[]))),
    { initialValue: undefined },
  );

  protected readonly error = signal<string | null>(null);

  exportUrl(workout: Workout): string {
    return this.service.garminExportUrl(workout.id);
  }
}
