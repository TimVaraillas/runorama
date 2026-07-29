import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl } from '@angular/forms';

/** Type HTML supporté par le champ. */
export type TextInputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

let uid = 0;

/** Messages d'erreur par défaut, indexés par clé de validateur Angular. */
const DEFAULT_ERROR_MESSAGES: Record<string, (error: unknown, label: string) => string> = {
  required: (_e, label) => `${label || 'Ce champ'} est requis.`,
  email: () => 'Adresse e-mail invalide.',
  minlength: (e) =>
    `Doit contenir au moins ${(e as { requiredLength: number }).requiredLength} caractères.`,
  maxlength: (e) =>
    `Ne doit pas dépasser ${(e as { requiredLength: number }).requiredLength} caractères.`,
  min: (e) => `Doit être supérieur ou égal à ${(e as { min: number }).min}.`,
  max: (e) => `Doit être inférieur ou égal à ${(e as { max: number }).max}.`,
  passwordStrength: () => 'Mot de passe trop faible.',
};

/**
 * Atom : champ de saisie texte intégré aux formulaires réactifs.
 *
 * S'utilise avec `formControlName` / `formControl` comme un `<input>` natif,
 * tout en gérant l'affichage réactif des erreurs de validation (bordure rouge
 * + message explicite) dès que le champ est touché ou modifié.
 *
 * L'affichage des erreurs peut être désactivé via `hideError` (utile lorsqu'un
 * indicateur dédié, comme `ui-password-strength`, guide déjà l'utilisateur).
 */
@Component({
  selector: 'ui-text-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      @if (label()) {
        <label [for]="controlId" class="mb-1 block text-sm font-medium text-slate-700">
          {{ label() }}
          @if (hint()) {
            <span class="font-normal text-slate-400">{{ hint() }}</span>
          }
        </label>
      }
      <input
        [id]="controlId"
        [type]="type()"
        [attr.autocomplete]="autocomplete() || null"
        [attr.placeholder]="placeholder() || null"
        [attr.inputmode]="inputmode() || null"
        [attr.min]="min() || null"
        [attr.max]="max() || null"
        [attr.step]="step() || null"
        [value]="value()"
        [disabled]="disabled()"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-describedby]="showError() ? controlId + '-error' : null"
        (input)="onInput($event)"
        (blur)="onBlur()"
        [class]="inputClasses()"
      />
      @if (showError()) {
        <p [id]="controlId + '-error'" class="mt-1 text-xs text-rose-600">{{ errorText() }}</p>
      }
    </div>
  `,
})
export class TextInputComponent implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Libellé affiché au-dessus du champ. */
  readonly label = input('');
  /** Indication complémentaire affichée à côté du libellé. */
  readonly hint = input('');
  /** Type HTML du champ. */
  readonly type = input<TextInputType>('text');
  /** Valeur de l'attribut `autocomplete`. */
  readonly autocomplete = input('');
  /** Texte indicatif dans le champ. */
  readonly placeholder = input('');
  /** Valeur de l'attribut `inputmode`. */
  readonly inputmode = input('');
  /** Attribut `min` (champs numériques). */
  readonly min = input('');
  /** Attribut `max` (champs numériques). */
  readonly max = input('');
  /** Attribut `step` (champs numériques). */
  readonly step = input('');
  /** Masque l'affichage des erreurs (ex. champ mot de passe avec indicateur dédié). */
  readonly hideError = input(false);
  /** Surcharge des messages d'erreur par clé de validateur. */
  readonly errorMessages = input<Record<string, string>>({});

  protected readonly controlId = `ui-text-input-${uid++}`;

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  private readonly touched = signal(false);
  /** Compteur incrémenté à chaque changement de statut, pour réévaluer les computed. */
  private readonly statusVersion = signal(0);

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Auto-enregistrement comme accesseur de valeur (évite la dépendance circulaire
    // d'un provider NG_VALUE_ACCESSOR).
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    this.ngControl?.control?.statusChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.statusVersion.update((v) => v + 1));
  }

  // --- ControlValueAccessor ---
  writeValue(value: unknown): void {
    this.value.set(value == null ? '' : String(value));
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.value.set(raw);
    // Pour un champ numérique, on renvoie un nombre (ou null) au contrôle de formulaire.
    if (this.type() === 'number') {
      this.onChange(raw === '' ? null : Number(raw));
    } else {
      this.onChange(raw);
    }
  }

  protected onBlur(): void {
    this.touched.set(true);
    this.onTouched();
    this.statusVersion.update((v) => v + 1);
  }

  /** Vrai lorsqu'une erreur doit être affichée. */
  protected readonly showError = computed(() => {
    this.statusVersion();
    if (this.hideError()) {
      return false;
    }
    const control = this.ngControl?.control;
    return !!control && control.invalid && (this.touched() || control.dirty);
  });

  /** Message d'erreur à afficher (première erreur rencontrée). */
  protected readonly errorText = computed(() => {
    this.statusVersion();
    const control = this.ngControl?.control;
    const errors = control?.errors;
    if (!errors) {
      return '';
    }
    const key = Object.keys(errors)[0];
    const override = this.errorMessages()[key];
    if (override) {
      return override;
    }
    const builder = DEFAULT_ERROR_MESSAGES[key];
    return builder ? builder(errors[key], this.label()) : 'Champ invalide.';
  });

  /** Classes de l'input, avec état d'erreur. */
  protected readonly inputClasses = computed(() => {
    const base =
      'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-slate-50';
    return this.showError()
      ? `${base} border-rose-400 focus:border-rose-500 focus:ring-rose-500`
      : `${base} border-slate-300 focus:border-brand-500 focus:ring-brand-500`;
  });
}
