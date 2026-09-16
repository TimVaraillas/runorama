import { ChangeDetectionStrategy, Component, computed, effect, input, model, output, signal } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SpinnerComponent } from '../../atoms/spinner/spinner.component';
import { ModalComponent } from '../../molecules/modal/modal.component';
import { ElevationProfileComponent } from '../elevation-profile/elevation-profile.component';
import { TrackMapComponent } from '../track-map/track-map.component';
import type {
  AidStation,
  GpxTrack,
  RoutePointMarker,
  RouteWaypoint,
} from '../../../core/models';
import { buildRouteMarkers } from '../../../core/utils/route-point.util';
import { estimateArrivalTime } from '../../../core/utils/passage-time.util';
import {
  faArrowTrendDown,
  faArrowTrendUp,
  faArrowUpFromBracket,
  faCalendarDay,
  faCompress,
  faExpand,
  faLocationDot,
  faMountain,
  faMinus,
  faPlus,
  faRoute,
  faStopwatch,
  faTrash,
  faXmark,
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
  host: { '(document:keydown.escape)': 'onEscape()' },
  imports: [
    ButtonComponent,
    IconComponent,
    SpinnerComponent,
    ModalComponent,
    ElevationProfileComponent,
    TrackMapComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (track(); as t) {
      <div
        [class]="
          fullscreen()
            ? 'fixed inset-0 z-60 flex flex-col overflow-hidden bg-slate-50'
            : ''
        "
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <div class="flex flex-wrap items-center gap-6 text-sm">
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faCalendarDay" size="sm" class="text-brand-500" />
              <span class="tabular-nums text-slate-500 font-medium">{{ formatDate(date()) }}</span>
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faStopwatch" size="sm" class="text-brand-500" />
              <span class="tabular-nums text-slate-500 font-medium">{{ startTime() }}</span>
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faRoute" size="sm" class="text-secondary-400" />
              <span class="tabular-nums text-slate-500 font-medium">{{ formatKm(t.distance) }} km</span>
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faArrowTrendUp" size="sm" class="text-secondary-400" />
              <span class="tabular-nums text-slate-500 font-medium">+{{ round(t.elevationGain) }} m</span>
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faArrowTrendDown" size="sm" class="text-secondary-400" />
              <span class="tabular-nums text-slate-500 font-medium">-{{ round(t.elevationLoss) }} m</span>
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-600">
              <ui-icon [icon]="faMountain" size="sm" class="text-secondary-400" />
              <span class="tabular-nums text-slate-500 font-medium">{{ round(t.minAltitude) }}–{{ round(t.maxAltitude) }} m</span>
            </span>
          </div>
          @if (fullscreen()) {
            <div class="flex items-center gap-2">
              <ui-button
                size="sm"
                [color]="'primary'"
                variant="outlined"
                [icon]="faLocationDot"
                [attr.aria-pressed]="addMode()"
                (clicked)="addMode.set(!addMode())"
              >
                Ajouter un point
              </ui-button>
              <ui-button
                size="sm"
                color="default"
                variant="outlined"
                [icon]="faCompress"
                title="Quitter le plein écran"
                (clicked)="fullscreen.set(false)"
              >
              </ui-button>
            </div>
          }

        </div>

        @if (addMode()) {
          <div class="border-b border-slate-200 bg-brand-50 px-6 py-3">
            <p class="mt-1.5 text-xs text-brand-700/80">
              Cliquez sur le profil ou le tracé pour positionner un point. Le type se choisit dans
              le panneau latéral.
            </p>
          </div>
        }

        <div [class]="fullscreen() ? 'flex min-h-0 flex-1 flex-col' : 'contents'">
        <div
          [class]="
            'border-b border-slate-200 bg-white ' +
            (fullscreen() ? 'p-3 shrink-0' : 'p-4')
          "
        >
          <div
            [class]="
              'flex items-center gap-2 ' +
              (fullscreen() ? 'mb-1 justify-end' : 'mb-2 justify-between')
            "
          >
            @if (!fullscreen()) {
              <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Profil</p>
            }
            <div class="flex items-center gap-1">
              @if (profile.isZoomed()) {
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Réinitialiser le zoom"
                  (click)="profile.resetZoom()"
                >
                  <ui-icon [icon]="faXmark" size="sm" />
                </button>
              }
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="!profile.isZoomed()"
                aria-label="Dézoomer"
                (click)="profile.zoomOut()"
              >
                <ui-icon [icon]="faMinus" size="sm" />
              </button>
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="profile.viewSpanFrac() <= profile.minSpanFrac"
                aria-label="Zoomer"
                (click)="profile.zoomIn()"
              >
                <ui-icon [icon]="faPlus" size="sm" />
              </button>
            </div>
          </div>
          <div [class]="fullscreen() ? 'mx-2 h-[20vh] w-auto' : 'mt-8 aspect-6/1 w-full'">
          <ui-elevation-profile
            #profile
            class="block h-full"
            [fillHeight]="true"
            [track]="t"
            [markers]="markers()"
            [startTime]="startTime()"
            [targetTimeMinutes]="targetTimeMinutes()"
            [activePoint]="activePoint()"
            [addMode]="addMode()"
            (select)="selectAidStation.emit($event)"
            (addAt)="onAddAt($event)"
            (moveMarker)="moveAidStation.emit($event)"
            (hoverPoint)="activePoint.set($event)"
          />
          </div>
        </div>

        <div
          [class]="
            'bg-white ' +
            (fullscreen() ? 'flex min-h-0 flex-1 flex-col p-0' : 'p-4')
          "
        >
          @if (!fullscreen()) {
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Tracé</p>
          }
          <div [class]="fullscreen() ? 'min-h-0 flex-1' : ''">
          <ui-track-map
            [class.block]="fullscreen()"
            [class.h-full]="fullscreen()"
            [fillHeight]="fullscreen()"
            [track]="t"
            [markers]="markers()"
            [startTime]="startTime()"
            [targetTimeMinutes]="targetTimeMinutes()"
            [activePoint]="activePoint()"
            [addMode]="addMode()"
            (select)="selectAidStation.emit($event)"
            (addAt)="onAddAt($event)"
            (moveMarker)="moveAidStation.emit($event)"
            (hoverPoint)="activePoint.set($event)"
          />
          </div>
        </div>
        </div>

      </div>
    } @else if (loading()) {
      <div
        class="flex flex-col items-center gap-3 rounded-md border border-slate-200 bg-white p-12 text-center"
      >
        <ui-spinner [size]="32" />
        <p class="text-sm text-slate-500">Chargement du parcours…</p>
      </div>
    } @else {
      <div
        class="flex flex-col items-center gap-4 rounded-md border border-dashed border-slate-300 bg-white p-12 text-center m-4"
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
          @if (uploading()) {
            <span
              class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
              aria-hidden="true"
            ></span>
          } @else {
            <ui-icon [icon]="faArrowUpFromBracket" size="sm" />
          }
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
  /** Points de passage légers (checkpoints, sommets, points personnalisés). */
  readonly waypoints = input<RouteWaypoint[]>([]);
  /** Chargement de la trace en cours (affiche un loader). */
  readonly loading = input(false);
  /** Import en cours (désactive les actions). */
  readonly uploading = input(false);
  /** Compteur permettant d’ouvrir la confirmation depuis le menu de la page. */
  readonly removeTrackRequest = input(0);
  /** Heure de départ locale de la course, au format `HH:mm`. */
  readonly startTime = input('08:00');
  /** Date de la course au format ISO `YYYY-MM-DD`. */
  readonly date = input('');
  /** Chrono cible de la course, utilisé pour l'heure d'arrivée. */
  readonly targetTimeMinutes = input(0);

  /** Émis lorsqu'un fichier GPX est sélectionné (contenu lu + nom). */
  readonly gpxSelected = output<GpxSelection>();
  /** Émis pour retirer la trace GPX. */
  readonly removeTrack = output<void>();
  /** Émis au clic sur un repère (identifiant du point de passage). */
  readonly selectAidStation = output<string>();
  /** Émis pour créer un point de passage à une distance (km). */
  readonly addPoint = output<{ distance: number }>();
  /** Émis pour repositionner un point de passage à une nouvelle distance (km). */
  readonly moveAidStation = output<{ id: string; distance: number }>();
  /** Émis en cas de fichier illisible. */
  readonly fileError = output<string>();

  protected readonly faRoute = faRoute;
  protected readonly faCalendarDay = faCalendarDay;
  protected readonly faStopwatch = faStopwatch;
  protected readonly faMountain = faMountain;
  protected readonly faArrowTrendUp = faArrowTrendUp;
  protected readonly faArrowTrendDown = faArrowTrendDown;
  protected readonly faArrowUpFromBracket = faArrowUpFromBracket;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faTrash = faTrash;
  protected readonly faPlus = faPlus;
  protected readonly faMinus = faMinus;
  protected readonly faXmark = faXmark;
  protected readonly faExpand = faExpand;
  protected readonly faCompress = faCompress;

  /** Mode plein écran : profil + carte visibles simultanément sur tout l'écran. */
  readonly fullscreen = model(false);

  /** Mode ajout de point de passage depuis le profil / le tracé. */
  readonly addMode = model(false);
  /** Point de trace actuellement survolé dans le profil ou sur la carte. */
  protected readonly activePoint = signal<GpxTrack['points'][number] | null>(null);
  /** État d'ouverture de la modale de confirmation de retrait. */
  protected readonly confirmRemoveOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.removeTrackRequest() > 0) this.confirmRemoveOpen.set(true);
    });
  }

  /** Marqueurs unifiés (ravitaillements + points de passage) sur le profil. */
  protected readonly markers = computed<RoutePointMarker[]>(() => {
    const track = this.track();
    const stations = this.aidStations();
    const targetTimeMinutes = this.targetTimeMinutes();
    const totalDistanceKm = track?.distance;
    return buildRouteMarkers(stations, track, this.waypoints()).map((marker) => ({
      ...marker,
      estimatedDurationFromStart:
        targetTimeMinutes && totalDistanceKm
          ? estimateArrivalTime(marker.distanceFromStart, targetTimeMinutes, totalDistanceKm, stations)
          : marker.estimatedDurationFromStart,
    }));
  });

  /** Place un point du type sélectionné puis quitte le mode ajout (un à la fois). */
  protected onAddAt(distance: number): void {
    this.addPoint.emit({ distance });
    this.addMode.set(false);
  }

  /** Ferme le plein écran à la touche Échap. */
  protected onEscape(): void {
    if (this.fullscreen()) {
      this.fullscreen.set(false);
    }
  }

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

  protected formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return year && month && day ? `${day}/${month}/${year}` : date;
  }
}
