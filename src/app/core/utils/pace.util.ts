import type { RangeValue } from '../models';

/** Formate un nombre km/h (entier affiché sans décimale, sinon 1 décimale). */
function formatKmh(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Formate une vitesse cible en km/h (valeur unique ou plage min/max).
 * @example formatSpeed(10) // "10 km/h"
 * @example formatSpeed([12, 12.5]) // "12–12.5 km/h"
 */
export function formatSpeed(kmh: RangeValue): string {
  if (Array.isArray(kmh)) {
    return `${formatKmh(kmh[0])}–${formatKmh(kmh[1])} km/h`;
  }
  return `${formatKmh(kmh)} km/h`;
}

/**
 * Formate une fréquence cardiaque cible en bpm (valeur unique ou plage).
 * @example formatPulse([145, 155]) // "145–155 bpm"
 */
export function formatPulse(pulse: RangeValue): string {
  if (Array.isArray(pulse)) {
    return `${Math.round(pulse[0])}–${Math.round(pulse[1])} bpm`;
  }
  return `${Math.round(pulse)} bpm`;
}

/** Formate une durée en secondes vers un format lisible (ex: 1h05, 12:30, 45s). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/** Formate une distance en mètres vers un format lisible (ex: 5 km, 400 m). */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km : km.toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}
