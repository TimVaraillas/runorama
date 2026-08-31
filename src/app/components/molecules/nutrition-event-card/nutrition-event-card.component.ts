import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { raceStrategyCategoryMeta, type RaceStrategy } from '../../../core/models';
import {
  faCalendarDay,
  faLocationDot,
  faRoute,
  faArrowTrendUp,
  faArrowTrendDown,
  faStopwatch,
  faBoxOpen,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Molecule : carte résumant un évènement / stratégie alimentaire.
 *
 * Cliquable pour sélectionner l'évènement ; expose des actions `edit`/`delete`.
 */
@Component({
  selector: 'ui-nutrition-event-card',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="flex h-full cursor-pointer flex-col rounded-xl border bg-white shadow-sm transition-colors"
      [class.border-slate-200]="!selected()"
      [class.hover:border-brand-300]="!selected()"
      [class.border-brand-500]="selected()"
      [class.ring-2]="selected()"
      [class.ring-brand-200]="selected()"
      (click)="select.emit(event())"
    >
      <div class="flex items-start justify-between gap-3 p-4">
        <div class="min-w-0">
          <h3 class="truncate font-semibold text-slate-900">{{ event().name }}</h3>
          <p class="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <ui-icon [icon]="faCalendarDay" size="sm" />
            {{ formattedDate() }}
          </p>
          @if (categoryMeta(); as meta) {
            <ui-badge class="mt-2 inline-flex" [tone]="meta.tone">{{ meta.label }}</ui-badge>
          }
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
            (click)="edit.emit(event()); $event.stopPropagation()"
            aria-label="Modifier la course"
          >
            <ui-icon [icon]="faPen" size="sm" />
          </button>
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            (click)="delete.emit(event()); $event.stopPropagation()"
            aria-label="Supprimer la course"
          >
            <ui-icon [icon]="faTrash" size="sm" />
          </button>
        </div>
      </div>

      <div class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        @if (event().location) {
          <span class="flex items-center gap-1"><ui-icon [icon]="faLocationDot" size="sm" />{{ event().location }}</span>
        }
        @if (event().distance != null) {
          <span class="flex items-center gap-1"><ui-icon [icon]="faRoute" size="sm" />{{ event().distance }} km</span>
        }
        @if (event().elevationGain != null) {
          <span class="flex items-center gap-1"><ui-icon [icon]="faArrowTrendUp" size="sm" />{{ event().elevationGain }} m</span>
        }
        @if (event().elevationLoss != null) {
          <span class="flex items-center gap-1"><ui-icon [icon]="faArrowTrendDown" size="sm" />{{ event().elevationLoss }} m</span>
        }
        @if (formattedTime()) {
          <span class="flex items-center gap-1"><ui-icon [icon]="faStopwatch" size="sm" />{{ formattedTime() }}</span>
        }
        <span class="flex items-center gap-1"><ui-icon [icon]="faBoxOpen" size="sm" />{{ itemCount() }} produit{{ itemCount() > 1 ? 's' : '' }}</span>
      </div>
    </article>
  `,
})
export class NutritionEventCardComponent {
  /** Évènement à afficher. */
  readonly event = input.required<RaceStrategy>();
  /** Indique si la carte est actuellement sélectionnée. */
  readonly selected = input(false);

  readonly select = output<RaceStrategy>();
  readonly edit = output<RaceStrategy>();
  readonly delete = output<RaceStrategy>();

  protected readonly faCalendarDay = faCalendarDay;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faRoute = faRoute;
  protected readonly faArrowTrendUp = faArrowTrendUp;
  protected readonly faArrowTrendDown = faArrowTrendDown;
  protected readonly faStopwatch = faStopwatch;
  protected readonly faBoxOpen = faBoxOpen;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;

  protected readonly itemCount = computed(() =>
    this.event().items.reduce((sum, item) => sum + item.quantity, 0),
  );

  /** Métadonnées d'affichage de l'étiquette (badge). */
  protected readonly categoryMeta = computed(() => raceStrategyCategoryMeta(this.event().category));

  /** Date formatée `JJ/MM/AAAA` à partir d'une date ISO `YYYY-MM-DD`. */
  protected readonly formattedDate = computed(() => {
    const [year, month, day] = this.event().date.split('-');
    if (!year || !month || !day) return this.event().date;
    return `${day}/${month}/${year}`;
  });

  /** Chrono cible formaté `Xh YY` (vide si non défini). */
  protected readonly formattedTime = computed(() => {
    const total = this.event().targetTimeMinutes;
    if (!total) return '';
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  });
}
