import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { ModalComponent } from '../modal/modal.component';
import type { GpxDiscrepancies, RaceStrategy } from '../../../core/models';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

/** Ligne d'écart affichée dans la modale. */
interface DiscrepancyRow {
  key: 'distance' | 'elevationGain' | 'elevationLoss';
  label: string;
  unit: string;
  event: number;
  gpx: number;
  deltaPct: number;
}

/** Seuil (%) au-delà duquel un écart est considéré comme significatif. */
const SIGNIFICANT_THRESHOLD_PCT = 2;

/**
 * Molecule : modale de **réconciliation** entre les données saisies dans
 * l'évènement et celles calculées à partir du GPX (distance, D+, D-).
 *
 * Conforme au principe « ne jamais modifier silencieusement les données de
 * l'utilisateur » : les écarts sont présentés, et l'utilisateur choisit
 * explicitement les valeurs à mettre à jour. Rien n'est appliqué sans
 * confirmation.
 */
@Component({
  selector: 'ui-gpx-reconciliation-modal',
  standalone: true,
  imports: [ButtonComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal [open]="open()" title="Écarts avec le fichier GPX" (close)="close.emit()">
      <p class="text-sm text-slate-600">
        Le GPX importé diffère des informations de l'évènement. Sélectionnez les valeurs à mettre à
        jour — vos données ne seront modifiées que si vous le confirmez.
      </p>

      <ul class="mt-4 space-y-2">
        @for (row of rows(); track row.key) {
          <li class="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <label class="flex items-start gap-3">
              <input
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                [checked]="isChecked(row.key)"
                (change)="toggle(row.key)"
              />
              <span class="flex-1">
                <span class="block text-sm font-medium text-slate-800">{{ row.label }}</span>
                <span class="mt-0.5 block text-xs tabular-nums text-slate-600">
                  Évènement : {{ row.event }} {{ row.unit }} → GPX :
                  <strong class="text-slate-900">{{ row.gpx }} {{ row.unit }}</strong>
                  <span class="ml-1 text-amber-600">({{ formatDelta(row.deltaPct) }})</span>
                </span>
              </span>
            </label>
          </li>
        }
      </ul>

      <div modalFooter class="flex items-center justify-end gap-3">
        <ui-button color="default" variant="ghost" (clicked)="close.emit()">
          Conserver mes valeurs
        </ui-button>
        <ui-button
          color="primary"
          [icon]="faTriangleExclamation"
          [disabled]="selected().size === 0"
          (clicked)="apply()"
        >
          Mettre à jour ({{ selected().size }})
        </ui-button>
      </div>
    </ui-modal>
  `,
})
export class GpxReconciliationModalComponent {
  /** Ouvre ou ferme la modale. */
  readonly open = input(false);
  /** Écarts détectés à l'import. */
  readonly discrepancies = input<GpxDiscrepancies | null>(null);

  /** Émis avec le patch d'évènement à appliquer (valeurs choisies). */
  readonly confirm = output<Partial<RaceStrategy>>();
  /** Émis lorsque l'utilisateur conserve ses valeurs / ferme la modale. */
  readonly close = output<void>();

  protected readonly faTriangleExclamation = faTriangleExclamation;

  /** Clés cochées (à mettre à jour). */
  protected readonly selected = signal<Set<DiscrepancyRow['key']>>(new Set());

  /** Lignes d'écart significatives à présenter. */
  protected readonly rows = computed<DiscrepancyRow[]>(() => {
    const d = this.discrepancies();
    if (!d) {
      return [];
    }
    const rows: DiscrepancyRow[] = [];
    if (this.isSignificant(d.distance)) {
      rows.push({ key: 'distance', label: 'Distance', unit: 'km', ...pick(d.distance!) });
    }
    if (this.isSignificant(d.elevationGain)) {
      rows.push({
        key: 'elevationGain',
        label: 'Dénivelé positif (D+)',
        unit: 'm',
        ...pick(d.elevationGain!),
      });
    }
    if (this.isSignificant(d.elevationLoss)) {
      rows.push({
        key: 'elevationLoss',
        label: 'Dénivelé négatif (D-)',
        unit: 'm',
        ...pick(d.elevationLoss!),
      });
    }
    return rows;
  });

  constructor() {
    // À chaque ouverture, coche par défaut tous les écarts significatifs.
    effect(() => {
      if (this.open()) {
        this.selected.set(new Set(this.rows().map((r) => r.key)));
      }
    });
  }

  protected isChecked(key: DiscrepancyRow['key']): boolean {
    return this.selected().has(key);
  }

  protected toggle(key: DiscrepancyRow['key']): void {
    const next = new Set(this.selected());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.selected.set(next);
  }

  protected apply(): void {
    const patch: Partial<RaceStrategy> = {};
    for (const row of this.rows()) {
      if (this.selected().has(row.key)) {
        patch[row.key] = row.gpx;
      }
    }
    this.confirm.emit(patch);
  }

  protected formatDelta(deltaPct: number): string {
    const sign = deltaPct > 0 ? '+' : '';
    return `${sign}${deltaPct}%`;
  }

  private isSignificant(d: GpxDiscrepancies['distance']): boolean {
    return d != null && Math.abs(d.deltaPct) >= SIGNIFICANT_THRESHOLD_PCT;
  }
}

/** Extrait les champs communs (event/gpx/deltaPct) d'un écart. */
function pick(d: { event: number; gpx: number; deltaPct: number }) {
  return { event: d.event, gpx: d.gpx, deltaPct: d.deltaPct };
}
