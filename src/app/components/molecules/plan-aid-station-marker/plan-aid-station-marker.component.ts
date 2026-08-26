import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { PositionedAidStation } from '../../../core/models';
import { faLocationDot, faUtensils } from '@fortawesome/free-solid-svg-icons';

/**
 * Molecule : repère d'un ravitaillement sur la timeline du plan.
 *
 * Purement présentationnel : une ligne horizontale traverse la piste au niveau
 * du temps estimé du ravitaillement, accompagnée d'une pastille cliquable
 * (nom + distance) ancrée à droite. La ligne ne capte pas le pointeur pour ne
 * pas gêner le glisser-déposer des prises ; seule la pastille est interactive.
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
        <div class="h-px flex-1 border-t border-dashed border-indigo-400/70"></div>
        <button
          type="button"
          class="pointer-events-auto ml-1 inline-flex max-w-[70%] items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 py-0.5 pl-2 pr-2.5 text-[11px] font-medium text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-100"
          (click)="select.emit(marker().id)"
          [title]="tooltip()"
        >
          <ui-icon [icon]="faLocationDot" size="sm" class="shrink-0 text-indigo-500" />
          <span class="truncate">{{ marker().name }}</span>
          @if (distanceLabel(); as km) {
            <span class="shrink-0 tabular-nums text-indigo-400">· {{ km }}</span>
          }
          @if (marker().consumptionCount > 0) {
            <span
              class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold text-white"
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
  /** Ravitaillement positionné à afficher. */
  readonly marker = input.required<PositionedAidStation>();

  /** Émis au clic sur la pastille (identifiant du ravitaillement). */
  readonly select = output<string>();

  protected readonly faLocationDot = faLocationDot;
  protected readonly faUtensils = faUtensils;

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
