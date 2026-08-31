import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { ModalComponent } from '../modal/modal.component';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

/**
 * Molecule : modale de confirmation de suppression par saisie du nom.
 *
 * Pour éviter les suppressions accidentelles, l'utilisateur doit ressaisir
 * exactement le nom de l'élément (`itemName`) avant que le bouton de
 * suppression ne s'active. Le champ est réinitialisé à chaque ouverture.
 *
 * Émet `confirm` lorsque la suppression est validée et `cancel` à la fermeture.
 *
 * @example
 * <ui-confirm-delete-modal
 *   [open]="!!pending()"
 *   [itemName]="pending()?.name ?? ''"
 *   [deleting]="deleting()"
 *   (confirm)="delete()"
 *   (cancel)="pending.set(null)"
 * />
 */
@Component({
  selector: 'ui-confirm-delete-modal',
  standalone: true,
  imports: [ButtonComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal [open]="open()" [title]="title()" (close)="cancel.emit()">
      <p>
        Cette action est irréversible. Pour confirmer la suppression, saisissez le nom
        {{ entityLabel() }}
        <strong class="font-semibold text-slate-900">«&nbsp;{{ itemName() }}&nbsp;»</strong>.
      </p>
      <input
        type="text"
        class="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        [value]="typedName()"
        (input)="typedName.set($any($event.target).value)"
        [attr.placeholder]="placeholder()"
        [attr.aria-label]="placeholder()"
        autocomplete="off"
      />
      <div modalFooter class="flex items-center justify-end gap-3">
        <ui-button color="default" variant="ghost" [disabled]="deleting()" (clicked)="cancel.emit()">
          Annuler
        </ui-button>
        <ui-button
          color="danger"
          [icon]="faTrash"
          [loading]="deleting()"
          [disabled]="!nameMatches() || deleting()"
          (clicked)="confirm.emit()"
        >
          Supprimer
        </ui-button>
      </div>
    </ui-modal>
  `,
})
export class ConfirmDeleteModalComponent {
  /** Ouvre ou ferme la modale. */
  readonly open = input(false);
  /** Nom exact que l'utilisateur doit ressaisir pour confirmer. */
  readonly itemName = input('');
  /** Titre de la modale. */
  readonly title = input('Supprimer');
  /** Complément affiché avant le nom (ex. « de la stratégie »). */
  readonly entityLabel = input('');
  /** Texte indicatif du champ de saisie. */
  readonly placeholder = input('Nom à confirmer');
  /** Suppression en cours (désactive les actions). */
  readonly deleting = input(false);

  /** Émis lorsque la suppression est confirmée (nom correspondant). */
  readonly confirm = output<void>();
  /** Émis lors d'une demande de fermeture/annulation. */
  readonly cancel = output<void>();

  protected readonly faTrash = faTrash;

  /** Nom saisi par l'utilisateur. */
  protected readonly typedName = signal('');
  /** Vrai lorsque le nom saisi correspond exactement à `itemName`. */
  protected readonly nameMatches = computed(
    () => this.typedName().trim() === this.itemName().trim() && this.itemName().trim() !== '',
  );

  constructor() {
    // Réinitialise le champ à chaque ouverture pour repartir d'un état vierge.
    effect(() => {
      if (this.open()) {
        this.typedName.set('');
      }
    });
  }
}
