import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

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
  imports: [IconComponent, DatePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-1.5">
      <ui-date-picker [(value)]="from" [max]="to()" [ariaLabel]="fromAriaLabel()" [triggerClass]="pickerClass" />
      <span class="text-slate-400">→</span>
      <ui-date-picker [(value)]="to" [min]="from()" [ariaLabel]="toAriaLabel()" [triggerClass]="pickerClass" />
      @if (hasValue()) {
        <button
          type="button"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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

  protected readonly faXmark = faXmark;
  protected readonly pickerClass =
    'rounded-md border border-slate-300 bg-white shadow-sm hover:border-brand-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200';

  /** Indique qu'au moins une des deux bornes est renseignée. */
  protected readonly hasValue = computed(() => !!this.from() || !!this.to());

  clear(): void {
    this.from.set('');
    this.to.set('');
  }
}

