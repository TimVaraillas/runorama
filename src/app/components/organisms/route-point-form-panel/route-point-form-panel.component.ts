import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SidePanelComponent } from '../../molecules/side-panel/side-panel.component';
import { AidStationFormComponent } from '../aid-station-form/aid-station-form.component';
import type { AidStation, NutritionProduct, RaceStrategyItem, RoutePointKind } from '../../../core/models';
import { faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'ui-route-point-form-panel',
  standalone: true,
  imports: [ButtonComponent, IconComponent, SidePanelComponent, AidStationFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-side-panel [open]="open()" [ariaLabel]="heading()" (close)="close.emit()">
      @if (open()) {
        <div class="flex h-full flex-col">
          <div class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 class="font-display text-lg font-bold text-slate-900">{{ heading() }}</h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="close.emit()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <div class="mb-5 space-y-2">
              <span class="block text-sm font-medium text-slate-700">Type de point</span>
              <div class="flex flex-wrap gap-2">
                @for (option of kindOptions; track option.kind) {
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                    [class.bg-white]="kind() !== option.kind"
                    [class.text-slate-600]="kind() !== option.kind"
                    [style.background]="kind() === option.kind ? option.color : null"
                    [style.border-color]="option.color"
                    [style.color]="kind() === option.kind ? '#fff' : null"
                    (click)="kind.set(option.kind)"
                  >
                    <span
                      class="h-2 w-2 rounded-full"
                      [style.background]="kind() === option.kind ? '#fff' : option.color"
                    ></span>
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>

            @if (kind() === 'AID_STATION') {
              <ui-aid-station-form
                [station]="station()"
                [products]="products()"
                [inventoryItems]="inventoryItems()"
                [pickupElsewhere]="pickupElsewhere()"
                (save)="aidStationSave.emit($event)"
                (cancel)="close.emit()"
              />
            } @else {
              <form class="space-y-5" (submit)="saveWaypoint($event)">
                <label class="block">
                  <span class="mb-1 block text-sm font-medium text-slate-700">Nom</span>
                  <input
                    type="text"
                    class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    [value]="name()"
                    (input)="name.set($any($event.target).value)"
                    placeholder="Nom du point"
                  />
                </label>
                <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Position sur le parcours : <span class="tabular-nums">km {{ distance() }}</span>
                </div>
                <div class="flex justify-end gap-3">
                  <button type="button" class="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" (click)="close.emit()">
                    Annuler
                  </button>
                  <button
                    type="submit"
                    class="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                    [disabled]="!name().trim()"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            }
          </div>
          @if (canDelete()) {
            <div class="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <ui-button color="danger" variant="ghost" [icon]="faTrash" (clicked)="delete.emit()">
                Supprimer
              </ui-button>
            </div>
          }
        </div>
      }
    </ui-side-panel>
  `,
})
export class RoutePointFormPanelComponent {
  readonly open = input(false);
  readonly distance = input(0);
  readonly station = input<AidStation | null>(null);
  readonly initialKind = input<RoutePointKind>('AID_STATION');
  readonly canDelete = input(false);
  readonly products = input<NutritionProduct[]>([]);
  readonly inventoryItems = input<RaceStrategyItem[]>([]);
  readonly pickupElsewhere = input<Record<string, number>>({});

  readonly aidStationSave = output<Partial<AidStation>>();
  readonly waypointSave = output<{ name: string; kind: Exclude<RoutePointKind, 'AID_STATION'> }>();
  readonly delete = output<void>();
  readonly close = output<void>();

  protected readonly faXmark = faXmark;
  protected readonly faTrash = faTrash;
  protected readonly kind = signal<RoutePointKind>('AID_STATION');
  protected readonly name = signal('');
  protected readonly kindOptions = [
    { kind: 'AID_STATION' as const, label: 'Ravitaillement', color: '#6366f1' },
    { kind: 'CHECKPOINT' as const, label: 'Checkpoint', color: '#0ea5e9' },
    { kind: 'SUMMIT' as const, label: 'Sommet', color: '#f59e0b' },
    { kind: 'CUSTOM' as const, label: 'Point personnalisé', color: '#a855f7' },
  ];

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.kind.set(this.initialKind());
      this.name.set(this.station()?.name ?? '');
    });
  }

  protected heading(): string {
    return this.canDelete() ? 'Modifier le point de passage' : 'Nouveau point de passage';
  }

  protected saveWaypoint(event: Event): void {
    event.preventDefault();
    const kind = this.kind();
    if (!this.name().trim() || kind === 'AID_STATION') return;
    this.waypointSave.emit({ name: this.name().trim(), kind: kind as Exclude<RoutePointKind, 'AID_STATION'> });
  }
}
