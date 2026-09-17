import type {
  NutrientGoalKey,
  RaceStrategy,
  NutritionProduct,
  GpxTrack,
  RoutePointKind,
} from '../models';
import { enabledGoals, type ResolvedGoal } from './nutrition-goals.util';
import { resolveIntakeProduct } from './water.util';
import { formatMinutes } from './plan-layout.util';
import { buildInventoryLocations } from './inventory-allocation.util';
import { buildRouteMarkers, routePointKindLabel } from './route-point.util';
import { buildTrackMapSvg, buildElevationProfileSvg, routeMarkerBadge } from './route-svg.util';
import { interpolateAtDistance, type ProcessedTrackPoint } from './gpx.util';
import { formatPassageTime } from './passage-time.util';
import { buildPacingSegments, PACING_DIFFICULTY_LABELS } from './pacing.util';

/** Échappe une chaîne pour une insertion sûre dans du HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formate un nombre avec un nombre fixe de décimales, sans zéros superflus. */
function num(value: number, decimals = 0): string {
  return Number.isFinite(value)
    ? value.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      })
    : '—';
}

/** Formate une date ISO `YYYY-MM-DD` en libellé lisible (fr-FR). */
function formatDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface InventoryRow {
  name: string;
  brand: string;
  category: string;
  quantity: number;
  weight: number;
  energy: number;
  carbs: number;
}

interface PlanRow {
  start: number;
  end: number;
  name: string;
  quantity: number;
  energy: number;
  carbs: number;
}

/** Apport planifié vs cible d'un nutriment sur une tranche horaire. */
interface RecapNutrient {
  key: NutrientGoalKey;
  label: string;
  unit: string;
  planned: number;
  target: number;
}

interface RecapRow {
  hour: number;
  nutrients: RecapNutrient[];
}

/** Construit la table produit par identifiant (catalogue + dénormalisés). */
function buildProductMap(
  event: RaceStrategy,
  products: NutritionProduct[],
): Map<string, NutritionProduct> {
  const map = new Map<string, NutritionProduct>();
  for (const product of products) map.set(product.id, product);
  for (const item of event.items) if (item.product) map.set(item.productId, item.product);
  for (const intake of event.intakes ?? []) {
    if (intake.product && intake.productId) map.set(intake.productId, intake.product);
  }
  return map;
}

/** Compose les données de l'inventaire (lignes + totaux). */
function buildInventory(event: RaceStrategy, map: Map<string, NutritionProduct>) {
  const rows: InventoryRow[] = [];
  const totals = { weight: 0, energy: 0, carbs: 0, fats: 0, proteins: 0, sodium: 0 };
  for (const item of event.items) {
    const product = item.product ?? map.get(item.productId);
    if (!product) continue;
    const qty = item.quantity;
    rows.push({
      name: product.name,
      brand: product.brand,
      category: product.category?.name ?? '',
      quantity: qty,
      weight: product.unitWeight * qty,
      energy: product.energy * qty,
      carbs: product.carbs * qty,
    });
    totals.weight += product.unitWeight * qty;
    totals.energy += product.energy * qty;
    totals.carbs += product.carbs * qty;
    totals.fats += product.fats * qty;
    totals.proteins += product.proteins * qty;
    totals.sodium += product.sodium * qty;
  }
  rows.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { rows, totals };
}

/** Compose les prises planifiées (triées) et le récapitulatif horaire. */
function buildPlan(
  event: RaceStrategy,
  map: Map<string, NutritionProduct>,
  goals: ResolvedGoal[],
) {
  const total = event.targetTimeMinutes ?? 0;
  const rows: PlanRow[] = [];
  for (const intake of event.intakes ?? []) {
    const product = resolveIntakeProduct(intake, map);
    if (!product) continue;
    rows.push({
      start: intake.startMinute,
      end: intake.startMinute + intake.durationMinutes,
      name: product.name,
      quantity: intake.quantity,
      energy: product.energy * intake.quantity,
      carbs: product.carbs * intake.quantity,
    });
  }
  rows.sort((a, b) => a.start - b.start || a.end - b.end);

  const recap: RecapRow[] = [];
  if (total > 0 && goals.length > 0) {
    const hours = Math.ceil(total / 60);
    for (let h = 0; h < hours; h++) {
      const minutesInHour = Math.min(60, total - h * 60);
      recap.push({
        hour: h + 1,
        nutrients: goals.map((goal) => ({
          key: goal.key,
          label: goal.label,
          unit: goal.unit,
          planned: 0,
          target: (goal.hourly * minutesInHour) / 60,
        })),
      });
    }
    for (const intake of event.intakes ?? []) {
      const product = resolveIntakeProduct(intake, map);
      if (!product || intake.durationMinutes <= 0) continue;
      const start = intake.startMinute;
      const end = intake.startMinute + intake.durationMinutes;
      for (let h = 0; h < hours; h++) {
        const overlap = Math.min(end, (h + 1) * 60) - Math.max(start, h * 60);
        if (overlap <= 0) continue;
        for (const nutrient of recap[h].nutrients) {
          if (nutrient.key === 'weight') continue;
          const perMin = (product[nutrient.key] * intake.quantity) / intake.durationMinutes;
          nutrient.planned += perMin * overlap;
        }
      }
    }
  }
  return { rows, recap };
}

/** Une ligne de sac logistique : libellé, sous-titre (marque) et quantité. */
interface LogisticEntry {
  label: string;
  sub: string;
  quantity: number;
}

/** Contenu logistique d'un emplacement (départ ou ravitaillement). */
interface LogisticBag {
  name: string;
  minute: number | null;
  via: string;
  note: string;
  access: string;
  pickup: LogisticEntry[];
  drop: LogisticEntry[];
}

/**
 * Compose la logistique : le sac de départ (produits à emporter) puis, pour
 * chaque ravitaillement avec logistique (assistance / drop bag), le contenu à
 * récupérer et, le cas échéant, à déposer (produits du catalogue + matériel).
 */
function buildLogistics(event: RaceStrategy, map: Map<string, NutritionProduct>): LogisticBag[] {
  const viaLabel = (via?: string): string =>
    via === 'ASSISTANCE' ? 'Assistance' : via === 'DROP_BAG' ? 'Drop bag' : '';

  const bags: LogisticBag[] = [];

  // Sac de départ : produits effectivement portés dès le départ.
  const startLocation = buildInventoryLocations(event, map).find((l) => l.kind === 'start');
  const startPickup: LogisticEntry[] = (startLocation?.items ?? []).map((item) => ({
    label: item.product.name,
    sub: item.product.brand,
    quantity: item.quantity,
  }));
  if (startPickup.length > 0) {
    bags.push({ name: 'Départ', minute: 0, via: '', note: '', access: '', pickup: startPickup, drop: [] });
  }

  // Sacs des ravitaillements avec logistique, triés par temps de passage.
  const stations = (event.aidStations ?? [])
    .filter((station) => station.logisticVia != null)
    .slice()
    .sort((a, b) => a.estimatedDurationFromStart - b.estimatedDurationFromStart);

  const mapLogisticItem = (item: {
    kind: string;
    productId?: string;
    product?: NutritionProduct;
    label?: string;
    quantity: number;
  }): LogisticEntry => {
    if (item.kind === 'product' && item.productId) {
      const product = item.product ?? map.get(item.productId);
      return { label: product?.name ?? 'Produit', sub: product?.brand ?? '', quantity: item.quantity };
    }
    return { label: item.label ?? 'Matériel', sub: '', quantity: item.quantity };
  };

  for (const station of stations) {
    bags.push({
      name: station.name,
      minute: station.estimatedDurationFromStart,
      via: viaLabel(station.logisticVia),
      note: station.note ?? '',
      access: station.accessInfo ?? '',
      pickup: (station.pickup ?? []).map(mapLogisticItem),
      drop: (station.drop ?? []).map(mapLogisticItem),
    });
  }

  return bags;
}

/** Point de passage prêt pour l'assistance (position, relief cumulé, horaire). */
interface PassagePoint {
  name: string;
  typeLabel: string;
  /** Accès saisi (adresse/GPS pour l'assistance), vide si non renseigné. */
  address: string;
  lat?: number;
  lon?: number;
  /** Distance depuis le départ (km). */
  distance: number;
  altitude?: number;
  /** Dénivelé positif cumulé depuis le départ (m). */
  gain: number;
  /** Dénivelé négatif cumulé depuis le départ (m). */
  loss: number;
  /** Temps de passage estimé depuis le départ (minutes). */
  timeMinutes?: number;
  /** Nature (pour la pastille), absente pour départ/arrivée. */
  kind?: RoutePointKind;
  /** Numéro (1-based) du marqueur sur la carte/profil, pour recoupement. */
  markerIndex?: number;
  role: 'start' | 'point' | 'finish';
}

/**
 * Construit la liste des points de passage pour la fiche assistance : départ,
 * ravitaillements, points de passage et arrivée. Position, altitude et D+/D-
 * cumulés sont interpolés sur la trace quand ils ne sont pas saisis.
 */
function buildPassagePoints(event: RaceStrategy, track: GpxTrack): PassagePoint[] {
  const pts = track.points as unknown as ProcessedTrackPoint[];
  const first = pts[0];
  const last = pts[pts.length - 1];
  const markers = buildRouteMarkers(event.aidStations ?? [], track, event.waypoints ?? []);
  const indexById = new Map<string, number>();
  markers.forEach((m, i) => indexById.set(m.id, i + 1));

  const points: PassagePoint[] = [
    {
      name: 'Départ',
      typeLabel: 'Départ',
      address: event.location ?? '',
      lat: first?.lat,
      lon: first?.lon,
      distance: 0,
      altitude: first ? Math.round(first.ele) : undefined,
      gain: 0,
      loss: 0,
      timeMinutes: 0,
      role: 'start',
    },
  ];

  for (const s of event.aidStations ?? []) {
    if (s.distanceFromStart == null) continue;
    const p = interpolateAtDistance(pts, s.distanceFromStart);
    points.push({
      name: s.name,
      typeLabel: 'Ravitaillement',
      address: s.accessInfo ?? '',
      lat: s.latitude ?? p?.lat,
      lon: s.longitude ?? p?.lon,
      distance: s.distanceFromStart,
      altitude: s.altitude ?? (p ? Math.round(p.ele) : undefined),
      gain: s.elevationGainFromStart ?? (p ? Math.round(p.elevationGain) : 0),
      loss: p ? Math.round(p.elevationLoss) : 0,
      timeMinutes: s.estimatedDurationFromStart,
      kind: 'AID_STATION',
      markerIndex: indexById.get(s.id),
      role: 'point',
    });
  }

  for (const w of event.waypoints ?? []) {
    if (w.distanceFromStart == null) continue;
    const p = interpolateAtDistance(pts, w.distanceFromStart);
    points.push({
      name: w.name,
      typeLabel: routePointKindLabel(w.kind),
      address: '',
      lat: w.latitude ?? p?.lat,
      lon: w.longitude ?? p?.lon,
      distance: w.distanceFromStart,
      altitude: w.altitude ?? (p ? Math.round(p.ele) : undefined),
      gain: w.elevationGainFromStart ?? (p ? Math.round(p.elevationGain) : 0),
      loss: p ? Math.round(p.elevationLoss) : 0,
      timeMinutes: w.estimatedDurationFromStart,
      kind: w.kind,
      markerIndex: indexById.get(w.id),
      role: 'point',
    });
  }

  points.push({
    name: 'Arrivée',
    typeLabel: 'Arrivée',
    address: '',
    lat: last?.lat,
    lon: last?.lon,
    distance: track.distance,
    altitude: last ? Math.round(last.ele) : undefined,
    gain: last ? Math.round(last.elevationGain) : 0,
    loss: last ? Math.round(last.elevationLoss) : 0,
    timeMinutes: event.targetTimeMinutes,
    role: 'finish',
  });

  return points.sort((a, b) => a.distance - b.distance);
}

/**
 * Construit un document HTML autonome et imprimable (destiné à « Enregistrer
 * en PDF ») récapitulant une stratégie de course : parcours, points de passage,
 * inventaire des produits emportés et plan de nutrition planifié.
 */
export function buildStrategyPdfHtml(
  event: RaceStrategy,
  products: NutritionProduct[],
  track?: GpxTrack | null,
): string {
  const map = buildProductMap(event, products);
  const { rows: inventoryRows, totals } = buildInventory(event, map);
  const goals = enabledGoals(event);
  const hourlyGoals = goals.filter((g) => g.mode === 'hourly');
  const { rows: planRows } = buildPlan(event, map, hourlyGoals);
  const logisticBags = buildLogistics(event, map);
  const total = event.targetTimeMinutes ?? 0;

  const meta: string[] = [];
  if (event.date) meta.push(formatDate(event.date));
  if (event.location) meta.push(escapeHtml(event.location));
  if (event.distance) meta.push(`${num(event.distance, 1)} km`);
  if (event.elevationGain) meta.push(`+${num(event.elevationGain)} m D+`);
  if (total > 0) meta.push(`Objectif ${formatMinutes(total)}`);

  const inventoryBody =
    inventoryRows.length > 0
      ? inventoryRows
          .map(
            (r) => `
            <tr>
              <td>${escapeHtml(r.name)}${
                r.brand ? `<span class="muted"> · ${escapeHtml(r.brand)}</span>` : ''
              }</td>
              <td>${escapeHtml(r.category)}</td>
              <td class="right">${num(r.quantity)}</td>
              <td class="right">${num(r.weight)} g</td>
              <td class="right">${num(r.energy)} kcal</td>
              <td class="right">${num(r.carbs)} g</td>
            </tr>`,
          )
          .join('')
      : `<tr><td colspan="6" class="muted center">Aucun produit emporté.</td></tr>`;

  const coverage = (value: number, target: number): string => {
    if (target <= 0) return '';
    const pct = Math.round((value / target) * 100);
    return ` <span class="muted">(${pct}% de ${num(target)})</span>`;
  };

  const planBody =
    planRows.length > 0
      ? planRows
          .map(
            (r) => `
            <tr>
              <td>${formatMinutes(r.start)}<span class="muted"> → ${formatMinutes(
                r.end,
              )}</span></td>
              <td>${escapeHtml(r.name)}</td>
              <td class="right">${num(r.quantity)}</td>
              <td class="right">${num(r.energy)} kcal</td>
              <td class="right">${num(r.carbs)} g</td>
            </tr>`,
          )
          .join('')
      : `<tr><td colspan="5" class="muted center">Aucune prise planifiée.</td></tr>`;

  /** Items de synthèse pour chaque objectif actif (emporté + couverture). */
  const goalSummary = goals
    .map((g) => {
      const target = g.mode === 'total' ? g.hourly : total > 0 ? (g.hourly * total) / 60 : 0;
      return `<div class="item"><div class="label">${escapeHtml(g.label)}</div><div class="value">${num(
        totals[g.key],
      )} ${g.unit}${coverage(totals[g.key], target)}</div></div>`;
    })
    .join('');

  /** Synthèse des quantités emportées (poids + objectifs), affichée dans la section nutrition. */
  const nutritionSummary = `
        <div class="summary">
          <div class="item"><div class="label">Poids total</div><div class="value">${num(
            totals.weight,
          )} g</div></div>
          ${goalSummary}
        </div>`;

  const bagEntries = (entries: LogisticEntry[]): string =>
    entries
      .map(
        (e) => `
        <tr>
          <td>${escapeHtml(e.label)}${
            e.sub ? `<span class="muted"> · ${escapeHtml(e.sub)}</span>` : ''
          }</td>
          <td class="right">${num(e.quantity)}</td>
        </tr>`,
      )
      .join('');

  const logisticsSection =
    logisticBags.length > 0
      ? `
      <section class="sec sec-log">
        <h2>Logistique</h2>
        <p class="sec-intro">Préparez un sac par point ci-dessous.</p>
        <div class="bags">
        ${logisticBags
          .map((bag) => {
            const isStart = bag.name === 'Départ';
            const badgeText = isStart ? 'Départ' : bag.via || 'Ravitaillement';
            const badgeClass = isStart
              ? 'badge-start'
              : bag.via === 'Assistance'
                ? 'badge-assist'
                : 'badge-drop';
            const pickupTable =
              bag.pickup.length > 0
                ? `
              <h3>${isStart ? 'À emporter' : 'À récupérer'}</h3>
              <table>
                <thead><tr><th>Élément</th><th class="right">Qté</th></tr></thead>
                <tbody>${bagEntries(bag.pickup)}</tbody>
              </table>`
                : `<p class="muted">Rien à récupérer.</p>`;
            const dropTable =
              bag.drop.length > 0
                ? `
              <h3>À déposer</h3>
              <table>
                <thead><tr><th>Élément</th><th class="right">Qté</th></tr></thead>
                <tbody>${bagEntries(bag.drop)}</tbody>
              </table>`
                : '';
            return `
          <div class="bag ${badgeClass}">
            <div class="bag-head">
              <span class="bag-name">${escapeHtml(bag.name)}</span>
              <span class="bag-badge">${escapeHtml(badgeText)}</span>
            </div>
            ${
              bag.minute != null && !isStart
                ? `<div class="bag-meta">Passage estimé : ${formatMinutes(bag.minute)}</div>`
                : ''
            }
            ${
              bag.access
                ? `<div class="bag-access">📍 ${escapeHtml(bag.access)}
                     <a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(
                       bag.access,
                     )}">Ouvrir dans Maps</a>
                   </div>`
                : ''
            }
            ${bag.note ? `<div class="bag-note">${escapeHtml(bag.note)}</div>` : ''}
            <div class="bag-body">
              ${pickupTable}
              ${dropTable}
            </div>
          </div>`;
          })
          .join('')}
        </div>
      </section>`
      : '';

  const planSection =
    total > 0
      ? `
      <section class="sec sec-plan">
        <h2>Plan de nutrition</h2>
        ${nutritionSummary}
        <table>
          <thead>
            <tr>
              <th>Créneau</th>
              <th>Produit</th>
              <th class="right">Qté</th>
              <th class="right">Énergie</th>
              <th class="right">Glucides</th>
            </tr>
          </thead>
          <tbody>${planBody}</tbody>
        </table>
      </section>`
      : `
      <section class="sec sec-plan">
        <h2>Plan de nutrition</h2>
        ${nutritionSummary}
        <p class="muted">Définissez un chrono cible sur l'évènement pour construire le plan.</p>
      </section>`;

  // Section Parcours : tracé + profil altimétrique + étapes (ravitaillements et
  // points de passage), uniquement si une trace GPX est disponible.
  const routeMarkers =
    track != null
      ? buildRouteMarkers(event.aidStations ?? [], track, event.waypoints ?? [])
      : [];
  const routeSection =
    track != null
      ? `
      <section class="sec sec-route">
        <h2>Parcours</h2>
        <div class="route-figs">
          <figure class="route-fig">
            <figcaption>Profil altimétrique</figcaption>
            ${buildElevationProfileSvg(track, routeMarkers)}
          </figure>
          <figure class="route-fig">
            <figcaption>Tracé</figcaption>
            ${buildTrackMapSvg(track, routeMarkers)}
          </figure>
        </div>
      </section>`
      : '';

  // Section Points de passage (fiche assistance), sur une nouvelle page.
  const passageBadge = (p: PassagePoint): string => {
    if (p.role === 'start') return `<span class="step-badge" style="background:#16a34a">D</span>`;
    if (p.role === 'finish') return `<span class="step-badge" style="background:#dc2626">A</span>`;
    return p.kind != null && p.markerIndex != null ? routeMarkerBadge(p.kind, p.markerIndex - 1) : '';
  };
  const accessCell = (p: PassagePoint): string => {
    const address = p.address?.trim();
    let text: string;
    let query: string;
    if (address) {
      text = escapeHtml(address);
      query = address;
    } else if (p.lat != null && p.lon != null) {
      text = `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
      query = `${p.lat},${p.lon}`;
    } else {
      return '<span class="muted">—</span>';
    }
    return `${text} <a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(
      query,
    )}">Maps</a>`;
  };
  const passageSection =
    track != null
      ? `
      <section class="sec sec-passages">
        <h2>Points de passage</h2>
        <table class="passages">
          <thead>
            <tr>
              <th></th>
              <th>Point</th>
              <th>Accès (adresse / GPS)</th>
              <th class="right">Km</th>
              <th class="right">Alt.</th>
              <th class="right">Passage</th>
            </tr>
          </thead>
          <tbody>
            ${buildPassagePoints(event, track)
              .map(
                (p) => `
            <tr>
              <td>${passageBadge(p)}</td>
              <td>${escapeHtml(p.name)}<div class="muted">${escapeHtml(p.typeLabel)}</div></td>
              <td>${accessCell(p)}</td>
              <td class="right">${num(p.distance, 1)}</td>
              <td class="right">${p.altitude != null ? `${num(p.altitude)} m` : '—'}</td>
              <td class="right">${
                p.timeMinutes != null ? formatPassageTime(event.startTime, p.timeMinutes) : '—'
              }</td>
            </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>`
      : '';

  // Section Pacing : segments départ → repères → arrivée avec allure et vitesse.
  const paceLabel = (distanceKm: number, durationMin: number): string => {
    if (distanceKm <= 0 || durationMin <= 0) return '—';
    const secPerKm = (durationMin * 60) / distanceKm;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, '0')}/km`;
  };
  const speedLabel = (distanceKm: number, durationMin: number): string => {
    if (distanceKm <= 0 || durationMin <= 0) return '—';
    return `${num((distanceKm / durationMin) * 60, 1)} km/h`;
  };
  const pacingSegments =
    track != null
      ? buildPacingSegments(
          track,
          event.aidStations ?? [],
          event.waypoints ?? [],
          event.segmentDifficulties,
          event.pacingPlan,
          event.targetTimeMinutes ?? 0,
        )
      : [];
  const pacingSection =
    track != null && pacingSegments.length > 0
      ? `
      <section class="sec sec-pacing">
        <h2>Pacing</h2>
        <table class="pacing">
          <thead>
            <tr>
              <th>Segment</th>
              <th class="right">Dist.</th>
              <th class="right">D+</th>
              <th class="right">D−</th>
              <th>Difficulté</th>
              <th class="right">Temps</th>
              <th class="right">Arrivée</th>
              <th class="right">Allure</th>
              <th class="right">Vitesse</th>
            </tr>
          </thead>
          <tbody>
            ${pacingSegments
              .map(
                (s) => `
            <tr>
              <td>${escapeHtml(s.fromLabel)} <span class="muted">→</span> ${escapeHtml(s.toLabel)}</td>
              <td class="right">${num(s.distance, 1)} km</td>
              <td class="right">+${num(s.elevationGain)} m</td>
              <td class="right">−${num(s.elevationLoss)} m</td>
              <td>${escapeHtml(PACING_DIFFICULTY_LABELS[s.difficulty] ?? '')}</td>
              <td class="right">${formatMinutes(s.durationMinutes)}</td>
              <td class="right">${formatPassageTime(event.startTime, s.arrivalMinutes)}</td>
              <td class="right">${paceLabel(s.distance, s.durationMinutes)}</td>
              <td class="right">${speedLabel(s.distance, s.durationMinutes)}</td>
            </tr>`,
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td class="right">${num(
                pacingSegments.reduce((sum, s) => sum + s.distance, 0),
                1,
              )} km</td>
              <td class="right">+${num(
                pacingSegments.reduce((sum, s) => sum + s.elevationGain, 0),
              )} m</td>
              <td class="right">−${num(
                pacingSegments.reduce((sum, s) => sum + s.elevationLoss, 0),
              )} m</td>
              <td></td>
              <td class="right">${formatMinutes(
                pacingSegments.reduce((sum, s) => sum + s.durationMinutes, 0),
              )}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(event.name)} — Stratégie de course</title>
  <style>
    * { box-sizing: border-box; }
    /* Pagination : numéro de page en bas à droite (médias paginés compatibles). */
    @page {
      size: A4 portrait;
      margin: 14mm;
      @bottom-right {
        content: "Page " counter(page) " / " counter(pages);
        font-size: 9px;
        color: #94a3b8;
      }
    }
    /* Page paysage dédiée au tableau de pacing (plus lisible). */
    @page landscape {
      size: A4 landscape;
      margin: 12mm;
      @bottom-right {
        content: "Page " counter(page) " / " counter(pages);
        font-size: 9px;
        color: #94a3b8;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 32px;
      font-size: 12px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    header { border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 {
      font-size: 18px;
      margin: 26px 0px;
      padding: 8px 0;
      color: #f3612f;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    h3 { font-size: 12px; margin: 14px 0 6px; color: #334155; text-transform: uppercase; letter-spacing: .05em; }
    /* Couleurs par section */
    .sec-intro { color: #64748b; margin: 0 0 8px; }
    .meta { color: #64748b; font-size: 12px; }
    .summary { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
    .summary .item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; }
    .summary .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
    .summary .value { font-weight: 600; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
    tfoot td { font-weight: 600; border-top: 2px solid #cbd5e1; }
    .right { text-align: right; }
    .center { text-align: center; }
    .muted { color: #94a3b8; font-weight: 400; }
    /* Sacs logistiques : une carte par point à préparer */
    .bags { display: flex; flex-direction: column; gap: 14px; }
    .bag {
      break-inside: avoid;
      border: 1px solid #e2e8f0;
      border-left-width: 5px;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .bag-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 9px 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .bag-name { font-weight: 700; font-size: 14px; color: #0f172a; }
    .bag-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
      padding: 3px 8px;
      border-radius: 999px;
      color: #fff;
    }
    .bag-meta { padding: 6px 14px 0; color: #64748b; font-size: 11px; }
    .bag-access {
      margin: 8px 14px 0;
      padding: 6px 10px;
      background: #eff6ff;
      border-left: 3px solid #2563eb;
      border-radius: 4px;
      color: #1e40af;
      font-size: 11px;
    }
    .bag-access a { color: #2563eb; margin-left: 6px; }
    .bag-note {
      margin: 8px 14px 0;
      padding: 6px 10px;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
      color: #92400e;
      font-size: 11px;
      white-space: pre-wrap;
    }
    .bag-body { padding: 4px 14px 12px; }
    .bag-body h3 { margin-top: 10px; }
    .bag-body table { margin-top: 4px; }
    /* Accents par type de sac */
    .badge-start { border-left-color: #2563eb; }
    .badge-start .bag-badge { background: #2563eb; }
    .badge-assist { border-left-color: #d97706; }
    .badge-assist .bag-badge { background: #d97706; }
    .badge-drop { border-left-color: #7c3aed; }
    .badge-drop .bag-badge { background: #7c3aed; }
    footer { margin-top: 28px; color: #94a3b8; font-size: 10px; }
    /* Parcours : profil altimétrique + tracé (pleine largeur, empilés) + étapes */
    .route-figs { display: flex; flex-direction: column; gap: 10px; }
    .route-fig { width: 100%; margin: 0; }
    .route-fig figcaption {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .route-svg {
      display: block;
      width: 100%;
      height: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
    }
    /* La carte remplit la largeur ; son ratio épouse le cadre de la première page. */
    .route-map { width: 100%; height: auto; }
    /* Fiche assistance : la section démarre sur une nouvelle page à l'impression. */
    .sec-passages { break-before: page; page-break-before: always; }
    /* Inventaire : sur une nouvelle page. */
    .sec-inv { break-before: page; page-break-before: always; }
    /* Pacing : page paysage dédiée pour la lisibilité du tableau. */
    .sec-pacing { page: landscape; break-before: page; page-break-before: always; }
    table.pacing { font-size: 11px; }
    table.pacing tfoot td { font-weight: 600; border-top: 2px solid #cbd5e1; }
    table.passages td { vertical-align: top; }
    table.passages .muted { font-size: 10px; }
    table.steps .step-badge {
      display: inline-block;
      min-width: 18px;
      height: 18px;
      line-height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-align: center;
    }
    .step-badge {
      display: inline-block;
      min-width: 18px;
      height: 18px;
      line-height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-align: center;
    }
    @media print {
      body { margin: 0; }
      section { break-inside: avoid; }
      .bag { break-inside: avoid; }
      /* Le parcours (profil + carte) occupe toute la première page sous le titre. */
      .sec-route h2 { margin: 6px 0 10px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(event.name)}</h1>
    ${meta.length > 0 ? `<div class="meta">${meta.join(' · ')}</div>` : ''}
  </header>

  ${routeSection}
  ${passageSection}
  ${pacingSection}
  <section class="sec sec-inv">
    <h2>Inventaire</h2>
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Catégorie</th>
          <th class="right">Qté</th>
          <th class="right">Poids</th>
          <th class="right">Énergie</th>
          <th class="right">Glucides</th>
        </tr>
      </thead>
      <tbody>${inventoryBody}</tbody>
      <tfoot>
        <tr>
          <td colspan="2">Total</td>
          <td class="right">${num(inventoryRows.reduce((s, r) => s + r.quantity, 0))}</td>
          <td class="right">${num(totals.weight)} g</td>
          <td class="right">${num(totals.energy)} kcal</td>
          <td class="right">${num(totals.carbs)} g</td>
        </tr>
      </tfoot>
    </table>
  </section>
  ${logisticsSection}
  ${planSection}

  <footer>Généré le ${formatDate(new Date().toISOString().slice(0, 10))} · Runorama</footer>
  <script>
    (function () {
      function print() { try { window.focus(); window.print(); } catch (e) {} }
      var svgImgs = Array.prototype.slice.call(document.querySelectorAll('image'));
      var htmlImgs = Array.prototype.slice.call(document.images || []);
      var pending = [];
      htmlImgs.forEach(function (i) { if (!i.complete) pending.push(i); });
      svgImgs.forEach(function (i) { pending.push(i); });
      if (pending.length === 0) { setTimeout(print, 150); return; }
      var remaining = pending.length, called = false;
      function done() { if (called) return; remaining--; if (remaining <= 0) { called = true; setTimeout(print, 200); } }
      pending.forEach(function (i) { i.addEventListener('load', done); i.addEventListener('error', done); });
      // Filet de sécurité : imprime même si des tuiles n'ont pas signalé leur chargement.
      setTimeout(function () { if (!called) { called = true; print(); } }, 6000);
    })();
  </script>
</body>
</html>`;
}
