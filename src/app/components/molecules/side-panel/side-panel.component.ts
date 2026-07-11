import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  booleanAttribute,
  input,
  output,
} from '@angular/core';

/** Tailles disponibles pour le panneau latéral. */
export type SidePanelSize = 'xs' | 'md' | 'lg' | 'xl';

/**
 * Molecule : panneau latéral (drawer) réutilisable.
 *
 * Affiche un fond semi-transparent et un panneau glissant depuis la droite.
 * Le contenu est projeté via `<ng-content>`. Émet `close` lors d'un clic sur le
 * fond ou d'un appui sur `Échap`.
 *
 * @example
 * <ui-side-panel [open]="isOpen()" (close)="isOpen.set(false)">
 *   <p>Contenu du panneau</p>
 * </ui-side-panel>
 */
@Component({
  selector: 'ui-side-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 flex justify-end">
        <div
          class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          (click)="close.emit()"
          aria-hidden="true"
        ></div>
        <aside
          [class]="panelClasses()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="ariaLabel() || null"
        >
          <ng-content />
        </aside>
      </div>
    }
  `,
})
export class SidePanelComponent {
  /** Ouvre ou ferme le panneau. */
  readonly open = input(false, { transform: booleanAttribute });
  /** Libellé accessible du panneau (aria-label). */
  readonly ariaLabel = input<string>();
  /** Taille (largeur) du panneau. */
  readonly size = input<SidePanelSize>('xl');

  /** Émis lors d'une demande de fermeture (fond ou touche Échap). */
  readonly close = output<void>();

  private readonly widths: Record<SidePanelSize, string> = {
    xs: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
  };

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.close.emit();
    }
  }

  protected panelClasses(): string {
    return `relative z-50 h-full w-full ${this.widths[this.size()]} overflow-hidden bg-slate-50 shadow-xl`;
  }
}
