import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SidePanelComponent } from '../../molecules/side-panel/side-panel.component';
import type { RoutePointKind, RouteWaypoint } from '../../../core/models';
import { faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';

/** Type d'un waypoint (hors ravitaillement). */
type WaypointKind = Exclude<RoutePointKind, 'AID_STATION'>;

/**
 * Organism : panneau latéral d'édition d'un **point de passage** (checkpoint,
 * sommet, point personnalisé). Même ergonomie (slide panel) que le ravitaillement,
 * mais léger : uniquement nom, type et position — ni logistique ni nutrition.
 */
@Component({
  selector: 'ui-waypoint-form-panel',
  standalone: true,
  imports: [ButtonComponent, IconComponent, SidePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-side-panel [open]="open()" [ariaLabel]="'Point de passage'" (close)="close.emit()">
      @if (open()) {
        <div class="flex h-full flex-col">
          <div
            class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4"
          >
            <h2 class="font-display text-lg font-bold text-slate-900">Point de passage</h2>
            <button
              type="button"
              class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              (click)="close.emit()"
              aria-label="Fermer"
            >
              <ui-icon [icon]="faXmark" size="lg" />
            </button>
          </div>

          <div class="flex-1 space-y-5 overflow-y-auto p-6">
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

            <div>
              <span class="mb-1 block text-sm font-medium text-slate-700">Type</span>
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

            @if (waypoint(); as w) {
              <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span class="tabular-nums">
                  @if (w.distanceFromStart != null) {
                    km {{ round(w.distanceFromStart) }}
                  }
                  @if (w.altitude != null) {
                    · {{ round(w.altitude) }} m
                  }
                  @if (w.elevationGainFromStart != null) {
                    · D+ {{ round(w.elevationGainFromStart) }} m
                  }
                </span>
              </div>
            }
          </div>

          <div
            class="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4"
          >
            <ui-button color="danger" variant="ghost" [icon]="faTrash" (clicked)="delete.emit()">
              Supprimer
            </ui-button>
            <div class="flex items-center gap-3">
              <ui-button color="default" variant="ghost" (clicked)="close.emit()">Annuler</ui-button>
              <ui-button color="primary" [disabled]="!name().trim()" (clicked)="onSave()">
                Enregistrer
              </ui-button>
            </div>
          </div>
        </div>
      }
    </ui-side-panel>
  `,
})
export class WaypointFormPanelComponent {
  /** Ouvre ou ferme le panneau. */
  readonly open = input(false);
  /** Point de passage en cours d'édition. */
  readonly waypoint = input<RouteWaypoint | null>(null);

  /** Émis avec les champs modifiés (nom, type). */
  readonly save = output<{ name: string; kind: WaypointKind }>();
  /** Émis pour supprimer le point. */
  readonly delete = output<void>();
  /** Émis à la fermeture/annulation. */
  readonly close = output<void>();

  protected readonly faTrash = faTrash;
  protected readonly faXmark = faXmark;

  protected readonly name = signal('');
  protected readonly kind = signal<WaypointKind>('CHECKPOINT');

  protected readonly kindOptions: ReadonlyArray<{
    kind: WaypointKind;
    label: string;
    color: string;
  }> = [
    { kind: 'CHECKPOINT', label: 'Checkpoint', color: '#0ea5e9' },
    { kind: 'SUMMIT', label: 'Sommet', color: '#f59e0b' },
    { kind: 'CUSTOM', label: 'Point personnalisé', color: '#a855f7' },
  ];

  constructor() {
    // Synchronise les champs à chaque ouverture / changement de point.
    effect(() => {
      const w = this.waypoint();
      if (this.open() && w) {
        this.name.set(w.name);
        this.kind.set(w.kind);
      }
    });
  }

  protected round(value: number): number {
    return Math.round(value);
  }

  protected onSave(): void {
    this.save.emit({ name: this.name().trim(), kind: this.kind() });
  }
}
