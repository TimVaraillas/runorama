import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import type { AidStation } from '../../../core/models';
import { AID_STATION_TYPES } from '../../../core/models';
import { computeAidStationViews, type AidStationView } from '../../../core/utils/aid-station.util';
import { faLocationDot, faNoteSticky, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : liste des ravitaillements d'un évènement sous forme de tableau.
 *
 * Affiche les positions absolues (source de vérité) ainsi que le segment
 * calculé relatif au ravitaillement précédent. Chaque ligne est cliquable pour
 * ouvrir l'édition du ravitaillement.
 */
@Component({
  selector: 'ui-aid-station-table',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (views().length === 0) {
      <div
        class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
      >
        <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
          <ui-icon [icon]="faLocationDot" size="xl" />
        </div>
        <p class="text-slate-600">Aucun ravitaillement pour le moment.</p>
        <p class="text-sm text-slate-400">
          Ajoutez vos points de ravitaillement pour construire votre roadbook.
        </p>
      </div>
    } @else {
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 font-medium">Ravitaillement</th>
              <th class="px-4 py-3 text-right font-medium">Km</th>
              <th class="px-4 py-3 text-right font-medium">D+</th>
              <th class="px-4 py-3 text-right font-medium">Temps</th>
              <th class="px-4 py-3 font-medium">Segment</th>
              <th class="px-4 py-3 font-medium">Type</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (view of views(); track view.station.id) {
              <tr
                class="cursor-pointer align-top transition-colors hover:bg-slate-50"
                (click)="select.emit(view.station)"
              >
                <td class="min-w-48 max-w-72 px-4 py-3">
                  <div class="flex items-start gap-2">
                    <span
                      class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
                    >
                      {{ view.order }}
                    </span>
                    <div class="min-w-0">
                      <div class="truncate font-bold text-slate-900">{{ view.station.name }}</div>
                      @if (view.station.note) {
                        <div class="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <ui-icon [icon]="faNoteSticky" size="xs" />
                          <span class="truncate">{{ view.station.note }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                  @if (view.station.distanceFromStart != null) {
                    {{ view.station.distanceFromStart }} km
                  } @else {
                    <span class="text-slate-300">—</span>
                  }
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                  @if (view.station.elevationGainFromStart != null) {
                    {{ view.station.elevationGainFromStart }} m
                  } @else {
                    <span class="text-slate-300">—</span>
                  }
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                  {{ formatTime(view.station.estimatedDurationFromStart) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {{ segmentLabel(view) }}
                </td>
                <td class="px-4 py-3">
                  @if (view.station.types.length) {
                    <div class="flex flex-wrap gap-1">
                      @for (type of view.station.types; track type) {
                        <ui-badge [tone]="typeTone(type)">{{ typeLabel(type) }}</ui-badge>
                      }
                    </div>
                  } @else {
                    <span class="text-slate-300">—</span>
                  }
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                      (click)="edit.emit(view.station); $event.stopPropagation()"
                      aria-label="Modifier le ravitaillement"
                    >
                      <ui-icon [icon]="faPen" size="sm" />
                    </button>
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      (click)="delete.emit(view.station); $event.stopPropagation()"
                      aria-label="Supprimer le ravitaillement"
                    >
                      <ui-icon [icon]="faTrash" size="sm" />
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AidStationTableComponent {
  /** Ravitaillements à afficher (triés et enrichis en interne). */
  readonly stations = input<AidStation[]>([]);

  readonly select = output<AidStation>();
  readonly edit = output<AidStation>();
  readonly delete = output<AidStation>();

  protected readonly faLocationDot = faLocationDot;
  protected readonly faNoteSticky = faNoteSticky;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;

  /** Vue ordonnée et enrichie (rang + segment calculé). */
  protected readonly views = computed(() => computeAidStationViews(this.stations()));

  /** Libellé du type de ravitaillement. */
  protected typeLabel(type: AidStation['types'][number]): string {
    return AID_STATION_TYPES.find((meta) => meta.key === type)?.label ?? type;
  }

  /** Tonalité de badge du type de ravitaillement. */
  protected typeTone(type: AidStation['types'][number]) {
    return AID_STATION_TYPES.find((meta) => meta.key === type)?.tone ?? 'neutral';
  }

  /** Formate un temps en minutes vers `Xh YY`. */
  protected formatTime(total: number): string {
    const hours = Math.floor(total / 60);
    const minutes = Math.round(total % 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }

  /** Décrit le segment relatif au ravitaillement précédent (delta km / D+ / durée). */
  protected segmentLabel(view: AidStationView): string {
    const parts: string[] = [];
    if (view.segment.distance != null) parts.push(`${view.segment.distance.toFixed(1)} km`);
    if (view.segment.elevationGain != null) parts.push(`+${Math.round(view.segment.elevationGain)} m`);
    parts.push(this.formatTime(view.segment.durationMinutes));
    return parts.join(' · ');
  }
}
