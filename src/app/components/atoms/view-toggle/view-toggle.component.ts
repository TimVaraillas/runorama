import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTableList, faBorderAll } from '@fortawesome/free-solid-svg-icons';

/** Mode d'affichage d'une liste de produits. */
export type ProductViewMode = 'table' | 'grid';

/**
 * Atom : bascule entre un affichage en tableau et un affichage en grille.
 */
@Component({
  selector: 'ui-view-toggle',
  standalone: true,
  imports: [FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5"
      role="group"
      aria-label="Choisir l'affichage"
    >
      <button
        type="button"
        [class]="buttonClass('table')"
        [attr.aria-pressed]="mode() === 'table'"
        aria-label="Affichage en tableau"
        (click)="select('table')"
      >
        <fa-icon [icon]="faTableList" />
      </button>
      <button
        type="button"
        [class]="buttonClass('grid')"
        [attr.aria-pressed]="mode() === 'grid'"
        aria-label="Affichage en grille"
        (click)="select('grid')"
      >
        <fa-icon [icon]="faBorderAll" />
      </button>
    </div>
  `,
})
export class ViewToggleComponent {
  /** Mode actuellement sélectionné. */
  readonly mode = input<ProductViewMode>('table');
  /** Émis lorsqu'un nouveau mode est choisi. */
  readonly modeChange = output<ProductViewMode>();

  protected readonly faTableList = faTableList;
  protected readonly faBorderAll = faBorderAll;

  private readonly base =
    'grid h-8 w-8 place-items-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

  protected readonly activeMode = computed(() => this.mode());

  select(mode: ProductViewMode): void {
    if (mode !== this.mode()) {
      this.modeChange.emit(mode);
    }
  }

  protected buttonClass(mode: ProductViewMode): string {
    const active = this.mode() === mode;
    return `${this.base} ${
      active ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'
    }`;
  }
}
