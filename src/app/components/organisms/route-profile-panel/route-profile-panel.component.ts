import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { ModalComponent } from '../../molecules/modal/modal.component';
import { ElevationProfileComponent } from '../elevation-profile/elevation-profile.component';
import { TrackMapComponent } from '../track-map/track-map.component';
import type { AidStation, GpxTrack, RoutePointMarker } from '../../../core/models';
import { buildRouteMarkers } from '../../../core/utils/route-point.util';
import {
  faArrowUpFromBracket,
  faLocationDot,
  faMountainSun,
  faRoute,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

/** Fichier GPX sélectionné (contenu texte + nom). */
export interface GpxSelection {
  content: string;
  fileName: string;
}

/**
 * Organism : onglet « Parcours » d'une stratégie. Gère l'import d'une trace
 * GPX, l'affichage du **profil altimétrique** et le positionnement automatique
 * des ravitaillements dessus.
 *
 * Purement orchestrateur d'affichage : la lecture du fichier est faite ici
 * (texte), mais le parsing/calcul et le stockage sont délégués au serveur via
 * la page parente.
 */
@Component({
  selector: 'ui-route-profile-panel',
  standalone: true,
  imports: [
    ButtonComponent,
    IconComponent,
    ModalComponent,
    ElevationProfileComponent,
    TrackMapComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (track(); as t) {
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-4 text-sm">
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faRoute" size="sm" class="text-brand-500" />
              <strong class="tabular-nums text-slate-900">{{ formatKm(t.distance) }} km</strong>
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faMountainSun" size="sm" class="text-emerald-500" />
              <strong class="tabular-nums text-slate-900">+{{ round(t.elevationGain) }} m</strong>
              <span class="tabular-nums text-slate-400">/ -{{ round(t.elevationLoss) }} m</span>
            </span>
            <span class="tabular-nums text-slate-500">
              {{ round(t.minAltitude) }}–{{ round(t.maxAltitude) }} m
            </span>
          </div>

          <div class="flex items-center gap-2">
            <ui-button
              [color]="addMode() ? 'primary' : 'default'"
              [variant]="addMode() ? 'full' : 'outlined'"
              size="sm"
              [icon]="faLocationDot"
              [attr.aria-pressed]="addMode()"
              (clicked)="addMode.set(!addMode())"
            >
              {{ addMode() ? 'Terminer' : 'Ajouter un ravitaillement' }}
            </ui-button>
            <ui-button
              color="danger"
              variant="ghost"
              size="sm"
              [icon]="faTrash"
              [disabled]="uploading()"
              (clicked)="confirmRemoveOpen.set(true)"
            >
              Retirer la trace GPX
            </ui-button>
          </div>
        </div>

        @if (addMode()) {
          <div
            class="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700"
          >
            <ui-icon [icon]="faLocationDot" size="sm" />
            Cliquez sur le profil ou le tracé pour positionner un ravitaillement. Glissez un repère
            existant pour l'ajuster.
          </div>
        }

        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Profil</p>
          <ui-elevation-profile
            [track]="t"
            [markers]="markers()"
            [addMode]="addMode()"
            (select)="selectAidStation.emit($event)"
            (addAt)="addAidStationAt.emit($event)"
            (moveMarker)="moveAidStation.emit($event)"
          />
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Tracé</p>
          <ui-track-map
            [track]="t"
            [markers]="markers()"
            [addMode]="addMode()"
            (select)="selectAidStation.emit($event)"
            (addAt)="addAidStationAt.emit($event)"
            (moveMarker)="moveAidStation.emit($event)"
          />
        </div>

        <p class="text-xs text-slate-400">
          Les ravitaillements sont positionnés automatiquement d'après leur distance depuis le
          départ. Cliquez sur un repère pour ouvrir le ravitaillement correspondant.
        </p>
      </div>
    } @else {
      <div
        class="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"
      >
        <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
          <ui-icon [icon]="faRoute" size="xl" />
        </div>
        <div class="space-y-1">
          <p class="font-medium text-slate-700">Importez la trace GPX de votre course</p>
          <p class="text-sm text-slate-500">
            Le profil altimétrique et le positionnement des ravitaillements seront générés
            automatiquement.
          </p>
        </div>
        <label
          class="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          [class.pointer-events-none]="uploading()"
          [class.opacity-60]="uploading()"
        >
          <ui-icon [icon]="faArrowUpFromBracket" size="sm" />
          {{ uploading() ? 'Import en cours…' : 'Importer un fichier GPX' }}
          <input
            type="file"
            accept=".gpx,application/gpx+xml"
            class="hidden"
            [disabled]="uploading()"
            (change)="onFileChange($event)"
          />
        </label>
      </div>
    }

    <!-- Modale : confirmation du retrait de la trace GPX -->
    <ui-modal
      [open]="confirmRemoveOpen()"
      title="Retirer la trace GPX"
      (close)="confirmRemoveOpen.set(false)"
    >
      <p>
        Le profil, le tracé et le positionnement des ravitaillements seront supprimés. Cette action
        est irréversible.
      </p>
      <div modalFooter class="flex items-center justify-end gap-3">
        <ui-button color="default" variant="ghost" (clicked)="confirmRemoveOpen.set(false)">
          Annuler
        </ui-button>
        <ui-button color="danger" [icon]="faTrash" (clicked)="confirmRemove()"> Retirer </ui-button>
      </div>
    </ui-modal>
  `,
})
export class RouteProfilePanelComponent {
  /** Trace GPX chargée (ou `null` si aucune). */
  readonly track = input<GpxTrack | null>(null);
  /** Ravitaillements à positionner sur le profil. */
  readonly aidStations = input<AidStation[]>([]);
  /** Import en cours (désactive les actions). */
  readonly uploading = input(false);

  /** Émis lorsqu'un fichier GPX est sélectionné (contenu lu + nom). */
  readonly gpxSelected = output<GpxSelection>();
  /** Émis pour retirer la trace GPX. */
  readonly removeTrack = output<void>();
  /** Émis au clic sur un repère de ravitaillement (identifiant). */
  readonly selectAidStation = output<string>();
  /** Émis pour créer un ravitaillement à une distance (km) depuis le départ. */
  readonly addAidStationAt = output<number>();
  /** Émis pour repositionner un ravitaillement à une nouvelle distance (km). */
  readonly moveAidStation = output<{ id: string; distance: number }>();
  /** Émis en cas de fichier illisible. */
  readonly fileError = output<string>();

  protected readonly faRoute = faRoute;
  protected readonly faMountainSun = faMountainSun;
  protected readonly faArrowUpFromBracket = faArrowUpFromBracket;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faTrash = faTrash;

  /** Mode ajout de ravitaillement depuis le profil / le tracé. */
  protected readonly addMode = signal(false);

  /** État d'ouverture de la modale de confirmation de retrait. */
  protected readonly confirmRemoveOpen = signal(false);

  /** Marqueurs unifiés (ravitaillements) projetés sur le profil. */
  protected readonly markers = computed<RoutePointMarker[]>(() =>
    buildRouteMarkers(this.aidStations(), this.track()),
  );

  /** Confirme le retrait : émet l'événement et ferme la modale. */
  protected confirmRemove(): void {
    this.confirmRemoveOpen.set(false);
    this.removeTrack.emit();
  }

  protected onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Réinitialise pour permettre de re-sélectionner le même fichier.
    input.value = '';
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      this.gpxSelected.emit({ content, fileName: file.name });
    };
    reader.onerror = () => this.fileError.emit('Impossible de lire le fichier GPX.');
    reader.readAsText(file);
  }

  protected round(value: number): number {
    return Math.round(value);
  }

  protected formatKm(distance: number): string {
    return (Math.round(distance * 10) / 10).toString();
  }
}
