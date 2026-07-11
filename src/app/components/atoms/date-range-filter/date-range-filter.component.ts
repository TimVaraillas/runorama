import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';
import { faCalendarDay, faXmark } from '@fortawesome/free-solid-svg-icons';

/**
 * Atom : filtre par intervalle de dates réutilisable.
 *
 * Affiche deux sélecteurs de date (« Du » / « Au ») bornés l'un par l'autre :
 * la date de fin ne peut pas précéder la date de début et inversement. Les
 * valeurs sont exposées via des bindings bidirectionnels (`[(from)]`,
 * `[(to)]`), au format ISO `YYYY-MM-DD`.
 */
@Component({
  selector: 'ui-date-range-filter',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white pl-3 pr-2 text-sm text-slate-900 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200"
    >
      <ui-icon [icon]="faCalendarDay" size="sm" class="text-slate-400" />
      <input
        type="date"
        [ngModel]="from()"
        (ngModelChange)="from.set($event)"
        [max]="to() || null"
        [attr.aria-label]="fromAriaLabel()"
        class="border-0 bg-transparent py-2 text-sm text-slate-900 focus:outline-none focus:ring-0"
      />
      <span class="text-slate-400">→</span>
      <input
        type="date"
        [ngModel]="to()"
        (ngModelChange)="to.set($event)"
        [min]="from() || null"
        [attr.aria-label]="toAriaLabel()"
        class="border-0 bg-transparent py-2 text-sm text-slate-900 focus:outline-none focus:ring-0"
      />
      @if (hasValue()) {
        <button
          type="button"
          class="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          (click)="clear()"
          aria-label="Effacer l'intervalle de dates"
        >
          <ui-icon [icon]="faXmark" size="sm" />
        </button>
      }
    </div>
  `,
})
export class DateRangeFilterComponent {
  /** Date de début (binding bidirectionnel `[(from)]`, format `YYYY-MM-DD`). */
  readonly from = model('');
  /** Date de fin (binding bidirectionnel `[(to)]`, format `YYYY-MM-DD`). */
  readonly to = model('');
  /** Libellé accessible du champ de début. */
  readonly fromAriaLabel = input('Date de début');
  /** Libellé accessible du champ de fin. */
  readonly toAriaLabel = input('Date de fin');

  protected readonly faCalendarDay = faCalendarDay;
  protected readonly faXmark = faXmark;

  /** Indique qu'au moins une des deux bornes est renseignée. */
  protected readonly hasValue = computed(() => !!this.from() || !!this.to());

  clear(): void {
    this.from.set('');
    this.to.set('');
  }
}
