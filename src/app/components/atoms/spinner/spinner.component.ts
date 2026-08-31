import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Atom : indicateur de chargement circulaire (spinner). Purement présentationnel.
 */
@Component({
  selector: 'ui-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block animate-spin rounded-full border-slate-200 border-t-brand-600"
      role="status"
      [attr.aria-label]="label()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.border-width.px]="thickness()"
    ></span>
  `,
})
export class SpinnerComponent {
  /** Diamètre du spinner (px). */
  readonly size = input(24);
  /** Épaisseur du trait (px). */
  readonly thickness = input(3);
  /** Libellé accessible. */
  readonly label = input('Chargement');
}
