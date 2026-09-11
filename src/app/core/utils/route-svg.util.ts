/**
 * Génération d'un **tracé** (mini-carte) et d'un **profil altimétrique** au
 * format **SVG inline** à partir d'une trace GPX et de ses points de passage —
 * **fonctions pures**, sans dépendance Angular ni DOM. Aucune ressource externe
 * (tuiles, polices) n'est requise : le rendu est autonome, adapté à un export
 * PDF imprimable.
 */

import type { GpxTrack, GpxTrackPoint, RoutePointMarker } from '../models';
import { ROUTE_POINT_KIND_META } from './route-point.util';

/** Échappe une valeur pour une insertion sûre dans du XML/SVG. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Réduit un tableau de points à au plus `max` éléments (échantillonnage régulier). */
function downsample<T>(points: readonly T[], max: number): T[] {
  if (points.length <= max) {
    return points.slice();
  }
  const step = points.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(points[Math.floor(i * step)]!);
  }
  out.push(points[points.length - 1]!);
  return out;
}

/**
 * Construit le tracé du parcours (vue de dessus) en SVG **avec fond de carte
 * OpenStreetMap**. Les coordonnées sont projetées en Web Mercator (identique aux
 * tuiles), le zoom est choisi pour cadrer le parcours, et les tuiles couvrant la
 * zone sont incrustées. Les points de passage positionnés sont numérotés.
 */
export function buildTrackMapSvg(track: GpxTrack, markers: readonly RoutePointMarker[]): string {
  const pts = downsample(track.points, 700).filter(
    (p): p is GpxTrackPoint => p.lat != null && p.lon != null,
  );
  if (pts.length < 2) {
    return '';
  }

  const TILE = 256;
  const TARGET_PX = 1000;
  const MIN_ZOOM = 2;
  const MAX_ZOOM = 17;

  /** Projette (lat, lon) en pixels monde Web Mercator au zoom `z`. */
  const project = (lat: number, lon: number, z: number): { x: number; y: number } => {
    const n = Math.pow(2, z);
    const x = ((lon + 180) / 360) * n * TILE;
    const latRad = (lat * Math.PI) / 180;
    const y =
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE;
    return { x, y };
  };

  const { minLat, minLon, maxLat, maxLon } = track.bbox;

  // Choisit le plus grand zoom dont l'emprise tient dans la cible en pixels.
  let zoom = MIN_ZOOM;
  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z--) {
    const tl = project(maxLat, minLon, z);
    const br = project(minLat, maxLon, z);
    if (Math.max(Math.abs(br.x - tl.x), Math.abs(br.y - tl.y)) <= TARGET_PX) {
      zoom = z;
      break;
    }
  }

  const n = Math.pow(2, zoom);
  const tl = project(maxLat, minLon, zoom);
  const br = project(minLat, maxLon, zoom);
  const minX = Math.min(tl.x, br.x);
  const maxX = Math.max(tl.x, br.x);
  const minY = Math.min(tl.y, br.y);
  const maxY = Math.max(tl.y, br.y);

  // Zone affichée = emprise du tracé + marge, étendue au ratio du cadre imprimé
  // (largeur/hauteur) pour remplir la page sans recadrer ni déformer le tracé.
  const TARGET_ASPECT = 1.08;
  const basePad = 24;
  let regMinX = minX - basePad;
  let regMaxX = maxX + basePad;
  let regMinY = minY - basePad;
  let regMaxY = maxY + basePad;
  let w = regMaxX - regMinX;
  let h = regMaxY - regMinY;
  if (w / h < TARGET_ASPECT) {
    const extra = (h * TARGET_ASPECT - w) / 2;
    regMinX -= extra;
    regMaxX += extra;
    w = regMaxX - regMinX;
  } else {
    const extra = (w / TARGET_ASPECT - h) / 2;
    regMinY -= extra;
    regMaxY += extra;
    h = regMaxY - regMinY;
  }

  const width = w;
  const height = h;
  const lx = (wx: number) => wx - regMinX;
  const ly = (wy: number) => wy - regMinY;

  // Tuiles couvrant toute la zone affichée, avec repli des index x.
  const txMin = Math.floor(regMinX / TILE);
  const txMax = Math.floor(regMaxX / TILE);
  const tyMin = Math.floor(regMinY / TILE);
  const tyMax = Math.floor(regMaxY / TILE);
  let tiles = '';
  for (let tx = txMin; tx <= txMax; tx++) {
    for (let ty = tyMin; ty <= tyMax; ty++) {
      if (ty < 0 || ty >= n) continue;
      const wrappedX = ((tx % n) + n) % n;
      const url = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`;
      // Tuiles légèrement agrandies (+1 px) pour masquer les coutures au scaling.
      tiles += `<image href="${url}" xlink:href="${url}" x="${lx(tx * TILE).toFixed(
        1,
      )}" y="${ly(ty * TILE).toFixed(1)}" width="${TILE + 1}" height="${TILE + 1}" />`;
    }
  }

  const line = pts
    .map((p) => {
      const w = project(p.lat, p.lon, zoom);
      return `${lx(w.x).toFixed(1)},${ly(w.y).toFixed(1)}`;
    })
    .join(' ');

  const startW = project(pts[0]!.lat, pts[0]!.lon, zoom);
  const endW = project(pts[pts.length - 1]!.lat, pts[pts.length - 1]!.lon, zoom);

  const markerDots = markers
    .filter((m) => m.latitude != null && m.longitude != null)
    .map((m, i) => {
      const w = project(m.latitude!, m.longitude!, zoom);
      const cx = lx(w.x).toFixed(1);
      const cy = ly(w.y).toFixed(1);
      const color = ROUTE_POINT_KIND_META[m.kind]?.color ?? '#6366f1';
      return `
      <circle cx="${cx}" cy="${cy}" r="8" fill="#fff" stroke="${color}" stroke-width="2" />
      <text x="${cx}" y="${cy}" dy="3" text-anchor="middle" font-size="9" font-weight="700" fill="${color}">${i + 1}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="route-svg route-map" role="img" aria-label="Tracé du parcours">
    ${tiles}
    <polyline points="${line}" fill="none" stroke="#f3612f" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.9" />
    <circle cx="${lx(startW.x).toFixed(1)}" cy="${ly(startW.y).toFixed(1)}" r="6" fill="#16a34a" stroke="#fff" stroke-width="2" />
    <circle cx="${lx(endW.x).toFixed(1)}" cy="${ly(endW.y).toFixed(1)}" r="6" fill="#dc2626" stroke="#fff" stroke-width="2" />
    ${markerDots}
    <text x="${(width - 4).toFixed(0)}" y="${(height - 5).toFixed(0)}" text-anchor="end" font-size="9" fill="#334155" opacity="0.8">© OpenStreetMap</text>
  </svg>`;
}

/**
 * Construit le profil altimétrique (altitude vs distance) en SVG : aire remplie,
 * axes min/max et marqueurs verticaux numérotés pour chaque point de passage.
 */
export function buildElevationProfileSvg(
  track: GpxTrack,
  markers: readonly RoutePointMarker[],
): string {
  const pts = downsample(track.points, 800);
  if (pts.length < 2) {
    return '';
  }

  const width = 760;
  const height = 190;
  const padL = 42;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const baseY = padT + plotH;

  const maxDist = Math.max(track.distance, pts[pts.length - 1]!.distance, 1e-6);
  const minAlt = track.minAltitude;
  const maxAlt = track.maxAltitude;
  const altSpan = Math.max(maxAlt - minAlt, 1e-6);

  const x = (d: number) => padL + (d / maxDist) * plotW;
  const y = (e: number) => padT + (1 - (e - minAlt) / altSpan) * plotH;

  const linePts = pts.map((p) => `${x(p.distance).toFixed(1)},${y(p.ele).toFixed(1)}`);
  const areaPath = `M ${x(pts[0]!.distance).toFixed(1)},${baseY.toFixed(1)} L ${linePts.join(
    ' L ',
  )} L ${x(pts[pts.length - 1]!.distance).toFixed(1)},${baseY.toFixed(1)} Z`;

  const gridLines = [minAlt, (minAlt + maxAlt) / 2, maxAlt]
    .map((alt) => {
      const gy = y(alt).toFixed(1);
      return `
      <line x1="${padL}" y1="${gy}" x2="${width - padR}" y2="${gy}" stroke="#e2e8f0" stroke-width="1" />
      <text x="${padL - 6}" y="${gy}" dy="3" text-anchor="end" font-size="9" fill="#94a3b8">${Math.round(
        alt,
      )}</text>`;
    })
    .join('');

  const markerLines = markers
    .filter((m) => m.distanceFromStart != null)
    .map((m, i) => {
      const mx = x(m.distanceFromStart).toFixed(1);
      const color = ROUTE_POINT_KIND_META[m.kind]?.color ?? '#6366f1';
      const topY = padT + 2;
      return `
      <line x1="${mx}" y1="${topY}" x2="${mx}" y2="${baseY}" stroke="${color}" stroke-width="1" stroke-dasharray="3 2" opacity="0.7" />
      <circle cx="${mx}" cy="${topY + 6}" r="7" fill="${color}" />
      <text x="${mx}" y="${topY + 6}" dy="3" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${i + 1}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="route-svg route-profile" role="img" aria-label="Profil altimétrique">
    ${gridLines}
    <path d="${areaPath}" fill="#f3612f" fill-opacity="0.12" />
    <polyline points="${linePts.join(' ')}" fill="none" stroke="#f3612f" stroke-width="1.6" stroke-linejoin="round" />
    ${markerLines}
    <text x="${padL}" y="${height - 6}" font-size="9" fill="#94a3b8">0 km</text>
    <text x="${width - padR}" y="${height - 6}" text-anchor="end" font-size="9" fill="#94a3b8">${maxDist.toFixed(
      1,
    )} km</text>
  </svg>`;
}

/** Numéro d'étape (1-based) affiché à côté d'un marqueur, avec puce colorée. */
export function routeMarkerBadge(kind: RoutePointMarker['kind'], index: number): string {
  const color = ROUTE_POINT_KIND_META[kind]?.color ?? '#6366f1';
  return `<span class="step-badge" style="background:${esc(color)}">${index + 1}</span>`;
}
