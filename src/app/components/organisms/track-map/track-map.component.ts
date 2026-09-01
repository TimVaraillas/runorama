import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type * as L from 'leaflet';
import type { GpxTrack, RoutePointMarker } from '../../../core/models';
import { haversineMeters } from '../../../core/utils/gpx.util';
import { routePointKindColor } from '../../../core/utils/route-point.util';

/**
 * Organism : **tracé du parcours sur fond cartographique** (Leaflet + tuiles
 * OpenStreetMap). La carte n'est initialisée que dans le navigateur
 * (`afterNextRender` + import dynamique de Leaflet) pour rester compatible SSR
 * et ne pas embarquer la librairie dans le bundle serveur.
 *
 * Mêmes repères que le profil (départ, arrivée, ravitaillements), cliquables
 * pour sélectionner le point de passage correspondant.
 */
@Component({
  selector: 'ui-track-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #mapContainer
      class="z-0 h-160 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
    ></div>
  `,
})
export class TrackMapComponent {
  /** Trace GPX à représenter. */
  readonly track = input.required<GpxTrack>();
  /** Repères de points de passage (ravitaillements…). */
  readonly markers = input<RoutePointMarker[]>([]);
  /**
   * Mode ajout : un clic sur la carte place un nouveau ravitaillement au point
   * de trace le plus proche (au lieu de sélectionner/déplacer).
   */
  readonly addMode = input(false);

  /** Émis au clic sur un repère de ravitaillement (identifiant). */
  readonly select = output<string>();
  /** Émis en mode ajout : distance (km) où placer un nouveau ravitaillement. */
  readonly addAt = output<number>();
  /** Émis à la fin d'un glisser : nouvelle distance (km) d'un ravitaillement. */
  readonly moveMarker = output<{ id: string; distance: number }>();

  private readonly mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly destroyRef = inject(DestroyRef);

  private leaflet: typeof L | null = null;
  private map: L.Map | null = null;
  private layer: L.LayerGroup | null = null;
  private readonly ready = signal(false);
  /** Nombre de points de la trace déjà cadrée (recadre seulement au changement). */
  private fittedCount = -1;

  constructor() {
    // Initialisation navigateur uniquement (Leaflet accède au DOM/`window`).
    afterNextRender(async () => {
      const mod = await import('leaflet');
      const leaflet = ((mod as { default?: typeof L }).default ?? mod) as typeof L;
      this.leaflet = leaflet;

      const map = leaflet.map(this.mapContainer().nativeElement, {
        scrollWheelZoom: true,
        attributionControl: true,
      });
      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        })
        .addTo(map);
      this.layer = leaflet.layerGroup().addTo(map);
      // En mode ajout, un clic sur la carte crée un ravitaillement.
      map.on('click', (event: L.LeafletMouseEvent) => {
        if (!this.addMode()) {
          return;
        }
        const nearest = this.nearestTrackPoint(event.latlng.lat, event.latlng.lng);
        if (nearest) {
          this.addAt.emit(nearest.distance);
        }
      });
      this.map = map;
      this.ready.set(true);
      this.draw();
    });

    // Redessine quand la trace, les repères ou le mode changent (carte prête).
    effect(() => {
      this.track();
      this.markers();
      this.addMode();
      if (this.ready()) {
        this.draw();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      this.map = null;
    });
  }

  /** (Re)construit la polyligne du tracé et les repères. */
  private draw(): void {
    const leaflet = this.leaflet;
    const map = this.map;
    const layer = this.layer;
    if (!leaflet || !map || !layer) {
      return;
    }
    layer.clearLayers();

    const points = this.track().points;
    if (points.length < 2) {
      return;
    }

    const addMode = this.addMode();
    map.getContainer().style.cursor = addMode ? 'crosshair' : '';

    const latlngs = points.map((p) => [p.lat, p.lon] as [number, number]);
    const line = leaflet.polyline(latlngs, { color: '#f2542d', weight: 4, opacity: 0.9 });
    layer.addLayer(line);

    const first = points[0]!;
    const last = points[points.length - 1]!;
    layer.addLayer(this.dot(leaflet, first.lat, first.lon, '#10b981', 'Départ'));
    layer.addLayer(this.dot(leaflet, last.lat, last.lon, '#334155', 'Arrivée'));

    for (const marker of this.markers()) {
      if (marker.latitude == null || marker.longitude == null) {
        continue;
      }
      const km = Math.round(marker.distanceFromStart * 10) / 10;
      const pin = leaflet.marker([marker.latitude, marker.longitude], {
        draggable: !addMode,
        interactive: !addMode,
        icon: this.pinIcon(leaflet, routePointKindColor(marker.kind)),
      });
      pin.bindTooltip(`${marker.name} · km ${km}`, { direction: 'top' });
      pin.on('click', () => {
        if (!addMode) {
          this.select.emit(marker.id);
        }
      });
      // Fin de glisser : accroche au point de trace le plus proche.
      pin.on('dragend', () => {
        const ll = pin.getLatLng();
        const nearest = this.nearestTrackPoint(ll.lat, ll.lng);
        if (nearest) {
          this.moveMarker.emit({ id: marker.id, distance: nearest.distance });
        }
      });
      layer.addLayer(pin);
    }

    // La carte peut être créée dans un conteneur dont la taille n'est pas encore
    // stabilisée (onglet) : on recalcule avant de cadrer.
    map.invalidateSize();
    // Cadre sur le tracé uniquement au premier rendu / changement de trace,
    // pour ne pas réinitialiser la vue à chaque ajout ou déplacement.
    if (this.fittedCount !== points.length) {
      map.fitBounds(line.getBounds(), { padding: [24, 24] });
      this.fittedCount = points.length;
    }
  }

  /** Point de trace le plus proche de coordonnées données (par distance GPS). */
  private nearestTrackPoint(lat: number, lon: number): GpxTrack['points'][number] | null {
    const points = this.track().points;
    if (points.length === 0) {
      return null;
    }
    let nearest = points[0]!;
    let best = haversineMeters(lat, lon, nearest.lat, nearest.lon);
    for (const point of points) {
      const d = haversineMeters(lat, lon, point.lat, point.lon);
      if (d < best) {
        best = d;
        nearest = point;
      }
    }
    return nearest;
  }

  /** Icône de repère (pastille HTML colorée) — évite les images par défaut. */
  private pinIcon(leaflet: typeof L, color: string): L.DivIcon {
    return leaflet.divIcon({
      className: '',
      html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,.2)"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }

  /** Crée un repère circulaire coloré (départ/arrivée) avec une infobulle. */
  private dot(
    leaflet: typeof L,
    lat: number,
    lon: number,
    color: string,
    label: string,
  ): L.CircleMarker {
    const marker = leaflet.circleMarker([lat, lon], {
      radius: 6,
      color: 'white',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    });
    marker.bindTooltip(label, { direction: 'top' });
    return marker;
  }
}
