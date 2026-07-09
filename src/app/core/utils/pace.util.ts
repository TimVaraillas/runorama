import type { Pace } from '../models';

/**
 * Formate une allure (sec/km) au format mm:ss.
 * @example formatPace({ secondsPerKm: 305 }) // "5:05"
 */
export function formatPace(pace: Pace): string {
  return formatSecondsPerKm(pace.secondsPerKm);
}

/** Formate un nombre de secondes/km au format mm:ss. */
export function formatSecondsPerKm(secondsPerKm: number): string {
  const total = Math.max(0, Math.round(secondsPerKm));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Parse une allure "mm:ss" en secondes/km. Retourne null si invalide. */
export function parsePace(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds >= 60) {
    return null;
  }
  return minutes * 60 + seconds;
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
