import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { faCalendarDay, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

/** Case du calendrier (jour du mois affiché ou d'un mois adjacent). */
interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  disabled: boolean;
}

const WEEKDAY_LABELS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

/** Construit une date locale à minuit à partir d'un ISO `YYYY-MM-DD` (évite les décalages UTC). */
function fromIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Formate une date locale en ISO `YYYY-MM-DD`. */
function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Atom : sélecteur de date avec calendrier mensuel en popover, déclenché par
 * un bouton compact affichant la date au format `jj/mm/aaaa`.
 *
 * Valeur exposée via `[(value)]` au format ISO `YYYY-MM-DD` (two-way binding).
 * `min`/`max` (ISO) bornent les jours sélectionnables, utile pour un
 * intervalle de dates.
 */
@Component({
  selector: 'ui-date-picker',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full">
      @if (label()) {
        <label [class]="labelClass()">{{ label() }}</label>
      }
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-900 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        [class]="triggerClass()"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="ariaLabel() || null"
        aria-haspopup="dialog"
        (click)="toggle()"
      >
        <ui-icon [icon]="faCalendarDay" size="sm" class="text-slate-400" />
        <span [class.text-slate-400]="!value()">{{ displayLabel() }}</span>
      </button>

      @if (open()) {
        <div
          role="dialog"
          aria-label="Sélecteur de date"
          class="absolute z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div class="flex items-center justify-between">
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Mois précédent"
              (click)="shiftMonth(-1)"
            >
              <ui-icon [icon]="faChevronLeft" size="xs" />
            </button>
            <span class="text-sm font-semibold capitalize text-slate-800">{{ monthLabel() }}</span>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Mois suivant"
              (click)="shiftMonth(1)"
            >
              <ui-icon [icon]="faChevronRight" size="xs" />
            </button>
          </div>

          <div class="mt-2 grid grid-cols-7 gap-y-1 text-center">
            @for (label of weekdayLabels; track label) {
              <span class="text-[0.65rem] font-medium uppercase tracking-wide text-slate-400">{{ label }}</span>
            }
            @for (cell of days(); track cell.iso) {
              <button
                type="button"
                class="mx-auto grid h-7 w-7 place-items-center rounded-full text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                [class.text-slate-300]="!cell.inMonth"
                [class.text-slate-700]="cell.inMonth && !cell.isSelected"
                [class.font-semibold]="cell.isToday"
                [class.bg-brand-600]="cell.isSelected"
                [class.text-white]="cell.isSelected"
                [class.hover:bg-slate-100]="!cell.isSelected"
                [disabled]="cell.disabled"
                (click)="select(cell.iso)"
              >
                {{ cell.day }}
              </button>
            }
          </div>

          @if (showToday()) {
            <div class="mt-2 flex justify-center border-t border-slate-100 pt-2">
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                (click)="selectToday()"
              >
                Aujourd'hui
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DatePickerComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Date sélectionnée, ISO `YYYY-MM-DD` (two-way binding via `[(value)]`). */
  readonly value = model.required<string>();
  /** Date minimale sélectionnable (ISO), optionnelle. */
  readonly min = input('');
  /** Date maximale sélectionnable (ISO), optionnelle. */
  readonly max = input('');
  /** Libellé optionnel affiché au-dessus du bouton. */
  readonly label = input('');
  /** Libellé accessible du bouton déclencheur (utile sans `label` visible). */
  readonly ariaLabel = input('');
  /** Classes du libellé — à aligner sur les autres labels du formulaire hôte. */
  readonly labelClass = input('mb-1 block text-sm font-medium text-slate-700');
  /** Classes du bouton déclencheur — à aligner sur les autres champs du formulaire hôte. */
  readonly triggerClass = input(
    'rounded-lg border border-slate-300 bg-white shadow-sm hover:border-brand-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
  );
  /** Affiche un raccourci « Aujourd'hui ». */
  readonly showToday = input(false);
  readonly disabled = input(false);

  protected readonly faCalendarDay = faCalendarDay;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly weekdayLabels = WEEKDAY_LABELS;

  protected readonly open = signal(false);
  /** Premier jour du mois affiché dans le calendrier (recalé sur la valeur à l'ouverture). */
  private readonly viewMonth = signal(this.startOfMonth(new Date()));

  protected readonly displayLabel = computed(() => {
    const date = fromIso(this.value());
    if (!date) return 'jj/mm/aaaa';
    return date.toLocaleDateString('fr-FR');
  });

  protected readonly monthLabel = computed(() =>
    this.viewMonth().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  );

  protected readonly days = computed<DayCell[]>(() => {
    const month = this.viewMonth();
    const selected = fromIso(this.value());
    const minDate = fromIso(this.min());
    const maxDate = fromIso(this.max());
    const today = new Date();

    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    // Lundi = 0 ... Dimanche = 6 (semaine française).
    const leading = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - leading);

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const iso = toIso(date);
      const disabled = (!!minDate && date < minDate) || (!!maxDate && date > maxDate);
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        isToday: sameDay(date, today),
        isSelected: !!selected && sameDay(date, selected),
        disabled,
      };
    });
  });

  constructor() {
    // Recentre le calendrier sur la valeur courante à chaque ouverture.
    effect(() => {
      if (!this.open()) return;
      const date = fromIso(this.value());
      if (date) this.viewMonth.set(this.startOfMonth(date));
    });
  }

  protected toggle(): void {
    if (this.disabled()) return;
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected shiftMonth(delta: number): void {
    const month = this.viewMonth();
    this.viewMonth.set(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  protected select(iso: string): void {
    this.value.set(iso);
    this.close();
  }

  protected selectToday(): void {
    this.select(toIso(new Date()));
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
