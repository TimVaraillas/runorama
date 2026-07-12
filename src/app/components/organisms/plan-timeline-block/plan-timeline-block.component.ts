import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDragHandle, CdkDragPreview } from '@angular/cdk/drag-drop';
import { faAppleWhole, faXmark } from '@fortawesome/free-solid-svg-icons';
import { IconComponent } from '../../atoms/icon/icon.component';
import { PlanResizeHandleComponent } from '../../atoms/plan-resize-handle/plan-resize-handle.component';
import type { PositionedIntake, ResizeStartEvent } from '../../../core/models';
import { formatMinutes } from '../../../core/utils/plan-layout.util';

/**
 * Organism : bloc d'une prise placée sur la timeline.
 *
 * Le glisser-déposer (`cdkDrag`) est piloté par le parent, appliqué sur l'hôte
 * de ce composant. Le bloc gère sa présentation (vignette, plage horaire),
 * ses poignées de redimensionnement et son bouton de suppression discret.
 */
@Component({
  selector: 'ui-plan-timeline-block',
  standalone: true,
  imports: [IconComponent, CdkDragHandle, CdkDragPreview, PlanResizeHandleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      /* Pendant un déplacement, on masque le bloc à sa position d'origine :
         seul le fantôme (piloté par le parent) indique l'emplacement cible. */
      :host.cdk-drag-placeholder {
        opacity: 0;
      }
    `,
  ],
  host: {
    '[class]': 'hostClass()',
  },
  template: `
    <!-- Liseré d'identité -->
    <span class="absolute inset-y-0 left-0 w-1 bg-secondary-500"></span>

    <!-- Poignée de redimensionnement (haut) -->
    <ui-plan-resize-handle
      edge="top"
      (grab)="resizeStart.emit({ event: $event, edge: 'top' })"
    />

    <!-- Corps déplaçable -->
    <div
      cdkDragHandle
      class="flex h-full cursor-grab flex-col py-2.5 pl-3 pr-1.5 active:cursor-grabbing"
    >
      <div class="flex items-center gap-1.5">
        <div
          class="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md bg-white text-secondary-400"
        >
          @if (intake().product.image) {
            <img
              [src]="intake().product.image"
              [alt]="intake().product.name"
              class="h-full w-full object-cover"
            />
          } @else {
            <ui-icon [icon]="faAppleWhole" size="xs" />
          }
        </div>
        <p class="min-w-0 flex-1 truncate text-xs font-semibold text-secondary-800">
          {{ intake().product.name }}
        </p>
      </div>

      @if (intake().height >= 52) {
        <span class="mt-auto text-[11px] font-medium tabular-nums text-secondary-600">
          {{ formatMinutes(intake().startMinute) }}–{{ formatMinutes(intake().endMinute) }}
        </span>
      }
    </div>

    <!-- Bouton de suppression discret (au survol) -->
    <button
      type="button"
      class="absolute right-1.5 top-1.5 z-30 grid h-4 w-4 cursor-pointer place-items-center rounded-full text-secondary-300 opacity-0 transition-opacity hover:text-secondary-500 focus-visible:opacity-100 group-hover:opacity-100"
      (pointerdown)="$event.stopPropagation()"
      (click)="remove.emit()"
      [attr.aria-label]="'Retirer ' + intake().product.name + ' du planning'"
    >
      <ui-icon [icon]="faXmark" size="xs" />
    </button>

    <!-- Poignée de redimensionnement (bas) -->
    <ui-plan-resize-handle
      edge="bottom"
      (grab)="resizeStart.emit({ event: $event, edge: 'bottom' })"
    />

    <div
      *cdkDragPreview
      class="rounded-lg border border-secondary-400 bg-secondary-100 px-3 py-1.5 text-xs font-semibold text-secondary-800 shadow-lg"
    >
      {{ intake().product.name }}
    </div>
  `,
})
export class PlanTimelineBlockComponent {
  /** Prise positionnée représentée par ce bloc. */
  readonly intake = input.required<PositionedIntake>();
  /** Vrai pendant qu'un élément est glissé (indice visuel d'empilement). */
  readonly dragging = input(false);

  /** Émis pour retirer la prise du planning. */
  readonly remove = output<void>();
  /** Émis quand une poignée de redimensionnement est saisie. */
  readonly resizeStart = output<ResizeStartEvent>();

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faXmark = faXmark;
  protected readonly formatMinutes = formatMinutes;

  protected readonly hostClass = computed(() => {
    const base =
      'group absolute inset-0 overflow-hidden rounded-xl shadow-md shadow-secondary-200/40 transition-[opacity,background-color,box-shadow]';
    if (this.intake().overlapped) {
      return `${base} bg-secondary-100 ring-2 ring-secondary-400`;
    }
    return this.dragging()
      ? `${base} bg-secondary-100/80 opacity-80 shadow-lg`
      : `${base} bg-secondary-50`;
  });
}
