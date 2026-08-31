import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { PositionedAidStation } from '../../../core/models';
import { routePointKindColor } from '../../../core/utils/route-point.util';
import {
  faFlagCheckered,
  faLocationDot,
  faMountainSun,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Molecule : repère d'un point de passage (ravitaillement, checkpoint, sommet,
 * point personnalisé) sur la timeline du plan.
 *
 * Purement présentationnel : une ligne horizontale traverse la piste au niveau
 * du temps estimé du point, accompagnée d'une pastille cliquable (nom +
 * distance) ancrée à droite, colorée selon le type. La ligne ne capte pas le
 * pointeur ; seule la pastille est interactive.
 */
@Component({
  selector: 'ui-plan-aid-station-marker',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none absolute inset-x-0 z-20 -translate-y-1/2"
      [style.top.px]="marker().top"
    >
      <div class="relative flex items-center">
        <div class="h-px flex-1 border-t border-dashed" [style.border-color]="color()"></div>
        <button
          type="button"
          class="pointer-events-auto ml-1 inline-flex max-w-[70%] items-center gap-1.5 rounded-full border bg-white py-0.5 pl-2 pr-2.5 text-[11px] font-medium shadow-sm transition-colors hover:brightness-95"
          [style.color]="color()"
          [style.border-color]="color()"
          (click)="select.emit(marker().id)"
          [title]="tooltip()"
        >
          <ui-icon [icon]="icon()" size="sm" class="shrink-0" [style.color]="color()" />
          <span class="truncate">{{ marker().name }}</span>
          @if (distanceLabel(); as km) {
            <span class="shrink-0 tabular-nums opacity-70">· {{ km }}</span>
          }
          @if (marker().consumptionCount > 0) {
            <span
              class="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[10px] font-semibold text-white"
              [style.background]="color()"
            >
              <ui-icon [icon]="faUtensils" size="xs" />
              {{ marker().consumptionCount }}
            </span>
          }
        </button>
      </div>
    </div>
  `,
})
export class PlanAidStationMarkerComponent {
  /** Point de passage positionné à afficher. */
  readonly marker = input.required<PositionedAidStation>();

  /** Émis au clic sur la pastille (identifiant du point). */
  readonly select = output<string>();

  protected readonly faUtensils = faUtensils;

  /** Couleur selon le type de point. */
  protected readonly color = computed(() => routePointKindColor(this.marker().kind));

  /** Icône selon le type de point. */
  protected readonly icon = computed(() => {
    switch (this.marker().kind) {
      case 'CHECKPOINT':
        return faFlagCheckered;
      case 'SUMMIT':
        return faMountainSun;
      default:
        return faLocationDot;
    }
  });

  /** Libellé de distance depuis le départ, si renseignée. */
  protected readonly distanceLabel = computed(() => {
    const km = this.marker().distanceFromStart;
    return km != null ? `km ${km}` : null;
  });

  /** Infobulle détaillée (nom + distance). */
  protected readonly tooltip = computed(() => {
    const km = this.distanceLabel();
    return km ? `${this.marker().name} — ${km}` : this.marker().name;
  });
}

