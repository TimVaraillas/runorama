import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CdkDragHandle, CdkDragPreview } from '@angular/cdk/drag-drop';
import { faAppleWhole, faDroplet, faXmark } from '@fortawesome/free-solid-svg-icons';
import { IconComponent } from '../../atoms/icon/icon.component';
import { PlanResizeHandleComponent } from '../../atoms/plan-resize-handle/plan-resize-handle.component';
import type { PositionedIntake, ResizeStartEvent } from '../../../core/models';
import { formatMinutes } from '../../../core/utils/plan-layout.util';
import { isWaterProduct } from '../../../core/utils/water.util';

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
    <span [class]="accentClass()"></span>

    <!-- Poignée de redimensionnement (haut) -->
    <ui-plan-resize-handle
      edge="top"
      (grab)="resizeStart.emit({ event: $event, edge: 'top' })"
    />

    <!-- Corps déplaçable -->
    <div
      cdkDragHandle
      class="flex h-full cursor-grab flex-col justify-center py-2.5 pl-3 pr-1.5 active:cursor-grabbing"
    >
      <div class="flex items-center gap-1.5">
        <div [class]="iconWrapClass()">
          @if (intake().product.image) {
            <img
              [src]="intake().product.image"
              [alt]="intake().product.name"
              class="h-full w-full object-cover"
            />
          } @else {
            <ui-icon [icon]="isWater() ? faDroplet : faAppleWhole" size="xs" />
          }
        </div>
        <p [class]="nameClass()">
          {{ intake().product.name }}
        </p>
      </div>

      @if (intake().height >= 52) {
        <span [class]="timeClass()">
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

    <div *cdkDragPreview [class]="previewClass()">
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
  protected readonly faDroplet = faDroplet;
  protected readonly faXmark = faXmark;
  protected readonly formatMinutes = formatMinutes;

  /** Vrai si la prise correspond au produit virtuel « Eau ». */
  protected readonly isWater = computed(() => isWaterProduct(this.intake().product));

  protected readonly hostClass = computed(() => {
    const base =
      'group absolute inset-0 overflow-hidden rounded-xl shadow-md transition-[opacity,background-color,box-shadow]';
    if (this.isWater()) {
      const water = `${base} shadow-sky-200/40`;
      if (this.intake().overlapped) return `${water} bg-sky-100 ring-2 ring-sky-400`;
      return this.dragging()
        ? `${water} bg-sky-100/80 opacity-80 shadow-lg`
        : `${water} bg-sky-50`;
    }
    const other = `${base} shadow-secondary-200/40`;
    if (this.intake().overlapped) {
      return `${other} bg-secondary-100 ring-2 ring-secondary-400`;
    }
    return this.dragging()
      ? `${other} bg-secondary-100/80 opacity-80 shadow-lg`
      : `${other} bg-secondary-50`;
  });

  /** Liseré d'identité latéral (bleu pour l'eau). */
  protected readonly accentClass = computed(() => {
    const base = 'absolute inset-y-0 left-0 w-1';
    return this.isWater() ? `${base} bg-sky-500` : `${base} bg-secondary-500`;
  });

  /** Vignette de l'icône / image du produit. */
  protected readonly iconWrapClass = computed(() => {
    const base = 'grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md bg-white';
    return this.isWater() ? `${base} text-sky-500` : `${base} text-secondary-400`;
  });

  /** Libellé du nom du produit. */
  protected readonly nameClass = computed(() => {
    const base = 'min-w-0 flex-1 truncate text-xs font-semibold';
    return this.isWater() ? `${base} text-sky-800` : `${base} text-secondary-800`;
  });

  /** Plage horaire de la prise. */
  protected readonly timeClass = computed(() => {
    const base = 'mt-auto text-[11px] font-medium tabular-nums';
    return this.isWater() ? `${base} text-sky-600` : `${base} text-secondary-600`;
  });

  /** Aperçu affiché pendant le glisser-déposer. */
  protected readonly previewClass = computed(() => {
    const base = 'rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-lg';
    return this.isWater()
      ? `${base} border-sky-400 bg-sky-100 text-sky-800`
      : `${base} border-secondary-400 bg-secondary-100 text-secondary-800`;
  });
}
