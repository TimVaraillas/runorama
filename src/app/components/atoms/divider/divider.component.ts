import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Style visuel du séparateur. */
export type DividerVariant = 'solid' | 'dashed' | 'dotted' | 'gradient';

/**
 * Atom : séparateur horizontal réutilisable entre deux sections.
 *
 * Plusieurs variantes visuelles sont disponibles via `variant`, et un libellé
 * optionnel (`label`) peut être centré au milieu du trait.
 */
@Component({
  selector: 'ui-divider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', role: 'separator', 'aria-orientation': 'horizontal' },
  template: `
    @if (label()) {
      <div class="flex items-center gap-3" [class]="spacingClass()">
        <span class="h-px flex-1" [class]="lineClass()"></span>
        <span class="shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
          {{ label() }}
        </span>
        <span class="h-px flex-1" [class]="lineClass()"></span>
      </div>
    } @else {
      <div [class]="spacingClass()">
        <div [class]="soloLineClass()"></div>
      </div>
    }
  `,
})
export class DividerComponent {
  /** Variante visuelle du trait. */
  readonly variant = input<DividerVariant>('solid');
  /** Libellé optionnel centré sur le trait. */
  readonly label = input('');
  /** Espacement vertical (my-*) — false pour n'ajouter aucune marge. */
  readonly spacing = input(true);

  protected spacingClass(): string {
    return this.spacing() ? 'my-6' : '';
  }

  /** Classe du trait quand un label est présent (segments latéraux). */
  protected lineClass(): string {
    return this.variant() === 'gradient'
      ? 'bg-gradient-to-r from-transparent via-slate-300 to-transparent'
      : 'bg-slate-200';
  }

  /** Classe du trait plein (sans label). */
  protected soloLineClass(): string {
    switch (this.variant()) {
      case 'dashed':
        return 'border-t border-dashed border-slate-200';
      case 'dotted':
        return 'border-t border-dotted border-slate-300';
      case 'gradient':
        return 'h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent';
      default:
        return 'h-px bg-slate-200';
    }
  }
}
