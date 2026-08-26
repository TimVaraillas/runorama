import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';
import { faStar } from '@fortawesome/free-solid-svg-icons';

/**
 * Atom : note de 0 à 5 sous forme d'étoiles cliquables, intégrée aux
 * formulaires réactifs (`formControlName` / `formControl`).
 *
 * Un clic sur l'étoile déjà sélectionnée remet la note à zéro (non renseignée).
 */
@Component({
  selector: 'ui-rating-input',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RatingInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex items-center gap-1" role="radiogroup" [attr.aria-label]="label() || 'Note'">
      @for (star of stars; track star) {
        <button
          type="button"
          class="grid place-items-center rounded p-0.5 transition-colors disabled:cursor-not-allowed"
          [class.text-amber-400]="star <= displayed()"
          [class.text-slate-300]="star > displayed()"
          [class.hover:text-amber-300]="!disabled()"
          [disabled]="disabled()"
          role="radio"
          [attr.aria-checked]="star === value()"
          [attr.aria-label]="star + ' sur 5'"
          (click)="select(star)"
          (mouseenter)="hover.set(star)"
          (mouseleave)="hover.set(0)"
        >
          <ui-icon [icon]="faStar" [size]="size()" />
        </button>
      }
      @if (showValue() && value() > 0) {
        <span class="ml-1 text-sm font-semibold tabular-nums text-slate-600">{{ value() }}/5</span>
      }
    </div>
  `,
})
export class RatingInputComponent implements ControlValueAccessor {
  /** Libellé pour l'accessibilité. */
  readonly label = input('');
  /** Taille des étoiles. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Affiche la valeur « n/5 » à côté des étoiles. */
  readonly showValue = input(false, { transform: booleanAttribute });

  protected readonly faStar = faStar;
  protected readonly stars = [1, 2, 3, 4, 5] as const;
  protected readonly value = signal(0);
  protected readonly hover = signal(0);
  protected readonly disabled = signal(false);

  /** Étoiles à colorer (survol prioritaire sur la valeur). */
  protected readonly displayed = () => this.hover() || this.value();

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  protected select(star: number): void {
    if (this.disabled()) return;
    const next = this.value() === star ? 0 : star;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  writeValue(value: number | null | undefined): void {
    this.value.set(typeof value === 'number' ? value : 0);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
