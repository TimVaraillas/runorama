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
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';

/** Option proposée par le select filtrable. */
export interface FilterableSelectOption {
  value: string;
  label: string;
}

/**
 * Atom : select filtrable (combobox) avec saisie de texte.
 *
 * Affiche un champ texte qui filtre la liste des options au fur et à mesure de
 * la frappe. La valeur sélectionnée est exposée via un binding bidirectionnel
 * (`[(value)]`) ; une valeur vide correspond à « aucune sélection ».
 */
@Component({
  selector: 'ui-filterable-select',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-55' },
  template: `
    <div class="relative w-full">
      <input
        type="text"
        role="combobox"
        [attr.aria-expanded]="open()"
        aria-autocomplete="list"
        [ngModel]="query()"
        (ngModelChange)="onInput($event)"
        (focus)="open.set(true)"
        [attr.aria-label]="ariaLabel()"
        [placeholder]="placeholder()"
        class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-16 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
      <div class="absolute inset-y-0 right-2 flex items-center gap-1">
        @if (value() || query()) {
          <button
            type="button"
            class="grid h-6 w-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            (click)="clear()"
            [attr.aria-label]="clearAriaLabel()"
          >
            <ui-icon [icon]="faXmark" size="sm" />
          </button>
        }
        <span class="pointer-events-none grid place-items-center text-slate-400">
          <ui-icon [icon]="faChevronDown" size="sm" />
        </span>
      </div>

      @if (open()) {
        <ul
          role="listbox"
          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          @for (option of filtered(); track option.value) {
            <li
              role="option"
              [attr.aria-selected]="option.value === value()"
              class="cursor-pointer px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
              [class.bg-brand-50]="option.value === value()"
              [class.font-medium]="option.value === value()"
              (click)="selectOption(option)"
            >
              {{ option.label }}
            </li>
          } @empty {
            <li class="px-3 py-2 text-sm text-slate-400">Aucun résultat.</li>
          }
        </ul>
      }
    </div>
  `,
})
export class FilterableSelectComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Options proposées. */
  readonly options = input<FilterableSelectOption[]>([]);
  /** Valeur sélectionnée (binding bidirectionnel `[(value)]`). '' = aucune. */
  readonly value = model('');
  /** Texte indicatif affiché quand le champ est vide. */
  readonly placeholder = input('Rechercher…');
  /** Libellé accessible du champ. */
  readonly ariaLabel = input('Filtrer');
  /** Libellé accessible du bouton d'effacement. */
  readonly clearAriaLabel = input('Effacer la sélection');

  protected readonly faChevronDown = faChevronDown;
  protected readonly faXmark = faXmark;

  /** Texte saisi dans le champ (filtre). */
  protected readonly query = signal('');
  /** État d'ouverture de la liste. */
  protected readonly open = signal(false);

  /** Options filtrées par le texte saisi. */
  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.options();
    return this.options().filter((option) => option.label.toLowerCase().includes(term));
  });

  constructor() {
    // Synchronise le texte affiché avec le libellé de la valeur sélectionnée.
    effect(() => {
      const selected = this.options().find((option) => option.value === this.value());
      this.query.set(selected?.label ?? '');
    });
  }

  protected onInput(text: string): void {
    this.query.set(text);
    this.open.set(true);
    // Une saisie manuelle qui ne correspond plus à la sélection la réinitialise.
    if (this.value()) this.value.set('');
  }

  protected selectOption(option: FilterableSelectOption): void {
    this.value.set(option.value);
    this.query.set(option.label);
    this.open.set(false);
  }

  protected clear(): void {
    this.value.set('');
    this.query.set('');
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
