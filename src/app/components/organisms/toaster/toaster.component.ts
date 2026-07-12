import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { ToastService, type ToastType } from '../../../core/services/toast.service';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : conteneur d'affichage des toasts.
 *
 * S'abonne au `ToastService` et empile les notifications en haut à droite de
 * l'écran. À monter une seule fois, généralement dans la mise en page racine.
 */
@Component({
  selector: 'ui-toaster',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 top-20 z-100 flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 p-3 shadow-xl"
          [class]="containerClass(toast.type)"
          role="status"
        >
          <ui-icon [icon]="iconFor(toast.type)" [class]="iconClass(toast.type)" />
          <div class="min-w-0 flex-1">
            @if (toast.title) {
              <p class="text-sm font-semibold">{{ toast.title }}</p>
            }
            <p class="text-sm">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="grid h-6 w-6 shrink-0 place-items-center rounded-md opacity-60 transition-opacity hover:opacity-100"
            (click)="dismiss(toast.id)"
            aria-label="Fermer la notification"
          >
            <ui-icon [icon]="faXmark" size="sm" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToasterComponent {
  private readonly service = inject(ToastService);

  protected readonly toasts = this.service.toasts;
  protected readonly faXmark = faXmark;

  protected dismiss(id: number): void {
    this.service.dismiss(id);
  }

  protected iconFor(type: ToastType): IconDefinition {
    switch (type) {
      case 'success':
        return faCircleCheck;
      case 'error':
        return faCircleExclamation;
      case 'warning':
        return faTriangleExclamation;
      default:
        return faCircleInfo;
    }
  }

  protected containerClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'border-emerald-500 bg-emerald-50 text-emerald-800';
      case 'error':
        return 'border-rose-500 bg-rose-50 text-rose-800';
      case 'warning':
        return 'border-amber-500 bg-amber-50 text-amber-800';
      default:
        return 'border-sky-500 bg-sky-50 text-sky-800';
    }
  }

  protected iconClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'text-emerald-500';
      case 'error':
        return 'text-rose-500';
      case 'warning':
        return 'text-amber-500';
      default:
        return 'text-sky-500';
    }
  }
}
