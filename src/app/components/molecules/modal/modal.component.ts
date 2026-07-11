import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  booleanAttribute,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

/** Tailles disponibles pour la modale. */
export type ModalSize = 'sm' | 'md' | 'lg';

/**
 * Molecule : fenêtre modale (dialog) réutilisable et centrée.
 *
 * Affiche un fond semi-transparent et une boîte centrée. Le contenu est projeté
 * via `<ng-content>` ; un pied de page optionnel via `<ng-content select="[modalFooter]">`.
 * Émet `close` lors d'un clic sur le fond, d'un appui sur `Échap` ou du bouton de fermeture.
 *
 * @example
 * <ui-modal [open]="isOpen()" title="Confirmer" (close)="isOpen.set(false)">
 *   <p>Contenu…</p>
 *   <div modalFooter>
 *     <ui-button variant="ghost" (clicked)="isOpen.set(false)">Annuler</ui-button>
 *   </div>
 * </ui-modal>
 */
@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          (click)="close.emit()"
          aria-hidden="true"
        ></div>
        <div
          [class]="dialogClasses()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="!title() ? ariaLabel() || null : null"
          [attr.aria-labelledby]="title() ? 'ui-modal-title' : null"
        >
          @if (title() || dismissible()) {
            <div class="flex items-start justify-between gap-4 px-6 pt-5">
              @if (title()) {
                <h2 id="ui-modal-title" class="font-display text-lg font-bold text-slate-900">
                  {{ title() }}
                </h2>
              }
              @if (dismissible()) {
                <button
                  type="button"
                  class="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  (click)="close.emit()"
                  aria-label="Fermer"
                >
                  <ui-icon [icon]="faXmark" size="lg" />
                </button>
              }
            </div>
          }

          <div class="px-6 py-4 text-sm text-slate-600">
            <ng-content />
          </div>

          <div class="flex items-center justify-end gap-3 px-6 pb-5">
            <ng-content select="[modalFooter]" />
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  /** Ouvre ou ferme la modale. */
  readonly open = input(false, { transform: booleanAttribute });
  /** Titre affiché dans l'en-tête. */
  readonly title = input<string>();
  /** Libellé accessible si aucun titre n'est fourni. */
  readonly ariaLabel = input<string>();
  /** Taille (largeur) de la modale. */
  readonly size = input<ModalSize>('sm');
  /** Affiche le bouton de fermeture et autorise la fermeture au clic/Échap. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** Émis lors d'une demande de fermeture (fond, bouton ou touche Échap). */
  readonly close = output<void>();

  protected readonly faXmark = faXmark;

  private readonly widths: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open() && this.dismissible()) {
      this.close.emit();
    }
  }

  protected dialogClasses(): string {
    return `relative z-10 w-full ${this.widths[this.size()]} overflow-hidden rounded-2xl bg-white shadow-xl`;
  }
}
