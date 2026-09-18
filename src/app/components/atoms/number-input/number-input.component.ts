import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

let uid = 0;

/** Messages d'erreur par défaut, indexés par clé de validateur Angular. */
const DEFAULT_ERROR_MESSAGES: Record<string, (error: unknown, label: string) => string> = {
  required: (_e, label) => `${label || 'Ce champ'} est requis.`,
  min: (e) => `Doit être supérieur ou égal à ${(e as { min: number }).min}.`,
  max: (e) => `Doit être inférieur ou égal à ${(e as { max: number }).max}.`,
};

/** Intervalle (ms) entre deux pas lors d'un appui long sur +/-. */
const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 80;

/**
 * Atom : champ numérique à UX optimisée, intégré aux formulaires réactifs
 * (`formControlName` / `formControl`) comme un `<input type="number">` natif.
 *
 * Boutons +/- (clic, appui long répété, molette lorsque le champ est
 * focalisé) en plus de la saisie clavier directe et des flèches natives.
 * Affiche une unité optionnelle (ex. « km », « min ») et les erreurs de
 * validation dès que le champ est touché.
 */
@Component({
  selector: 'ui-number-input',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      @if (label()) {
        <label [for]="controlId" [class]="labelClass()">{{ label() }}</label>
      }
      <div class="flex items-stretch overflow-hidden" [class]="wrapperClass()">
        <button
          type="button"
          class="grid w-9 shrink-0 place-items-center text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          [disabled]="disabled() || atMin()"
          (click)="step(-1)"
          (pointerdown)="scheduleRepeat(-1)"
          (pointerup)="cancelRepeat()"
          (pointerleave)="cancelRepeat()"
          aria-label="Diminuer"
        >
          <ui-icon [icon]="faMinus" size="xs" />
        </button>
        <div class="relative flex-1">
          <input
            [id]="controlId"
            type="number"
            [attr.min]="min()"
            [attr.max]="max()"
            [attr.step]="step_()"
            [attr.placeholder]="placeholder() || null"
            [attr.aria-invalid]="showError() ? 'true' : null"
            [value]="value()"
            [disabled]="disabled()"
            class="w-full appearance-none border-0 bg-transparent px-2 py-2 text-right text-sm tabular-nums text-slate-900 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            [class.pr-8]="unit()"
            (input)="onInput($any($event.target).valueAsNumber)"
            (blur)="onBlur()"
            (focus)="focused.set(true)"
            (wheel)="onWheel($event)"
          />
          @if (unit()) {
            <span class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400">{{ unit() }}</span>
          }
        </div>
        <button
          type="button"
          class="grid w-9 shrink-0 place-items-center text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          [disabled]="disabled() || atMax()"
          (click)="step(1)"
          (pointerdown)="scheduleRepeat(1)"
          (pointerup)="cancelRepeat()"
          (pointerleave)="cancelRepeat()"
          aria-label="Augmenter"
        >
          <ui-icon [icon]="faPlus" size="xs" />
        </button>
      </div>
      @if (showError()) {
        <p class="mt-1 text-xs text-rose-600">{{ errorText() }}</p>
      }
    </div>
  `,
})
export class NumberInputComponent implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Libellé affiché au-dessus du champ. */
  readonly label = input('');
  /** Classes du libellé — à aligner sur les autres labels du formulaire hôte. */
  readonly labelClass = input('mb-1 block text-sm font-medium text-slate-700');
  /** Classes du conteneur (bordure/fond) — à aligner sur les autres champs du formulaire hôte. */
  readonly wrapperClass = input(
    'rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500',
  );
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  /** Pas d'incrémentation (boutons, molette, flèches clavier). */
  readonly step_ = input(1, { alias: 'step' });
  /** Unité affichée dans le champ (ex. « km », « min », « km/h »). */
  readonly unit = input('');
  readonly placeholder = input('');
  /**
   * Valeur initiale/pilotée en dehors d'un formulaire réactif (ignorée si le
   * composant est utilisé avec `formControlName`/`formControl`/`ngModel`).
   */
  readonly valueInput = input<number | null>(null, { alias: 'value' });
  /** Émis à chaque changement lorsqu'utilisé hors formulaire réactif. */
  readonly valueChange = output<number | null>();

  protected readonly controlId = `ui-number-input-${uid++}`;
  protected readonly faMinus = faMinus;
  protected readonly faPlus = faPlus;

  protected readonly value = signal<number | null>(null);
  protected readonly disabled = signal(false);
  protected readonly focused = signal(false);
  private readonly touched = signal(false);
  private readonly statusVersion = signal(0);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private repeatTimeout?: ReturnType<typeof setTimeout>;
  private repeatInterval?: ReturnType<typeof setInterval>;

  protected readonly atMin = computed(() => {
    const min = this.min();
    const value = this.value();
    return min != null && value != null && value <= min;
  });
  protected readonly atMax = computed(() => {
    const max = this.max();
    const value = this.value();
    return max != null && value != null && value >= max;
  });

  constructor() {
    // Auto-enregistrement comme accesseur de valeur (évite la dépendance circulaire
    // d'un provider NG_VALUE_ACCESSOR).
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    // Hors formulaire réactif : la valeur suit directement l'input `[value]`.
    effect(() => {
      if (this.ngControl) return;
      this.value.set(this.valueInput());
    });
  }

  ngOnInit(): void {
    this.ngControl?.control?.statusChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.statusVersion.update((v) => v + 1));
  }

  // --- ControlValueAccessor ---
  writeValue(value: unknown): void {
    this.value.set(value == null || value === '' ? null : Number(value));
  }
  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(raw: number): void {
    const next = Number.isNaN(raw) ? null : raw;
    this.value.set(next);
    this.onChange(next);
    this.valueChange.emit(next);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.touched.set(true);
    this.onTouched();
    this.statusVersion.update((v) => v + 1);
  }

  /** Un pas +/-1 (ou `step`) au clic, à la molette ou en appui long. */
  protected step(direction: 1 | -1): void {
    if (this.disabled()) return;
    const current = this.value() ?? 0;
    let next = current + direction * this.step_();
    const min = this.min();
    const max = this.max();
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    next = Math.round(next * 1000) / 1000;
    this.value.set(next);
    this.onChange(next);
    this.valueChange.emit(next);
  }

  protected scheduleRepeat(direction: 1 | -1): void {
    this.cancelRepeat();
    this.repeatTimeout = setTimeout(() => {
      this.repeatInterval = setInterval(() => this.step(direction), REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  }

  protected cancelRepeat(): void {
    clearTimeout(this.repeatTimeout);
    clearInterval(this.repeatInterval);
  }

  protected onWheel(event: WheelEvent): void {
    if (!this.focused() || this.disabled()) return;
    event.preventDefault();
    this.step(event.deltaY < 0 ? 1 : -1);
  }

  /** Vrai lorsqu'une erreur doit être affichée. */
  protected readonly showError = computed(() => {
    this.statusVersion();
    const control = this.ngControl?.control;
    return !!control && control.invalid && (this.touched() || control.dirty);
  });

  /** Message d'erreur à afficher (première erreur rencontrée). */
  protected readonly errorText = computed(() => {
    this.statusVersion();
    const control = this.ngControl?.control;
    const errors = control?.errors;
    if (!errors) return '';
    const key = Object.keys(errors)[0]!;
    const builder = DEFAULT_ERROR_MESSAGES[key];
    return builder ? builder(errors[key], this.label()) : 'Champ invalide.';
  });
}
