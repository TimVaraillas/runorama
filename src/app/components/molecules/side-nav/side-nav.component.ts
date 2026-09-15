import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { TabItem } from '../tabs/tabs.component';

/**
 * Molecule : menu de navigation vertical (style tableau de bord).
 *
 * Variante verticale de {@link TabsComponent} : sur grand écran, les entrées
 * s'empilent dans une colonne latérale ; sur petit écran, elles défilent
 * horizontalement. L'entrée active est pilotée par le `model` bidirectionnel
 * `active`.
 */
@Component({
  selector: 'ui-side-nav',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 p-3"
      role="tablist"
      aria-orientation="vertical"
    >
      @for (item of items(); track item.id) {
        <button
          type="button"
          role="tab"
          [class]="buttonClass(item.id)"
          [attr.aria-selected]="active() === item.id"
          (click)="active.set(item.id)"
        >
          @if (item.icon) {
            <ui-icon [icon]="item.icon" />
          }
          <span>{{ item.label }}</span>
        </button>
      }
    </nav>
  `,
})
export class SideNavComponent {
  /** Entrées de navigation à afficher. */
  readonly items = input.required<TabItem[]>();
  /** Identifiant de l'entrée active (bidirectionnel). */
  readonly active = model.required<string>();

  private readonly base =
    'inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 lg:w-full';

  protected buttonClass(id: string): string {
    const active = this.active() === id;
    return `${this.base} ${
      active
        ? 'bg-brand-50 text-brand-700'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
    }`;
  }
}
