import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { IconComponent } from '../../atoms/icon/icon.component';

/** Définition d'un onglet. */
export interface TabItem {
  /** Identifiant unique de l'onglet. */
  id: string;
  /** Libellé affiché. */
  label: string;
  /** Icône optionnelle. */
  icon?: IconDefinition;
}

/**
 * Molecule : barre d'onglets (navigation segmentée).
 *
 * Contrôle l'onglet actif via un `model` bidirectionnel `active`.
 */
@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="mb-6 flex items-end gap-1 border-b border-slate-200" role="tablist">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          [class]="buttonClass(tab.id)"
          [attr.aria-selected]="active() === tab.id"
          (click)="active.set(tab.id)"
        >
          @if (tab.icon) {
            <ui-icon [icon]="tab.icon" />
          }
          <span>{{ tab.label }}</span>
        </button>
      }
    </nav>
  `,
})
export class TabsComponent {
  /** Liste des onglets à afficher. */
  readonly tabs = input.required<TabItem[]>();
  /** Identifiant de l'onglet actif (bidirectionnel). */
  readonly active = model.required<string>();

  private readonly base =
    'relative -mb-px inline-flex items-center gap-2 rounded-t-lg border px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

  protected buttonClass(id: string): string {
    const active = this.active() === id;
    return `${this.base} ${
      active
        ? 'z-10 border-slate-200 border-b-white text-brand-600'
        : 'border-transparent border-b-slate-200 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
    }`;
  }
}
