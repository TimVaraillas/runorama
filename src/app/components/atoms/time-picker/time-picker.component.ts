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
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { faClock } from '@fortawesome/free-solid-svg-icons';

/** Hauteur (px) d'une option dans les colonnes défilantes. */
const ITEM_HEIGHT = 32;

/**
 * Atom : sélecteur d'heure/minute avec deux colonnes défilantes (façon
 * « roue » mobile), déclenché par un bouton compact affichant `HH:mm`.
 *
 * Fonctionne aussi bien pour une heure du jour (`maxHours` 23, `showNow`) que
 * pour une durée (ex. chrono cible, `maxHours` 99). Les valeurs sont exposées
 * via `[(hours)]` / `[(minutes)]` (two-way binding).
 */
@Component({
  selector: 'ui-time-picker',
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
        class="flex w-full items-center gap-2 px-3 py-2 text-sm tabular-nums text-slate-900 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        [class]="triggerClass()"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        aria-haspopup="dialog"
        (click)="toggle()"
      >
        <ui-icon [icon]="faClock" size="sm" class="text-slate-400" />
        <span>{{ pad(hours()) }}:{{ pad(minutes()) }}</span>
      </button>

      @if (open()) {
        <div
          role="dialog"
          aria-label="Sélecteur d'heure"
          class="absolute z-50 mt-2 flex items-start gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div class="flex flex-col items-center">
            <span class="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-400">Heures</span>
            <div
              #hourList
              class="h-40 w-14 scrollbar-none overflow-y-auto scroll-smooth"
              style="scroll-snap-type: y mandatory;"
              (scroll)="onScroll('hour')"
            >
              <div style="height: 64px"></div>
              @for (h of hourOptions(); track h) {
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-center text-sm tabular-nums transition-colors"
                  style="scroll-snap-align: center;"
                  [class]="h === hours() ? 'font-bold text-brand-600' : 'text-slate-500 hover:text-slate-800'"
                  (click)="selectHour(h)"
                >
                  {{ pad(h) }}
                </button>
              }
              <div style="height: 64px"></div>
            </div>
          </div>

          <span class="pt-7 text-lg font-semibold text-slate-300">:</span>

          <div class="flex flex-col items-center">
            <span class="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-400">Minutes</span>
            <div
              #minuteList
              class="h-40 w-14 scrollbar-none overflow-y-auto scroll-smooth"
              style="scroll-snap-type: y mandatory;"
              (scroll)="onScroll('minute')"
            >
              <div style="height: 64px"></div>
              @for (m of minuteOptions(); track m) {
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-center text-sm tabular-nums transition-colors"
                  style="scroll-snap-align: center;"
                  [class]="m === minutes() ? 'font-bold text-brand-600' : 'text-slate-500 hover:text-slate-800'"
                  (click)="selectMinute(m)"
                >
                  {{ pad(m) }}
                </button>
              }
              <div style="height: 64px"></div>
            </div>
          </div>

          @if (showNow()) {
            <div class="ml-1 flex h-40 items-end">
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                (click)="selectNow()"
              >
                Maintenant
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TimePickerComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Heure courante (two-way binding via `[(hours)]`). */
  readonly hours = model.required<number>();
  /** Minute courante (two-way binding via `[(minutes)]`). */
  readonly minutes = model.required<number>();

  /** Borne haute des heures affichées (23 pour une heure du jour, 99 pour une durée). */
  readonly maxHours = input(23);
  /** Libellé optionnel affiché au-dessus du bouton. */
  readonly label = input('');
  /** Classes du libellé — à aligner sur les autres labels du formulaire hôte. */
  readonly labelClass = input('mb-1 block text-sm font-medium text-slate-700');
  /** Classes du bouton déclencheur — à aligner sur les autres champs du formulaire hôte. */
  readonly triggerClass = input(
    'rounded-lg border border-slate-300 bg-white shadow-sm hover:border-brand-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
  );
  /** Affiche un raccourci « Maintenant » (pertinent pour une heure du jour). */
  readonly showNow = input(false);
  readonly disabled = input(false);

  protected readonly faClock = faClock;
  protected readonly open = signal(false);

  private readonly hourListRef = viewChild<ElementRef<HTMLDivElement>>('hourList');
  private readonly minuteListRef = viewChild<ElementRef<HTMLDivElement>>('minuteList');

  protected readonly hourOptions = computed(() =>
    Array.from({ length: this.maxHours() + 1 }, (_, i) => i),
  );
  protected readonly minuteOptions = computed(() => Array.from({ length: 60 }, (_, i) => i));

  private hourScrollTimeout?: ReturnType<typeof setTimeout>;
  private minuteScrollTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    // Recentre les colonnes sur la valeur courante à chaque ouverture.
    effect(() => {
      if (!this.open()) return;
      const h = this.hours();
      const m = this.minutes();
      queueMicrotask(() => {
        this.scrollTo(this.hourListRef(), h, false);
        this.scrollTo(this.minuteListRef(), m, false);
      });
    });
  }

  protected toggle(): void {
    if (this.disabled()) return;
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected selectHour(h: number): void {
    this.hours.set(h);
    this.scrollTo(this.hourListRef(), h, true);
  }

  protected selectMinute(m: number): void {
    this.minutes.set(m);
    this.scrollTo(this.minuteListRef(), m, true);
  }

  protected selectNow(): void {
    const now = new Date();
    this.selectHour(now.getHours());
    this.selectMinute(now.getMinutes());
  }

  /** Débounce du scroll libre (glissé) : sélectionne l'option la plus proche du centre. */
  protected onScroll(column: 'hour' | 'minute'): void {
    if (column === 'hour') {
      clearTimeout(this.hourScrollTimeout);
      this.hourScrollTimeout = setTimeout(() => this.snapToNearest('hour'), 120);
    } else {
      clearTimeout(this.minuteScrollTimeout);
      this.minuteScrollTimeout = setTimeout(() => this.snapToNearest('minute'), 120);
    }
  }

  private snapToNearest(column: 'hour' | 'minute'): void {
    const ref = column === 'hour' ? this.hourListRef() : this.minuteListRef();
    const el = ref?.nativeElement;
    if (!el) return;
    const max = column === 'hour' ? this.maxHours() : 59;
    const index = Math.min(max, Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)));
    if (column === 'hour') this.hours.set(index);
    else this.minutes.set(index);
  }

  private scrollTo(ref: ElementRef<HTMLDivElement> | undefined, index: number, smooth: boolean): void {
    ref?.nativeElement.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'instant' });
  }

  protected pad(value: number): string {
    return value.toString().padStart(2, '0');
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
