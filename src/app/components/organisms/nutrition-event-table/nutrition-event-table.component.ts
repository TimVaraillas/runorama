import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { NutritionEvent } from '../../../core/models';
import {
  faCalendarDay,
  faLocationDot,
  faRoute,
  faArrowTrendUp,
  faStopwatch,
  faBoxOpen,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Organism : affichage d'une liste de stratégies alimentaires sous forme de
 * tableau. Chaque ligne est cliquable pour ouvrir l'inventaire de la stratégie.
 */
@Component({
  selector: 'ui-nutrition-event-table',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 font-medium">Stratégie</th>
            <th class="px-4 py-3 font-medium">Date</th>
            <th class="px-4 py-3 font-medium">Lieu</th>
            <th class="px-4 py-3 text-right font-medium">Distance</th>
            <th class="px-4 py-3 text-right font-medium">D+</th>
            <th class="px-4 py-3 text-right font-medium">Chrono</th>
            <th class="px-4 py-3 text-right font-medium">Produits</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          @for (event of events(); track event.id) {
            <tr
              class="cursor-pointer transition-colors hover:bg-slate-50"
              (click)="select.emit(event)"
            >
              <td class="min-w-48 max-w-64 px-4 py-3">
                <div class="truncate font-bold text-slate-900">{{ event.name }}</div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-slate-700">
                <span class="flex items-center gap-1.5">
                  {{ formatDate(event.date) }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-700">
                @if (event.location) {
                  <span class="flex items-center gap-1.5">
                    {{ event.location }}
                  </span>
                } @else {
                  <span class="text-slate-300">—</span>
                }
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                @if (event.distance != null) {
                  {{ event.distance }} km
                } @else {
                  <span class="text-slate-300">—</span>
                }
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                @if (event.elevationGain != null) {
                  {{ event.elevationGain }} m
                } @else {
                  <span class="text-slate-300">—</span>
                }
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                @if (formatTime(event.targetTimeMinutes); as time) {
                  {{ time }}
                } @else {
                  <span class="text-slate-300">—</span>
                }
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                {{ itemCount(event) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                    (click)="edit.emit(event); $event.stopPropagation()"
                    aria-label="Modifier la stratégie"
                  >
                    <ui-icon [icon]="faPen" size="sm" />
                  </button>
                  <button
                    type="button"
                    class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    (click)="delete.emit(event); $event.stopPropagation()"
                    aria-label="Supprimer la stratégie"
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
  `,
})
export class NutritionEventTableComponent {
  /** Évènements à afficher. */
  readonly events = input<NutritionEvent[]>([]);

  readonly select = output<NutritionEvent>();
  readonly edit = output<NutritionEvent>();
  readonly delete = output<NutritionEvent>();

  protected readonly faCalendarDay = faCalendarDay;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faRoute = faRoute;
  protected readonly faArrowTrendUp = faArrowTrendUp;
  protected readonly faStopwatch = faStopwatch;
  protected readonly faBoxOpen = faBoxOpen;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;

  /** Total d'unités emportées pour un évènement. */
  protected itemCount(event: NutritionEvent): number {
    return event.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /** Formate une date ISO `YYYY-MM-DD` en `JJ/MM/AAAA`. */
  protected formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
  }

  /** Formate un chrono cible en minutes vers `Xh YY` (vide si non défini). */
  protected formatTime(total: number | undefined): string {
    if (!total) return '';
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}`;
  }
}
