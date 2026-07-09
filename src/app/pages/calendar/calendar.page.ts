import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface CalendarDay {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Page : calendrier de planification des séances.
 * Affiche une grille mensuelle ; les séances planifiées viendront s'y accrocher.
 */
@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold text-slate-900">Calendrier</h1>
          <p class="text-slate-500">Planifiez vos séances jour après jour.</p>
        </div>
        <div class="flex items-center gap-2">
          <ui-button variant="ghost" size="sm" (clicked)="previousMonth()">
            <ui-icon [icon]="faChevronLeft" />
          </ui-button>
          <span class="min-w-40 text-center font-semibold capitalize text-slate-800">
            {{ monthLabel() }}
          </span>
          <ui-button variant="ghost" size="sm" (clicked)="nextMonth()">
            <ui-icon [icon]="faChevronRight" />
          </ui-button>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          @for (day of weekdays; track day) {
            <div class="px-2 py-3 text-center text-xs font-medium uppercase text-slate-400">
              {{ day }}
            </div>
          }
        </div>
        <div class="grid grid-cols-7">
          @for (day of days(); track day.iso) {
            <button
              type="button"
              class="min-h-24 border-b border-r border-slate-100 p-2 text-left transition-colors hover:bg-brand-50/50"
              [class.bg-slate-50]="!day.inCurrentMonth"
            >
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm"
                [class.text-slate-400]="!day.inCurrentMonth"
                [class.bg-brand-600]="day.isToday"
                [class.text-white]="day.isToday"
                [class.font-semibold]="day.isToday"
              >
                {{ day.date.getDate() }}
              </span>
            </button>
          }
        </div>
      </div>
    </section>
  `,
})
export class CalendarPage {
  readonly faChevronLeft = faChevronLeft;
  readonly faChevronRight = faChevronRight;
  readonly weekdays = WEEKDAYS;

  private readonly cursor = signal(new Date());

  readonly monthLabel = computed(() => {
    const d = this.cursor();
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });

  /** Grille de 6 semaines (42 jours) démarrant un lundi. */
  readonly days = computed<CalendarDay[]>(() => {
    const cursor = this.cursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    // getDay() : 0=dimanche → on décale pour démarrer lundi.
    const offset = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);

    const today = new Date();
    const todayIso = this.toIso(today);

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = this.toIso(date);
      return {
        date,
        iso,
        inCurrentMonth: date.getMonth() === month,
        isToday: iso === todayIso,
      };
    });
  });

  previousMonth(): void {
    const d = this.cursor();
    this.cursor.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const d = this.cursor();
    this.cursor.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  private toIso(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
