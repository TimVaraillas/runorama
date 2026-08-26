import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Une option d'un choix segmenté (valeur interne + libellé affiché). */
export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Atom : sélecteur segmenté (groupe de boutons mutuellement exclusifs),
 * intégré aux formulaires réactifs. Idéal pour des choix courts (statut,
 * fréquence « Jamais / Parfois / Souvent »).
 */
@Component({
  selector: 'ui-segmented-choice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SegmentedChoiceComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1"
      role="radiogroup"
      [attr.aria-label]="ariaLabel()"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
          [class.bg-white]="option.value === value()"
          [class.text-slate-900]="option.value === value()"
          [class.shadow-sm]="option.value === value()"
          [class.text-slate-500]="option.value !== value()"
          [class.hover:text-slate-700]="option.value !== value()"
          [disabled]="disabled()"
          role="radio"
          [attr.aria-checked]="option.value === value()"
          (click)="select(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class SegmentedChoiceComponent implements ControlValueAccessor {
  /** Options proposées. */
  readonly options = input.required<SegmentedOption[]>();
  /** Libellé d'accessibilité du groupe. */
  readonly ariaLabel = input('');

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected select(value: string): void {
    if (this.disabled()) return;
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  writeValue(value: string | null | undefined): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
