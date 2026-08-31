import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import {
  RACE_STRATEGY_CATEGORIES,
  raceStrategyCategoryMeta,
  type RaceStrategy,
} from '../../../core/models';
import {
  faCalendarDay,
  faLocationDot,
  faRoute,
  faArrowTrendUp,
  faStopwatch,
  faBoxOpen,
  faPen,
  faTrash,
  faSort,
  faSortUp,
  faSortDown,
} from '@fortawesome/free-solid-svg-icons';

/** Colonnes triables du tableau des stratégies. */
type SortColumn =
  | 'name'
  | 'category'
  | 'owner'
  | 'date'
  | 'distance'
  | 'elevationGain'
  | 'targetTimeMinutes';
type SortDirection = 'asc' | 'desc';

/**
 * Organism : affichage d'une liste de stratégies alimentaires sous forme de
 * tableau. Chaque ligne est cliquable pour ouvrir l'inventaire de la stratégie.
 */
@Component({
  selector: 'ui-nutrition-event-table',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 font-medium" [attr.aria-sort]="ariaSort('name')">
              <button type="button" class="group flex items-center gap-1.5" (click)="toggleSort('name')">
                Stratégie
                <ui-icon [icon]="sortIcon('name')" size="xs" [class]="sortIconClass('name')" />
              </button>
            </th>
            <th class="px-4 py-3 font-medium" [attr.aria-sort]="ariaSort('category')">
              <button type="button" class="group flex items-center gap-1.5" (click)="toggleSort('category')">
                Étiquette
                <ui-icon [icon]="sortIcon('category')" size="xs" [class]="sortIconClass('category')" />
              </button>
            </th>
            @if (showOwner()) {
              <th class="px-4 py-3 font-medium" [attr.aria-sort]="ariaSort('owner')">
                <button type="button" class="group flex items-center gap-1.5" (click)="toggleSort('owner')">
                  Utilisateur
                  <ui-icon [icon]="sortIcon('owner')" size="xs" [class]="sortIconClass('owner')" />
                </button>
              </th>
            }
            <th class="px-4 py-3 font-medium" [attr.aria-sort]="ariaSort('date')">
              <button type="button" class="group flex items-center gap-1.5" (click)="toggleSort('date')">
                Date
                <ui-icon [icon]="sortIcon('date')" size="xs" [class]="sortIconClass('date')" />
              </button>
            </th>
            <th class="px-4 py-3 text-right font-medium" [attr.aria-sort]="ariaSort('distance')">
              <button type="button" class="group ml-auto flex items-center gap-1.5" (click)="toggleSort('distance')">
                Distance
                <ui-icon [icon]="sortIcon('distance')" size="xs" [class]="sortIconClass('distance')" />
              </button>
            </th>
            <th class="px-4 py-3 text-right font-medium" [attr.aria-sort]="ariaSort('elevationGain')">
              <button type="button" class="group ml-auto flex items-center gap-1.5" (click)="toggleSort('elevationGain')">
                D+
                <ui-icon [icon]="sortIcon('elevationGain')" size="xs" [class]="sortIconClass('elevationGain')" />
              </button>
            </th>
            <th class="px-4 py-3 text-right font-medium" [attr.aria-sort]="ariaSort('targetTimeMinutes')">
              <button type="button" class="group ml-auto flex items-center gap-1.5" (click)="toggleSort('targetTimeMinutes')">
                Chrono
                <ui-icon [icon]="sortIcon('targetTimeMinutes')" size="xs" [class]="sortIconClass('targetTimeMinutes')" />
              </button>
            </th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          @for (event of sortedEvents(); track event.id) {
            <tr
              class="cursor-pointer transition-colors hover:bg-slate-50"
              (click)="select.emit(event)"
            >
              <td class="min-w-48 max-w-64 px-4 py-3">
                <div class="truncate font-bold text-slate-900">{{ event.name }}</div>
              </td>
              <td class="px-4 py-3">
                @if (categoryMeta(event); as meta) {
                  <ui-badge [tone]="meta.tone">{{ meta.label }}</ui-badge>
                } @else {
                  <span class="text-slate-300">—</span>
                }
              </td>
              @if (showOwner()) {
                <td class="px-4 py-3 text-slate-700">
                  @if (event.owner; as owner) {
                    <span class="truncate">{{ owner.firstName }} {{ owner.lastName }}</span>
                  } @else {
                    <span class="text-slate-300">—</span>
                  }
                </td>
              }
              <td class="whitespace-nowrap px-4 py-3 text-slate-700">
                <span class="flex items-center gap-1.5">
                  {{ formatDate(event.date) }}
                </span>
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
  readonly events = input<RaceStrategy[]>([]);
  /** Affiche la colonne « Utilisateur » (propriétaire de la stratégie). */
  readonly showOwner = input(false);

  readonly select = output<RaceStrategy>();
  readonly edit = output<RaceStrategy>();
  readonly delete = output<RaceStrategy>();
  protected readonly faCalendarDay = faCalendarDay;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faRoute = faRoute;
  protected readonly faArrowTrendUp = faArrowTrendUp;
  protected readonly faStopwatch = faStopwatch;
  protected readonly faBoxOpen = faBoxOpen;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;

  /** Colonne de tri active (null = ordre d'origine). */
  protected readonly sortColumn = signal<SortColumn | null>(null);
  /** Sens du tri courant. */
  protected readonly sortDirection = signal<SortDirection>('asc');

  /** Évènements triés selon la colonne et le sens actifs. */
  protected readonly sortedEvents = computed(() => {
    const column = this.sortColumn();
    const list = this.events();
    if (!column) return list;
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = this.sortValue(a, column);
      const vb = this.sortValue(b, column);
      const aEmpty = va == null || va === '';
      const bEmpty = vb == null || vb === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return cmp * dir;
    });
  });

  /** Bascule le tri : active la colonne ou inverse le sens si déjà active. */
  protected toggleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  /** Icône de tri affichée dans l'en-tête d'une colonne. */
  protected sortIcon(column: SortColumn) {
    if (this.sortColumn() !== column) return faSort;
    return this.sortDirection() === 'asc' ? faSortUp : faSortDown;
  }

  /** Classe de l'icône : discrète sauf pour la colonne active. */
  protected sortIconClass(column: SortColumn): string {
    return this.sortColumn() === column
      ? 'text-brand-600'
      : 'text-slate-300 group-hover:text-slate-400';
  }

  /** Valeur `aria-sort` pour l'accessibilité. */
  protected ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  /** Métadonnées d'affichage de l'étiquette d'un évènement. */
  protected categoryMeta(event: RaceStrategy) {
    return raceStrategyCategoryMeta(event.category);
  }

  /** Clé de tri d'un évènement pour une colonne donnée. */
  private sortValue(event: RaceStrategy, column: SortColumn): string | number | undefined {
    switch (column) {
      case 'name':
        return event.name?.toLowerCase();
      case 'category':
        return event.category
          ? RACE_STRATEGY_CATEGORIES.findIndex((meta) => meta.value === event.category)
          : undefined;
      case 'owner':
        return event.owner ? `${event.owner.firstName} ${event.owner.lastName}`.toLowerCase() : undefined;
      case 'date':
        return event.date;
      case 'distance':
        return event.distance;
      case 'elevationGain':
        return event.elevationGain;
      case 'targetTimeMinutes':
        return event.targetTimeMinutes;
    }
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
