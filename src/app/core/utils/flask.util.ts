import type { AidStation, Flask, NutritionProduct, RaceStrategy } from '../models';
import { FLASK_START_LOCATION } from '../models';
import { buildFlaskProduct, flaskProductId } from './water.util';

/** Une flasque résolue (produit boisson inclus si associé). */
export interface ResolvedFlask extends Flask {
  /** Produit synthétique dérivé (volume + apports mis à l'échelle de la dose). */
  synthetic: NutritionProduct;
  /** Boisson associée résolue, si une est définie. */
  boisson?: NutritionProduct;
}

/** Un emplacement regroupant ses flasques (sac de départ ou ravitaillement). */
export interface FlaskLocationGroup {
  /** `FLASK_START_LOCATION` pour le départ, sinon l'identifiant du ravitaillement. */
  id: string;
  kind: 'start' | 'station';
  name: string;
  /** Temps estimé de passage (min), pour un ravitaillement. */
  minute?: number;
  flasks: ResolvedFlask[];
}

/** Résout la boisson associée à une flasque via le catalogue. */
function resolveBoisson(
  flask: Flask,
  productMap: Map<string, NutritionProduct>,
): NutritionProduct | undefined {
  if (!flask.productId) return undefined;
  return flask.product ?? productMap.get(flask.productId);
}

/** Résout une flasque (boisson + produit synthétique). */
export function resolveFlask(
  flask: Flask,
  productMap: Map<string, NutritionProduct>,
): ResolvedFlask {
  const boisson = resolveBoisson(flask, productMap);
  return { ...flask, boisson, synthetic: buildFlaskProduct(flask, boisson) };
}

/** Table des produits synthétiques de flasque, indexés par identifiant synthétique. */
export function buildFlaskProductMap(
  flasks: readonly Flask[],
  productMap: Map<string, NutritionProduct>,
): Map<string, NutritionProduct> {
  const map = new Map<string, NutritionProduct>();
  for (const flask of flasks) {
    const boisson = resolveBoisson(flask, productMap);
    map.set(flaskProductId(flask.id), buildFlaskProduct(flask, boisson));
  }
  return map;
}

/**
 * Instant (minutes) à partir duquel une flasque est disponible : 0 au départ,
 * sinon le temps de passage estimé du ravitaillement. `Infinity` si la station
 * référencée n'existe plus.
 */
export function flaskAvailableMinute(flask: Flask, aidStations: readonly AidStation[]): number {
  if (flask.location === FLASK_START_LOCATION) return 0;
  const station = aidStations.find((s) => s.id === flask.location);
  return station ? station.estimatedDurationFromStart : Infinity;
}

/**
 * Regroupe les flasques par emplacement : le sac de départ puis chaque
 * ravitaillement (trié par temps de passage). Les emplacements sans flasque
 * sont conservés pour permettre l'ajout.
 */
export function buildFlaskLocations(
  event: RaceStrategy,
  productMap: Map<string, NutritionProduct>,
): FlaskLocationGroup[] {
  const stations = (event.aidStations ?? [])
    .slice()
    .sort((a, b) => a.estimatedDurationFromStart - b.estimatedDurationFromStart);
  const flasks = (event.flasks ?? []).map((flask) => resolveFlask(flask, productMap));
  const groups: FlaskLocationGroup[] = [
    {
      id: FLASK_START_LOCATION,
      kind: 'start',
      name: 'Départ',
      flasks: flasks.filter((f) => f.location === FLASK_START_LOCATION),
    },
  ];
  for (const station of stations) {
    groups.push({
      id: station.id,
      kind: 'station',
      name: station.name,
      minute: station.estimatedDurationFromStart,
      flasks: flasks.filter((f) => f.location === station.id),
    });
  }
  return groups;
}

/** Volume total (mL) des flasques de l'inventaire (volume × nombre de recharges). */
export function totalFlaskVolumeMl(flasks: readonly Flask[]): number {
  return flasks.reduce((sum, flask) => sum + (flask.volumeMl || 0) * (flask.quantity || 0), 0);
}
