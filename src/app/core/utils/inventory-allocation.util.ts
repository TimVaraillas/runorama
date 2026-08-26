import type {
  AidStation,
  AidStationLogisticVia,
  LogisticItem,
  NutritionEvent,
  NutritionEventItem,
  NutritionProduct,
} from '../models';

/** Identifiant de l'emplacement « inventaire de départ ». */
export const START_LOCATION_ID = 'start';

/** Nature d'un emplacement d'inventaire. */
export type InventoryLocationKind = 'start' | 'station';

/** Une ligne produit d'un emplacement (produit résolu). */
export interface InventoryLocationItem {
  productId: string;
  product: NutritionProduct;
  quantity: number;
}

/**
 * Un emplacement d'inventaire : le sac de départ ou un ravitaillement avec
 * logistique (assistance / drop bag). Les unités d'un produit sont réparties
 * entre ces emplacements ; leur somme reste le total de l'inventaire.
 */
export interface InventoryLocation {
  /** `START_LOCATION_ID` pour le départ, sinon l'identifiant du ravitaillement. */
  id: string;
  kind: InventoryLocationKind;
  name: string;
  /** Temps estimé de passage (min), pour un ravitaillement. */
  minute?: number;
  /** Vecteur logistique (assistance / drop bag), pour un ravitaillement. */
  via?: AidStationLogisticVia;
  items: InventoryLocationItem[];
}

/** Nouvel état d'inventaire renvoyé par les opérations (prêt pour l'API). */
export interface AllocationResult {
  items: NutritionEventItem[];
  aidStations: AidStation[];
}

/** Somme des unités d'un produit récupérées sur l'ensemble des ravitaillements. */
function pickupSum(stations: AidStation[], productId: string): number {
  let total = 0;
  for (const station of stations) {
    for (const item of station.pickup ?? []) {
      if (item.kind === 'product' && item.productId === productId) total += item.quantity;
    }
  }
  return total;
}

/** Quantité d'un produit récupérée sur un ravitaillement donné. */
function stationPickupQty(station: AidStation, productId: string): number {
  let total = 0;
  for (const item of station.pickup ?? []) {
    if (item.kind === 'product' && item.productId === productId) total += item.quantity;
  }
  return total;
}

/** Vrai si le ravitaillement porte une section logistique (assistance / drop bag). */
function hasLogistics(station: AidStation): boolean {
  return station.logisticVia != null;
}

/** Réduit l'inventaire à sa charge utile API (`productId` + `quantity`). */
function toItems(items: readonly NutritionEventItem[]): NutritionEventItem[] {
  return items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
}

/**
 * Décompose l'inventaire en emplacements : le sac de départ (total moins ce qui
 * est récupéré en route) puis un emplacement par ravitaillement avec logistique,
 * trié par temps de passage.
 */
export function buildInventoryLocations(
  event: NutritionEvent,
  productMap: Map<string, NutritionProduct>,
): InventoryLocation[] {
  const resolve = (productId: string, fallback?: NutritionProduct): NutritionProduct | null =>
    fallback ?? productMap.get(productId) ?? null;

  const stations = (event.aidStations ?? [])
    .filter(hasLogistics)
    .slice()
    .sort((a, b) => a.estimatedDurationFromStart - b.estimatedDurationFromStart);

  // Départ : total de chaque produit moins ce qui est récupéré sur les ravitos.
  const startItems: InventoryLocationItem[] = [];
  for (const item of event.items) {
    const startQty = item.quantity - pickupSum(event.aidStations ?? [], item.productId);
    if (startQty <= 0) continue;
    const product = resolve(item.productId, item.product);
    if (!product) continue;
    startItems.push({ productId: item.productId, product, quantity: startQty });
  }

  const locations: InventoryLocation[] = [
    { id: START_LOCATION_ID, kind: 'start', name: 'Départ', items: startItems },
  ];

  for (const station of stations) {
    const items: InventoryLocationItem[] = [];
    for (const pickup of station.pickup ?? []) {
      if (pickup.kind !== 'product' || !pickup.productId) continue;
      const product = resolve(pickup.productId, pickup.product);
      if (!product) continue;
      items.push({ productId: pickup.productId, product, quantity: pickup.quantity });
    }
    locations.push({
      id: station.id,
      kind: 'station',
      name: station.name,
      minute: station.estimatedDurationFromStart,
      via: station.logisticVia,
      items,
    });
  }

  return locations;
}

/** Quantité disponible d'un produit à un emplacement (départ dérivé ou pickup). */
export function availableAt(event: NutritionEvent, locationId: string, productId: string): number {
  if (locationId === START_LOCATION_ID) {
    const item = event.items.find((i) => i.productId === productId);
    if (!item) return 0;
    return item.quantity - pickupSum(event.aidStations ?? [], productId);
  }
  const station = (event.aidStations ?? []).find((s) => s.id === locationId);
  return station ? stationPickupQty(station, productId) : 0;
}

/** Ajoute `delta` unités d'un produit au pickup d'un ravitaillement (crée/retire la ligne). */
function withStationPickupDelta(
  stations: AidStation[],
  stationId: string,
  productId: string,
  delta: number,
): AidStation[] {
  return stations.map((station) => {
    if (station.id !== stationId) return station;
    const pickup = [...(station.pickup ?? [])];
    const index = pickup.findIndex((p) => p.kind === 'product' && p.productId === productId);
    if (index >= 0) {
      const next = pickup[index].quantity + delta;
      if (next <= 0) pickup.splice(index, 1);
      else pickup[index] = { ...pickup[index], quantity: next };
    } else if (delta > 0) {
      const entry: LogisticItem = { kind: 'product', productId, quantity: delta };
      pickup.push(entry);
    }
    return { ...station, pickup };
  });
}

/**
 * Déplace **une** unité d'un produit d'un emplacement vers un autre. Le total
 * de l'inventaire reste inchangé : seul le point de récupération change.
 * Renvoie `null` si le déplacement est impossible (source vide, emplacements
 * identiques, ravito destinataire sans logistique).
 */
export function moveUnit(
  event: NutritionEvent,
  fromId: string,
  toId: string,
  productId: string,
): AllocationResult | null {
  if (fromId === toId) return null;
  if (availableAt(event, fromId, productId) < 1) return null;
  if (toId !== START_LOCATION_ID) {
    const dest = (event.aidStations ?? []).find((s) => s.id === toId);
    if (!dest || !hasLogistics(dest)) return null;
  }

  let stations = [...(event.aidStations ?? [])];
  if (fromId !== START_LOCATION_ID) {
    stations = withStationPickupDelta(stations, fromId, productId, -1);
  }
  if (toId !== START_LOCATION_ID) {
    stations = withStationPickupDelta(stations, toId, productId, +1);
  }
  return { items: toItems(event.items), aidStations: stations };
}

/**
 * Fixe la quantité d'un produit **au départ**. Comme le départ est dérivé
 * (total moins pickups), cela ajuste le total emporté. Une quantité nulle sans
 * récupération ailleurs retire le produit de l'inventaire.
 */
export function setStartQuantity(
  event: NutritionEvent,
  productId: string,
  quantity: number,
): AllocationResult {
  const clamped = Math.max(0, Math.round(quantity));
  const pickups = pickupSum(event.aidStations ?? [], productId);
  const total = clamped + pickups;
  const items: NutritionEventItem[] = [];
  let found = false;
  for (const item of event.items) {
    if (item.productId !== productId) {
      items.push({ productId: item.productId, quantity: item.quantity });
      continue;
    }
    found = true;
    if (total > 0) items.push({ productId, quantity: total });
  }
  if (!found && total > 0) items.push({ productId, quantity: total });
  return { items, aidStations: [...(event.aidStations ?? [])] };
}

/**
 * Fixe la quantité d'un produit récupérée sur un ravitaillement. Le delta est
 * répercuté sur le total emporté (la quantité au départ reste inchangée).
 */
export function setStationQuantity(
  event: NutritionEvent,
  stationId: string,
  productId: string,
  quantity: number,
): AllocationResult {
  const clamped = Math.max(0, Math.round(quantity));
  const station = (event.aidStations ?? []).find((s) => s.id === stationId);
  if (!station) return { items: toItems(event.items), aidStations: [...(event.aidStations ?? [])] };
  const previous = stationPickupQty(station, productId);
  const delta = clamped - previous;

  const stations = withStationPickupDelta([...(event.aidStations ?? [])], stationId, productId, delta);

  const items: NutritionEventItem[] = [];
  let found = false;
  for (const item of event.items) {
    if (item.productId !== productId) {
      items.push({ productId: item.productId, quantity: item.quantity });
      continue;
    }
    found = true;
    const total = item.quantity + delta;
    if (total > 0) items.push({ productId, quantity: total });
  }
  if (!found && clamped > 0) items.push({ productId, quantity: clamped });
  return { items, aidStations: stations };
}

/** Retire complètement un produit de l'inventaire (départ + tous les ravitos). */
export function removeProductEverywhere(event: NutritionEvent, productId: string): AllocationResult {
  const items = event.items
    .filter((item) => item.productId !== productId)
    .map((item) => ({ productId: item.productId, quantity: item.quantity }));
  const aidStations = (event.aidStations ?? []).map((station) => ({
    ...station,
    pickup: (station.pickup ?? []).filter(
      (p) => !(p.kind === 'product' && p.productId === productId),
    ),
  }));
  return { items, aidStations };
}
