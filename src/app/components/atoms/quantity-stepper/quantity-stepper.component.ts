import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

/**
 * Atom : sélecteur de quantité avec boutons « - » et « + » encadrant la valeur.
 *
 * La valeur est bornée par `min`/`max` et exposée via un `model` afin de
 * permettre le two-way binding `[(value)]`.
 */
@Component({
  selector: 'ui-quantity-stepper',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
        [disabled]="value() <= min()"
        (click)="decrement()"
        aria-label="Diminuer la quantité"
      >
        <ui-icon [icon]="faMinus" size="sm" />
      </button>
      <span class="w-8 text-center text-sm font-semibold tabular-nums text-slate-800">{{ value() }}</span>
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
        [disabled]="value() >= max()"
        (click)="increment()"
        aria-label="Augmenter la quantité"
      >
        <ui-icon [icon]="faPlus" size="sm" />
      </button>
    </div>
  `,
})
export class QuantityStepperComponent {
  /** Quantité courante (two-way binding via `[(value)]`). */
  readonly value = model.required<number>();
  /** Quantité minimale autorisée. */
  readonly min = input(1);
  /** Quantité maximale autorisée. */
  readonly max = input(Number.MAX_SAFE_INTEGER);

  protected readonly faMinus = faMinus;
  protected readonly faPlus = faPlus;

  protected decrement(): void {
    const next = this.value() - 1;
    if (next >= this.min()) this.value.set(next);
  }

  protected increment(): void {
    const next = this.value() + 1;
    if (next <= this.max()) this.value.set(next);
  }
}
