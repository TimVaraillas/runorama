import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { GpxTrack, RoutePointMarker } from '../../../core/models';
import { routePointKindColor } from '../../../core/utils/route-point.util';
import {
  faFlag,
  faFlagCheckered,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';

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
  /** D+ cumulé depuis le départ (m) au niveau du repère, si calculable. */
  cumulativeGain: number | null;
  /** Niveau vertical du label (0 = base), pour désempiler les labels proches. */
  labelLevel: number;
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
const MARGIN = { top: 28, right: 16, bottom: 36, left: 48 };

/** Marge haute de base (unités viewBox) quand aucun label n'est échelonné. */
const BASE_TOP = 28;
/** Écart vertical (unités viewBox) entre deux niveaux de labels. */
const LABEL_STEP_UNITS = 38;
/** Niveau d'échelonnement maximal (borne la marge haute réservée). */
const MAX_LABEL_LEVEL = 4;

/** Seuil (unités viewBox) au-delà duquel un appui est interprété comme un glisser. */
const DRAG_THRESHOLD = 6;
/** Distance (unités viewBox) sous laquelle un appui saisit un repère à déplacer. */
const MARKER_HIT = 14;
/**
 * Écart horizontal (unités viewBox) sous lequel deux labels sont considérés
 * comme se chevauchant : le second est alors monté d'un niveau. Doit couvrir la
 * largeur d'un label (pastille jusqu'à ~120 px) pour éviter tout chevauchement
 * entre deux labels d'un même niveau.
 */
const LABEL_MIN_GAP = 140;

/** Fraction minimale de la trace visible (borne le zoom maximal). */
const MIN_SPAN_FRAC = 0.05;
/** Facteur multiplicatif de la fenêtre visible à chaque cran de zoom. */
const ZOOM_STEP = 0.8;

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
        [class]="
          'h-auto w-full touch-none ' +
          (addMode()
            ? 'cursor-crosshair'
            : panning()
              ? 'cursor-grabbing'
              : isZoomed()
                ? 'cursor-grab'
                : '')
        "
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="ariaLabel()"
        (wheel)="onWheel($event)"
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
          <!-- Découpe : confine l'aire et la ligne à la zone de tracé (zoom/pan). -->
          <clipPath id="elevation-plot-clip">
            <rect
              [attr.x]="margin.left"
              y="0"
              [attr.width]="viewWidth - margin.left - margin.right"
              [attr.height]="geometry().baselineY"
            />
          </clipPath>
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
        <path
          [attr.d]="geometry().areaPath"
          fill="url(#elevation-area-gradient)"
          clip-path="url(#elevation-plot-clip)"
        />
        <path
          [attr.d]="geometry().linePath"
          fill="none"
          class="stroke-brand-600"
          stroke-width="1.75"
          stroke-linejoin="round"
          stroke-linecap="round"
          clip-path="url(#elevation-plot-clip)"
        />

        <!-- Repères verticaux (départ, arrivée, points de passage) -->
        @for (marker of geometry().markers; track marker.id) {
          <g
            [class]="
              isPoint(marker) && !addMode()
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
              [attr.y1]="geometry().marginTop - marker.labelLevel * labelStepUnits"
              [attr.y2]="viewHeight - margin.bottom"
              [attr.stroke]="markerColor(marker)"
              stroke-width="1.5"
              [attr.stroke-dasharray]="isPoint(marker) ? '4 3' : ''"
            />
            <circle [attr.cx]="marker.x" [attr.cy]="marker.y" r="4" [attr.fill]="markerColor(marker)" />
            @if (isPoint(marker)) {
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
            [attr.y1]="geometry().marginTop"
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
            [style.top.%]="((geometry().marginTop - marker.labelLevel * labelStepUnits) / viewHeight) * 100"
          >
            <div class="flex -translate-y-full flex-col items-center gap-0.5 pb-1 text-center">
              @if (marker.durationLabel) {
                <span class="text-[10px] font-semibold tabular-nums text-slate-500">
                  {{ marker.durationLabel }}
                </span>
              }
              @if (marker.kind === 'START') {
                <ui-icon [icon]="faFlag" size="sm" class="text-emerald-600" />
              } @else if (marker.kind === 'FINISH') {
                <ui-icon [icon]="faFlagCheckered" size="sm" class="text-slate-700" />
              } @else {
                <span
                  class="whitespace-nowrap rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium shadow-sm"
                  [style.color]="markerColor(marker)"
                  [style.border-color]="markerColor(marker)"
                  [class.pointer-events-auto]="!addMode()"
                  [class.cursor-pointer]="!addMode()"
                  [title]="markerTooltip(marker)"
                  (click)="!addMode() && select.emit(marker.id)"
                >
                  {{ marker.name }}
                </span>
              }
            </div>
          </div>
        }
      </div>

      <!-- Cumuls (km + D+) à la base, proche de l'axe X -->
      <div class="pointer-events-none absolute inset-0">
        @for (marker of geometry().markers; track marker.id) {
          @if (isPoint(marker)) {
            <div
              class="absolute -translate-x-1/2 -translate-y-full"
              [style.left.%]="(marker.x / viewWidth) * 100"
              [style.top.%]="(geometry().baselineY / viewHeight) * 100"
            >
              <div
                class="flex flex-col items-center rounded bg-white/80 px-1 leading-tight tabular-nums"
              >
                <span class="text-[9px] font-semibold text-slate-500">
                  km {{ formatKm(marker.distance) }}
                </span>
                @if (marker.cumulativeGain != null) {
                  <span class="text-[9px] text-slate-400">D+ {{ round(marker.cumulativeGain) }} m</span>
                }
              </div>
            </div>
          }
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
  /** Écart vertical (unités viewBox) entre deux niveaux de labels échelonnés. */
  protected readonly labelStepUnits = LABEL_STEP_UNITS;
  /** Fraction minimale visible (borne le zoom maximal), exposée au parent. */
  readonly minSpanFrac = MIN_SPAN_FRAC;

  /** État du curseur de survol. */
  protected readonly hover = signal<HoverState | null>(null);

  /**
   * Fenêtre visible du profil, exprimée en fractions de la distance totale :
   * `viewStartFrac` = bord gauche (0 = départ), `viewSpanFrac` = largeur
   * (1 = trace entière). Le zoom réduit la largeur ; le pan décale le bord.
   */
  protected readonly viewStartFrac = signal(0);
  readonly viewSpanFrac = signal(1);
  /** Vrai dès que le profil est zoomé (fenêtre < trace entière). */
  readonly isZoomed = computed(() => this.viewSpanFrac() < 1 - 1e-6);

  /** Pan (déplacement horizontal) en cours. */
  protected readonly panning = signal(false);
  private panStartVbX = 0;
  private panStartFrac = 0;

  /** Référence à l'élément SVG (mesures écran → coordonnées viewBox). */
  private readonly svgEl = viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

  constructor() {
    // Réinitialise le zoom/pan à chaque changement de trace.
    let previous: GpxTrack | null = null;
    effect(() => {
      const track = this.track();
      if (track !== previous) {
        previous = track;
        this.viewStartFrac.set(0);
        this.viewSpanFrac.set(1);
      }
    });
  }

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

    const maxDistance = track.distance || points[points.length - 1]?.distance || 1;
    // Fenêtre visible (zoom/pan) exprimée en km.
    const viewStart = maxDistance * this.viewStartFrac();
    const viewSpan = maxDistance * this.viewSpanFrac() || maxDistance;
    const viewEnd = viewStart + viewSpan;
    // Marge verticale de 5 % autour des altitudes pour aérer le tracé.
    const rawMin = track.minAltitude;
    const rawMax = track.maxAltitude;
    const pad = Math.max(5, (rawMax - rawMin) * 0.05);
    const minEle = rawMin - pad;
    const maxEle = rawMax + pad;
    const eleSpan = maxEle - minEle || 1;

    const xOf = (distance: number) => MARGIN.left + ((distance - viewStart) / viewSpan) * plotW;

    // Repères + niveaux de label (basés sur X, indépendants de la marge haute).
    // On ne conserve que ceux compris dans la fenêtre visible.
    const markers = this.buildPlotMarkers(xOf, maxDistance, track).filter(
      (m) => m.distance >= viewStart - 1e-6 && m.distance <= viewEnd + 1e-6,
    );
    this.assignLabelLevels(markers);
    const maxLevel = markers.reduce((max, m) => Math.max(max, m.labelLevel), 0);
    // Marge haute dynamique : réserve juste la place nécessaire aux labels
    // échelonnés (pas de vide inutile quand ils ne se chevauchent pas).
    const marginTop = BASE_TOP + maxLevel * LABEL_STEP_UNITS;

    const plotH = VIEW_HEIGHT - marginTop - MARGIN.bottom;
    const baselineY = VIEW_HEIGHT - MARGIN.bottom;
    const yOf = (ele: number) => marginTop + (1 - (ele - minEle) / eleSpan) * plotH;

    // L'altitude Y des repères dépend de la marge : calculée une fois connue.
    for (const marker of markers) {
      marker.y = marker.altitude != null ? yOf(marker.altitude) : marginTop;
    }

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

    const yTicks = this.buildYTicks(rawMin, rawMax, yOf);
    const xTicks = this.buildXTicks(viewStart, viewEnd, xOf);

    return { plot, linePath, areaPath, markers, yTicks, xTicks, baselineY, marginTop };
  }

  /** Construit les repères SVG (X et altitude) ; le Y est fixé ensuite. */
  private buildPlotMarkers(
    xOf: (d: number) => number,
    maxDistance: number,
    track: GpxTrack,
  ): PlotMarker[] {
    const first = track.points[0];
    const last = track.points[track.points.length - 1];
    const result: PlotMarker[] = [];

    // D+ cumulé (m) interpolé à une distance donnée, à partir des points de la trace.
    const points = track.points;
    const gainAt = (distance: number): number | null => {
      if (points.length === 0) return null;
      if (distance <= points[0]!.distance) return points[0]!.elevationGain;
      const lastPt = points[points.length - 1]!;
      if (distance >= lastPt.distance) return lastPt.elevationGain;
      for (let i = 1; i < points.length; i++) {
        const p = points[i]!;
        if (p.distance >= distance) {
          const prev = points[i - 1]!;
          const span = p.distance - prev.distance || 1;
          const t = (distance - prev.distance) / span;
          return prev.elevationGain + (p.elevationGain - prev.elevationGain) * t;
        }
      }
      return lastPt.elevationGain;
    };

    if (first) {
      result.push({
        id: '__start__',
        name: 'Départ',
        kind: 'START',
        x: xOf(0),
        y: 0,
        altitude: first.ele,
        distance: 0,
        durationLabel: null,
        cumulativeGain: 0,
        labelLevel: 0,
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
        y: 0,
        altitude,
        distance: marker.distanceFromStart,
        durationLabel: this.formatDuration(marker.estimatedDurationFromStart),
        cumulativeGain: gainAt(distance),
        labelLevel: 0,
      });
    }

    if (last) {
      result.push({
        id: '__finish__',
        name: 'Arrivée',
        kind: 'FINISH',
        x: xOf(last.distance),
        y: 0,
        altitude: last.ele,
        distance: last.distance,
        durationLabel: null,
        cumulativeGain: last.elevationGain,
        labelLevel: 0,
      });
    }

    return result;
  }

  /**
   * Attribue un niveau vertical à chaque label pour éviter les chevauchements :
   * les repères sont parcourus par distance croissante ; un repère trop proche
   * (en X) d'un autre déjà placé sur un niveau monte au niveau suivant.
   */
  private assignLabelLevels(markers: PlotMarker[]): void {
    const laneLastX: number[] = [];
    for (const marker of markers) {
      let level = 0;
      while (
        level < MAX_LABEL_LEVEL &&
        laneLastX[level] != null &&
        marker.x - laneLastX[level]! < LABEL_MIN_GAP
      ) {
        level++;
      }
      marker.labelLevel = level;
      laneLastX[level] = marker.x;
    }
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

  /** Graduations de distance (5 paliers) sur la fenêtre visible. */
  private buildXTicks(viewStart: number, viewEnd: number, xOf: (d: number) => number): AxisTick[] {
    const ticks: AxisTick[] = [];
    const steps = 5;
    const span = viewEnd - viewStart;
    for (let i = 0; i <= steps; i++) {
      const distance = viewStart + (span * i) / steps;
      ticks.push({ pos: xOf(distance), label: `${this.formatKm(distance)}` });
    }
    return ticks;
  }

  /** Vrai pour un point de passage (ni départ ni arrivée). */
  protected isPoint(marker: PlotMarker): boolean {
    return marker.kind !== 'START' && marker.kind !== 'FINISH';
  }

  /** Couleur d'un repère selon son type. */
  protected markerColor(marker: PlotMarker): string {
    if (marker.kind === 'START') return '#10b981';
    if (marker.kind === 'FINISH') return '#334155';
    return routePointKindColor(marker.kind);
  }

  protected markerTooltip(marker: PlotMarker): string {
    const parts = [marker.name, `km ${this.formatKm(marker.distance)}`];
    if (marker.altitude != null) parts.push(`${Math.round(marker.altitude)} m`);
    if (marker.durationLabel) parts.push(marker.durationLabel);
    return parts.join(' · ');
  }

  /** Zoom à la molette (⌘ sur Mac / Ctrl sur Windows), centré sous le curseur. */
  protected onWheel(event: WheelEvent): void {
    // Sans modificateur, on laisse défiler la page normalement.
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }
    const vbX = this.clientToVbX(event.clientX);
    if (vbX == null) {
      return;
    }
    event.preventDefault();
    const plotW = VIEW_WIDTH - MARGIN.left - MARGIN.right;
    const focusPlotFrac = Math.min(1, Math.max(0, (vbX - MARGIN.left) / plotW));
    this.zoomAround(focusPlotFrac, event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  }

  /** Zoom avant, centré sur la fenêtre visible. */
  zoomIn(): void {
    this.zoomAround(0.5, ZOOM_STEP);
  }

  /** Zoom arrière, centré sur la fenêtre visible. */
  zoomOut(): void {
    this.zoomAround(0.5, 1 / ZOOM_STEP);
  }

  /** Réinitialise le zoom/pan (trace entière). */
  resetZoom(): void {
    this.viewStartFrac.set(0);
    this.viewSpanFrac.set(1);
  }

  /**
   * Modifie la largeur visible par un facteur, en gardant fixe le point de mise
   * au point (`focusPlotFrac` = position 0..1 dans la zone de tracé).
   */
  private zoomAround(focusPlotFrac: number, factor: number): void {
    const oldSpan = this.viewSpanFrac();
    const newSpan = Math.min(1, Math.max(MIN_SPAN_FRAC, oldSpan * factor));
    if (newSpan === oldSpan) {
      return;
    }
    const focusFrac = this.viewStartFrac() + focusPlotFrac * oldSpan;
    this.viewSpanFrac.set(newSpan);
    this.setViewStart(focusFrac - focusPlotFrac * newSpan);
  }

  /** Fixe le bord gauche de la fenêtre visible en le bornant à [0, 1 - largeur]. */
  private setViewStart(start: number): void {
    const max = 1 - this.viewSpanFrac();
    this.viewStartFrac.set(Math.min(max, Math.max(0, start)));
  }

  /** Amorce un déplacement si l'appui est proche d'un point de passage. */
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
      if (!this.isPoint(marker)) {
        continue;
      }
      const d = Math.abs(marker.x - vbX);
      if (d <= best) {
        best = d;
        target = marker;
      }
    }
    if (target) {
      this.draggingId.set(target.id);
      this.dragStartVbX = vbX;
      this.dragDistance = target.distance;
      this.svgEl().nativeElement.setPointerCapture(event.pointerId);
      return;
    }
    // Aucun repère sous le pointeur : si zoomé, on amorce un pan horizontal.
    if (this.isZoomed()) {
      this.panning.set(true);
      this.panStartVbX = vbX;
      this.panStartFrac = this.viewStartFrac();
      this.svgEl().nativeElement.setPointerCapture(event.pointerId);
    }
  }

  /** Met à jour le survol et, le cas échéant, le déplacement/pan en cours. */
  protected onPointerMove(event: PointerEvent): void {
    if (this.panning()) {
      const vbX = this.clientToVbX(event.clientX);
      if (vbX != null) {
        const plotW = VIEW_WIDTH - MARGIN.left - MARGIN.right;
        const deltaFrac = ((vbX - this.panStartVbX) / plotW) * this.viewSpanFrac();
        this.setViewStart(this.panStartFrac - deltaFrac);
        this.suppressClick = true;
      }
      return;
    }
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
    if (this.panning()) {
      this.panning.set(false);
      this.svgEl().nativeElement.releasePointerCapture(event.pointerId);
      return;
    }
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
    // Ne pas interrompre un glisser/pan en cours si le pointeur sort brièvement.
    if (this.draggingId() != null || this.panning()) {
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
