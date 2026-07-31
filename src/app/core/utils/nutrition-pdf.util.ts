import type { NutritionEvent, NutritionProduct } from '../models';
import { resolveIntakeProduct } from './water.util';
import { formatMinutes } from './plan-layout.util';

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

interface RecapRow {
  hour: number;
  energy: number;
  targetEnergy: number;
  carbs: number;
  targetCarbs: number;
}

/** Construit la table produit par identifiant (catalogue + dénormalisés). */
function buildProductMap(
  event: NutritionEvent,
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
function buildInventory(event: NutritionEvent, map: Map<string, NutritionProduct>) {
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
function buildPlan(event: NutritionEvent, map: Map<string, NutritionProduct>) {
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
  if (total > 0) {
    const hours = Math.ceil(total / 60);
    for (let h = 0; h < hours; h++) {
      const minutesInHour = Math.min(60, total - h * 60);
      recap.push({
        hour: h + 1,
        energy: 0,
        carbs: 0,
        targetEnergy: (event.hourlyEnergy * minutesInHour) / 60,
        targetCarbs: (event.hourlyCarbs * minutesInHour) / 60,
      });
    }
    for (const intake of event.intakes ?? []) {
      const product = resolveIntakeProduct(intake, map);
      if (!product || intake.durationMinutes <= 0) continue;
      const energyPerMin = (product.energy * intake.quantity) / intake.durationMinutes;
      const carbsPerMin = (product.carbs * intake.quantity) / intake.durationMinutes;
      const start = intake.startMinute;
      const end = intake.startMinute + intake.durationMinutes;
      for (let h = 0; h < hours; h++) {
        const overlap = Math.min(end, (h + 1) * 60) - Math.max(start, h * 60);
        if (overlap > 0) {
          recap[h].energy += energyPerMin * overlap;
          recap[h].carbs += carbsPerMin * overlap;
        }
      }
    }
  }
  return { rows, recap };
}

/**
 * Construit un document HTML autonome et imprimable (destiné à « Enregistrer
 * en PDF ») récapitulant une stratégie alimentaire : inventaire des produits
 * emportés et plan de consommation planifié.
 */
export function buildStrategyPdfHtml(
  event: NutritionEvent,
  products: NutritionProduct[],
): string {
  const map = buildProductMap(event, products);
  const { rows: inventoryRows, totals } = buildInventory(event, map);
  const { rows: planRows, recap } = buildPlan(event, map);
  const total = event.targetTimeMinutes ?? 0;
  const targetEnergy = total > 0 ? (event.hourlyEnergy * total) / 60 : 0;
  const targetCarbs = total > 0 ? (event.hourlyCarbs * total) / 60 : 0;

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

  const recapBody = recap
    .map(
      (r) => `
      <tr>
        <td>Heure ${r.hour}</td>
        <td class="right">${num(r.energy)} / ${num(r.targetEnergy)} kcal</td>
        <td class="right">${num(r.carbs)} / ${num(r.targetCarbs)} g</td>
      </tr>`,
    )
    .join('');

  const planSection =
    total > 0
      ? `
      <section>
        <h2>Plan de consommation</h2>
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
        ${
          recap.length > 0
            ? `
        <h3>Récapitulatif horaire (planifié / cible)</h3>
        <table>
          <thead>
            <tr><th>Tranche</th><th class="right">Énergie</th><th class="right">Glucides</th></tr>
          </thead>
          <tbody>${recapBody}</tbody>
        </table>`
            : ''
        }
      </section>`
      : `
      <section>
        <h2>Plan de consommation</h2>
        <p class="muted">Définissez un chrono cible sur l'évènement pour construire le plan.</p>
      </section>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(event.name)} — Stratégie alimentaire</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 32px;
      font-size: 12px;
      line-height: 1.5;
    }
    header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 24px 0 10px; color: #0f172a; }
    h3 { font-size: 13px; margin: 18px 0 8px; color: #334155; }
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
    footer { margin-top: 28px; color: #94a3b8; font-size: 10px; }
    @media print {
      body { margin: 12mm; }
      section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(event.name)}</h1>
    ${meta.length > 0 ? `<div class="meta">${meta.join(' · ')}</div>` : ''}
    <div class="summary">
      <div class="item"><div class="label">Poids total</div><div class="value">${num(
        totals.weight,
      )} g</div></div>
      <div class="item"><div class="label">Énergie</div><div class="value">${num(
        totals.energy,
      )} kcal${coverage(totals.energy, targetEnergy)}</div></div>
      <div class="item"><div class="label">Glucides</div><div class="value">${num(
        totals.carbs,
      )} g${coverage(totals.carbs, targetCarbs)}</div></div>
    </div>
  </header>

  <section>
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

  ${planSection}

  <footer>Généré le ${formatDate(new Date().toISOString().slice(0, 10))} · Runorama</footer>
</body>
</html>`;
}
