import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { IconComponent } from '../icon/icon.component';

/**
 * Atom : élément d'un menu déroulant.
 *
 * Affiche une icône optionnelle suivie d'un libellé projeté, et émet `selected`
 * au clic. La couleur peut être « default » ou « danger ».
 */
@Component({
  selector: 'ui-dropdown-menu-item',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [class]="classes"
      (click)="selected.emit($event)"
    >
      @if (icon(); as ic) {
        <ui-icon [icon]="ic" fixedWidth />
      }
      <span class="flex-1 text-left"><ng-content /></span>
    </button>
  `,
})
export class DropdownMenuItemComponent {
  /** Icône affichée à gauche du libellé. */
  readonly icon = input<IconDefinition | null>(null);
  /** Intention visuelle de l'élément. */
  readonly color = input<'default' | 'danger'>('default');

  /** Émis lorsque l'élément est cliqué. */
  readonly selected = output<MouseEvent>();

  protected get classes(): string {
    const base =
      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
    return this.color() === 'danger'
      ? `${base} text-rose-600 hover:bg-rose-50`
      : `${base} text-slate-700 hover:bg-slate-100`;
  }
}
