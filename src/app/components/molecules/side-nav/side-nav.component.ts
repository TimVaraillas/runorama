import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { TabItem } from '../tabs/tabs.component';

/** Groupe d'entrées de navigation, avec un intitulé de catégorie optionnel. */
export interface NavSection {
  /** Intitulé de la catégorie (masqué en mode compact horizontal). */
  label?: string;
  /** Entrées de la section. */
  items: TabItem[];
}

/**
 * Molecule : menu de navigation vertical (style tableau de bord).
 *
 * Variante verticale de {@link TabsComponent} : sur grand écran, les entrées
 * s'empilent dans une colonne latérale ; sur petit écran, elles défilent
 * horizontalement. L'entrée active est pilotée par le `model` bidirectionnel
 * `active`. Les entrées peuvent être fournies à plat via `items` ou regroupées
 * par catégorie via `sections`.
 */
@Component({
  selector: 'ui-side-nav',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0 p-3"
      role="tablist"
      aria-orientation="vertical"
    >
      @for (section of resolvedSections(); track $index) {
        <div class="contents lg:block lg:space-y-1">
          @if (section.label) {
            <p class="hidden px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
              {{ section.label }}
            </p>
          }
          @for (item of section.items; track item.id) {
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
        </div>
      }
    </nav>
  `,
})
export class SideNavComponent {
  /** Entrées de navigation à plat (ignorées si `sections` est fourni). */
  readonly items = input<TabItem[]>([]);
  /** Entrées regroupées par catégorie. Prioritaire sur `items`. */
  readonly sections = input<NavSection[] | null>(null);
  /** Identifiant de l'entrée active (bidirectionnel). */
  readonly active = model.required<string>();

  /** Sections résolues : `sections` si fourni, sinon une section unique à plat. */
  protected readonly resolvedSections = computed<NavSection[]>(
    () => this.sections() ?? [{ items: this.items() }],
  );

  private readonly base =
    'inline-flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 lg:w-full';

  protected buttonClass(id: string): string {
    const active = this.active() === id;
    return `${this.base} ${
      active
        ? 'bg-brand-50 text-brand-700'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
    }`;
  }
}
