import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { GpxTrack, RoutePointMarker } from '../../../core/models';
import { faFlag, faFlagCheckered, faLocationDot } from '@fortawesome/free-solid-svg-icons';

/** Point interne du tracé, en coordonnées SVG + valeurs de la trace. */
interface PlotPoint {
  x: number;
  y: number;
  distance: number;
  ele: number;
  gain: number;
}

/** Repère (départ, arrivée, ravitaillement…) projeté en coordonnées SVG. */
interface PlotMarker {
  id: string;
  name: string;
  kind: RoutePointMarker['kind'] | 'START' | 'FINISH';
  x: number;
  y: number;
  altitude: number | null;
  distance: number;
  durationLabel: string | null;
}

/** Graduation d'axe (position SVG + libellé). */
interface AxisTick {
  pos: number;
  label: string;
}

/** État du curseur au survol du profil. */
interface HoverState {
  x: number;
  y: number;
  distance: number;
  ele: number;
  gain: number;
}

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 340;
const MARGIN = { top: 24, right: 16, bottom: 36, left: 48 };

/** Seuil (unités viewBox) au-delà duquel un appui est interprété comme un glisser. */
const DRAG_THRESHOLD = 6;
/** Distance (unités viewBox) sous laquelle un appui saisit un repère à déplacer. */
const MARKER_HIT = 14;

/**
 * Organism : **profil altimétrique** d'une trace GPX (distance en X, altitude
 * en Y), rendu en SVG maison (aucune dépendance graphique) pour rester cohérent
 * avec le reste de l'application et fluide malgré des traces volumineuses (les
 * points reçus sont déjà simplifiés côté serveur).
 *
 * Le profil est interactif : survol pour lire distance/altitude/D+, et clic sur
 * un repère pour sélectionner le point de passage correspondant. Départ,
 * arrivée et ravitaillements sont identifiables par des repères dédiés.
 */
@Component({
  selector: 'ui-elevation-profile',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full select-none">
      <svg
        #svgEl
        [attr.viewBox]="viewBox"
        [class]="'h-auto w-full touch-none ' + (addMode() ? 'cursor-crosshair' : '')"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="ariaLabel()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp($event)"
        (pointerleave)="onPointerLeave()"
        (click)="onSvgClick($event)"
      >
        <defs>
          <!-- Aire : fondu vertical brand → secondary, dominante brand. -->
          <linearGradient id="elevation-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-brand-500)" stop-opacity="0.3" />
            <stop offset="50%" stop-color="var(--color-brand-400)" stop-opacity="0.28" />
            <stop offset="80%" stop-color="var(--color-secondary-400)" stop-opacity="0.16" />
            <stop offset="100%" stop-color="var(--color-secondary-500)" stop-opacity="0.08" />
          </linearGradient>
        </defs>

        <!-- Lignes horizontales de repère + graduations d'altitude -->
        @for (tick of geometry().yTicks; track tick.pos) {
          <line
            [attr.x1]="margin.left"
            [attr.x2]="viewWidth - margin.right"
            [attr.y1]="tick.pos"
            [attr.y2]="tick.pos"
            class="stroke-slate-200"
            stroke-width="1"
          />
          <text
            [attr.x]="margin.left - 8"
            [attr.y]="tick.pos + 3"
            text-anchor="end"
            class="fill-slate-400 text-[11px]"
          >
            {{ tick.label }}
          </text>
        }

        <!-- Graduations de distance -->
        @for (tick of geometry().xTicks; track tick.pos) {
          <text
            [attr.x]="tick.pos"
            [attr.y]="viewHeight - margin.bottom + 18"
            text-anchor="middle"
            class="fill-slate-400 text-[11px]"
          >
            {{ tick.label }}
          </text>
        }

        <!-- Aire + ligne du profil -->
        <path [attr.d]="geometry().areaPath" fill="url(#elevation-area-gradient)" />
        <path
          [attr.d]="geometry().linePath"
          fill="none"
          class="stroke-brand-600"
          stroke-width="1.75"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- Repères verticaux (départ, arrivée, ravitaillements) -->
        @for (marker of geometry().markers; track marker.id) {
          <g
            [class]="
              marker.kind === 'AID_STATION' && !addMode()
                ? dragging() && draggingId() === marker.id
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : ''
            "
            [attr.pointer-events]="addMode() ? 'none' : null"
          >
            <line
              [attr.x1]="marker.x"
              [attr.x2]="marker.x"
              [attr.y1]="margin.top"
              [attr.y2]="viewHeight - margin.bottom"
              [class]="markerLineClass(marker)"
              stroke-width="1.5"
              [attr.stroke-dasharray]="marker.kind === 'AID_STATION' ? '4 3' : ''"
            />
            <circle [attr.cx]="marker.x" [attr.cy]="marker.y" r="4" [class]="markerDotClass(marker)" />
            @if (marker.kind === 'AID_STATION') {
              <circle
                [attr.cx]="marker.x"
                [attr.cy]="marker.y"
                r="10"
                fill="transparent"
              />
            }
          </g>
        }

        <!-- Curseur de survol -->
        @if (hover(); as h) {
          <line
            [attr.x1]="h.x"
            [attr.x2]="h.x"
            [attr.y1]="margin.top"
            [attr.y2]="viewHeight - margin.bottom"
            class="stroke-slate-400"
            stroke-width="1"
            stroke-dasharray="3 3"
          />
          <circle [attr.cx]="h.x" [attr.cy]="h.y" r="4" class="fill-brand-600" />
        }
      </svg>

      <!-- Étiquettes des repères (HTML superposé pour un texte net) -->
      <div class="pointer-events-none absolute inset-0">
        @for (marker of geometry().markers; track marker.id) {
          <div
            class="absolute -translate-x-1/2"
            [style.left.%]="(marker.x / viewWidth) * 100"
            [style.top.%]="(margin.top / viewHeight) * 100"
          >
            <div
              class="flex -translate-y-full flex-col items-center gap-0.5 pb-1 text-center"
            >
              @if (marker.kind === 'START') {
                <ui-icon [icon]="faFlag" size="sm" class="text-emerald-600" />
              } @else if (marker.kind === 'FINISH') {
                <ui-icon [icon]="faFlagCheckered" size="sm" class="text-slate-700" />
              } @else {
                <span
                  class="max-w-30 truncate rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 shadow-sm"
                  [class.pointer-events-auto]="!addMode()"
                  [class.cursor-pointer]="!addMode()"
                  [title]="markerTooltip(marker)"
                  (click)="!addMode() && select.emit(marker.id)"
                >
                  {{ marker.name }}
                </span>
              }
              @if (marker.durationLabel) {
                <span class="text-[10px] font-semibold tabular-nums text-slate-500">
                  {{ marker.durationLabel }}
                </span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Infobulle de survol -->
      @if (hover(); as h) {
        <div
          class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md"
          [style.left.%]="(h.x / viewWidth) * 100"
          [style.top.%]="(h.y / viewHeight) * 100"
        >
          <div class="font-semibold tabular-nums text-slate-700">km {{ formatKm(h.distance) }}</div>
          <div class="tabular-nums text-slate-500">{{ round(h.ele) }} m · D+ {{ round(h.gain) }} m</div>
        </div>
      }
    </div>
  `,
})
export class ElevationProfileComponent {
  /** Trace GPX à représenter (points déjà simplifiés). */
  readonly track = input.required<GpxTrack>();

  /** Marqueurs de points de passage (ravitaillements…) à superposer. */
  readonly markers = input<RoutePointMarker[]>([]);

  /**
   * Mode ajout : un clic sur le profil place un nouveau ravitaillement à la
   * distance pointée (au lieu de sélectionner/déplacer).
   */
  readonly addMode = input(false);

  /** Émis au clic sur un repère de point de passage (identifiant). */
  readonly select = output<string>();

  /** Émis en mode ajout : distance (km) où placer un nouveau ravitaillement. */
  readonly addAt = output<number>();

  /** Émis à la fin d'un glisser : nouvelle distance (km) d'un ravitaillement. */
  readonly moveMarker = output<{ id: string; distance: number }>();

  protected readonly faLocationDot = faLocationDot;
  protected readonly faFlag = faFlag;
  protected readonly faFlagCheckered = faFlagCheckered;

  protected readonly viewWidth = VIEW_WIDTH;
  protected readonly viewHeight = VIEW_HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;

  /** État du curseur de survol. */
  protected readonly hover = signal<HoverState | null>(null);

  /** Référence à l'élément SVG (mesures écran → coordonnées viewBox). */
  private readonly svgEl = viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

  /** Glisser en cours (dépassement du seuil de déplacement). */
  protected readonly dragging = signal(false);
  /** Repère en cours de saisie/déplacement. */
  protected readonly draggingId = signal<string | null>(null);
  private dragStartVbX = 0;
  private dragDistance = 0;
  /** Neutralise le `click` qui suit un glisser (évite un ajout parasite). */
  private suppressClick = false;

  /** Géométrie projetée du profil (recalculée quand la trace/les repères changent). */
  protected readonly geometry = computed(() => this.computeGeometry());

  protected ariaLabel(): string {
    const t = this.track();
    return `Profil altimétrique : ${this.formatKm(t.distance)} km, D+ ${Math.round(
      t.elevationGain,
    )} m`;
  }

  /** Projette la trace et les repères en coordonnées SVG. */
  private computeGeometry() {
    const track = this.track();
    const points = track.points;
    const plotW = VIEW_WIDTH - MARGIN.left - MARGIN.right;
    const plotH = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;
    const baselineY = VIEW_HEIGHT - MARGIN.bottom;

    const maxDistance = track.distance || points[points.length - 1]?.distance || 1;
    // Marge verticale de 5 % autour des altitudes pour aérer le tracé.
    const rawMin = track.minAltitude;
    const rawMax = track.maxAltitude;
    const pad = Math.max(5, (rawMax - rawMin) * 0.05);
    const minEle = rawMin - pad;
    const maxEle = rawMax + pad;
    const eleSpan = maxEle - minEle || 1;

    const xOf = (distance: number) => MARGIN.left + (distance / maxDistance) * plotW;
    const yOf = (ele: number) => MARGIN.top + (1 - (ele - minEle) / eleSpan) * plotH;

    const plot: PlotPoint[] = points.map((p) => ({
      x: xOf(p.distance),
      y: yOf(p.ele),
      distance: p.distance,
      ele: p.ele,
      gain: p.elevationGain,
    }));

    const linePath = plot
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    const areaPath =
      plot.length > 0
        ? `${linePath} L${plot[plot.length - 1]!.x.toFixed(1)},${baselineY} L${plot[0]!.x.toFixed(
            1,
          )},${baselineY} Z`
        : '';

    const markers = this.buildPlotMarkers(xOf, yOf, maxDistance, track);
    const yTicks = this.buildYTicks(rawMin, rawMax, yOf);
    const xTicks = this.buildXTicks(maxDistance, xOf);

    return { plot, linePath, areaPath, markers, yTicks, xTicks, baselineY };
  }

  /** Construit les repères SVG : départ, arrivée et points de passage. */
  private buildPlotMarkers(
    xOf: (d: number) => number,
    yOf: (e: number) => number,
    maxDistance: number,
    track: GpxTrack,
  ): PlotMarker[] {
    const first = track.points[0];
    const last = track.points[track.points.length - 1];
    const result: PlotMarker[] = [];

    if (first) {
      result.push({
        id: '__start__',
        name: 'Départ',
        kind: 'START',
        x: xOf(0),
        y: yOf(first.ele),
        altitude: first.ele,
        distance: 0,
        durationLabel: null,
      });
    }

    for (const marker of this.markers()) {
      const distance = Math.min(marker.distanceFromStart, maxDistance);
      const altitude = marker.altitude ?? null;
      result.push({
        id: marker.id,
        name: marker.name,
        kind: marker.kind,
        x: xOf(distance),
        y: altitude != null ? yOf(altitude) : MARGIN.top,
        altitude,
        distance: marker.distanceFromStart,
        durationLabel: this.formatDuration(marker.estimatedDurationFromStart),
      });
    }

    if (last) {
      result.push({
        id: '__finish__',
        name: 'Arrivée',
        kind: 'FINISH',
        x: xOf(last.distance),
        y: yOf(last.ele),
        altitude: last.ele,
        distance: last.distance,
        durationLabel: null,
      });
    }

    return result;
  }

  /** Graduations d'altitude (5 paliers arrondis). */
  private buildYTicks(min: number, max: number, yOf: (e: number) => number): AxisTick[] {
    const ticks: AxisTick[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const ele = min + ((max - min) * i) / steps;
      ticks.push({ pos: yOf(ele), label: `${Math.round(ele)} m` });
    }
    return ticks;
  }

  /** Graduations de distance (5 paliers). */
  private buildXTicks(maxDistance: number, xOf: (d: number) => number): AxisTick[] {
    const ticks: AxisTick[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const distance = (maxDistance * i) / steps;
      ticks.push({ pos: xOf(distance), label: `${this.formatKm(distance)}` });
    }
    return ticks;
  }

  protected markerLineClass(marker: PlotMarker): string {
    if (marker.kind === 'START') return 'stroke-emerald-400';
    if (marker.kind === 'FINISH') return 'stroke-slate-400';
    return 'stroke-indigo-400';
  }

  protected markerDotClass(marker: PlotMarker): string {
    if (marker.kind === 'START') return 'fill-emerald-500';
    if (marker.kind === 'FINISH') return 'fill-slate-600';
    return 'fill-indigo-500';
  }

  protected markerTooltip(marker: PlotMarker): string {
    const parts = [marker.name, `km ${this.formatKm(marker.distance)}`];
    if (marker.altitude != null) parts.push(`${Math.round(marker.altitude)} m`);
    if (marker.durationLabel) parts.push(marker.durationLabel);
    return parts.join(' · ');
  }

  /** Amorce un déplacement si l'appui est proche d'un ravitaillement. */
  protected onPointerDown(event: PointerEvent): void {
    if (this.addMode()) {
      return;
    }
    const vbX = this.clientToVbX(event.clientX);
    if (vbX == null) {
      return;
    }
    let target: PlotMarker | null = null;
    let best = MARKER_HIT;
    for (const marker of this.geometry().markers) {
      if (marker.kind !== 'AID_STATION') {
        continue;
      }
      const d = Math.abs(marker.x - vbX);
      if (d <= best) {
        best = d;
        target = marker;
      }
    }
    if (!target) {
      return;
    }
    this.draggingId.set(target.id);
    this.dragStartVbX = vbX;
    this.dragDistance = target.distance;
    this.svgEl().nativeElement.setPointerCapture(event.pointerId);
  }

  /** Met à jour le survol et, le cas échéant, le déplacement en cours. */
  protected onPointerMove(event: PointerEvent): void {
    const nearest = this.nearestPlotPoint(event.clientX);
    if (!nearest) {
      return;
    }
    if (this.draggingId() != null) {
      const vbX = this.clientToVbX(event.clientX) ?? nearest.x;
      if (!this.dragging() && Math.abs(vbX - this.dragStartVbX) > DRAG_THRESHOLD) {
        this.dragging.set(true);
      }
      if (this.dragging()) {
        this.dragDistance = nearest.distance;
      }
    }
    this.hover.set({
      x: nearest.x,
      y: nearest.y,
      distance: nearest.distance,
      ele: nearest.ele,
      gain: nearest.gain,
    });
  }

  /** Termine un déplacement (émet la nouvelle position) ou une sélection. */
  protected onPointerUp(event: PointerEvent): void {
    const id = this.draggingId();
    if (id == null) {
      return;
    }
    const wasDragging = this.dragging();
    this.svgEl().nativeElement.releasePointerCapture(event.pointerId);
    this.draggingId.set(null);
    this.dragging.set(false);
    this.suppressClick = true;
    if (wasDragging) {
      this.moveMarker.emit({ id, distance: this.dragDistance });
    } else {
      this.select.emit(id);
    }
  }

  /** En mode ajout, un clic place un nouveau ravitaillement à la distance pointée. */
  protected onSvgClick(event: MouseEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (!this.addMode()) {
      return;
    }
    const nearest = this.nearestPlotPoint(event.clientX);
    if (nearest) {
      this.addAt.emit(nearest.distance);
    }
  }

  protected onPointerLeave(): void {
    // Ne pas interrompre un glisser en cours si le pointeur sort brièvement.
    if (this.draggingId() != null) {
      return;
    }
    this.hover.set(null);
  }

  /** Convertit une abscisse écran en abscisse viewBox. */
  private clientToVbX(clientX: number): number | null {
    const rect = this.svgEl().nativeElement.getBoundingClientRect();
    if (rect.width === 0) {
      return null;
    }
    return ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
  }

  /** Point de trace le plus proche (en X) d'une abscisse écran. */
  private nearestPlotPoint(clientX: number): PlotPoint | null {
    const vbX = this.clientToVbX(clientX);
    if (vbX == null) {
      return null;
    }
    const plot = this.geometry().plot;
    if (plot.length === 0) {
      return null;
    }
    let nearest = plot[0]!;
    let best = Math.abs(nearest.x - vbX);
    for (const point of plot) {
      const d = Math.abs(point.x - vbX);
      if (d < best) {
        best = d;
        nearest = point;
      }
    }
    return nearest;
  }

  protected round(value: number): number {
    return Math.round(value);
  }

  /** Formate une distance en km avec au plus une décimale. */
  protected formatKm(distance: number): string {
    return (Math.round(distance * 10) / 10).toString();
  }

  /**
   * Formate un temps de passage de façon indicative (« 2h45 »), arrondi aux
   * 5 minutes — on évite une fausse précision (« 02:43:17 »).
   */
  protected formatDuration(minutes: number | undefined): string | null {
    if (minutes == null || minutes <= 0) {
      return null;
    }
    const rounded = Math.round(minutes / 5) * 5;
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    if (h === 0) {
      return `${m}min`;
    }
    return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
  }
}
