import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

/**
 * Atom : champ de recherche texte réutilisable.
 *
 * Affiche une icône de loupe et expose sa valeur via un binding bidirectionnel
 * (`[(value)]`). Utilisable pour filtrer n'importe quelle liste par texte.
 */
@Component({
  selector: 'ui-search-input',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-55 flex-1' },
  template: `
    <div class="relative w-full">
      <span class="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
        <ui-icon [icon]="faMagnifyingGlass" size="sm" />
      </span>
      <input
        type="search"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [attr.aria-label]="ariaLabel()"
        [placeholder]="placeholder()"
        class="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </div>
  `,
})
export class SearchInputComponent {
  /** Valeur du champ (binding bidirectionnel `[(value)]`). */
  readonly value = model('');
  /** Texte indicatif affiché quand le champ est vide. */
  readonly placeholder = input('Rechercher…');
  /** Libellé accessible du champ. */
  readonly ariaLabel = input('Rechercher');

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
}
