/**
 * Génération d'un fichier **TCX Course** encodant la stratégie de pacing sous
 * forme de **Partenaire Virtuel** Garmin — **fonction pure**, sans dépendance
 * Angular, DOM ou Mongoose.
 *
 * Chaque point de la trace reçoit un horodatage cumulé dérivé des durées de
 * course des tronçons (temps de mouvement, hors arrêts). Une fois le parcours
 * chargé sur la montre, le Partenaire Virtuel suit exactement cette allure.
 */

import type { GpxTrackPoint } from '../models';
import type { PacingSegment } from './pacing.util';

/** Types de `CoursePoint` reconnus par Garmin (sous-ensemble utile). */
export type TcxCoursePointType = 'Generic' | 'Summit' | 'Valley' | 'Water' | 'Food' | 'Danger' | 'FirstAid';

/** Point d'intérêt matérialisé en `<CoursePoint>`. */
export interface TcxCoursePoint {
  name: string;
  /** Distance depuis le départ (km). */
  distanceKm: number;
  type: TcxCoursePointType;
  notes?: string;
}

/** Paramètres de génération du document TCX. */
export interface BuildTcxOptions {
  /** Nom du parcours (tronqué à 15 caractères pour la compatibilité montre). */
  name: string;
  /** Points de la trace, triés par distance croissante. */
  points: readonly GpxTrackPoint[];
  /** Tronçons de pacing du scénario à exporter (durées de course). */
  segments: readonly PacingSegment[];
  /** Points d'intérêt (ravitaillements, sommets…). */
  coursePoints?: readonly TcxCoursePoint[];
  /** Horodatage de base (défaut : 2024-01-01T00:00:00Z). */
  baseTime?: Date;
}

/** Point de rupture distance (km) → temps cumulé de course (secondes). */
interface TimeBreakpoint {
  distanceKm: number;
  seconds: number;
}

/** Échappe les caractères réservés du XML dans une valeur texte. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Construit les points de rupture (distance cumulée, temps de course cumulé). */
function buildBreakpoints(segments: readonly PacingSegment[]): TimeBreakpoint[] {
  const breakpoints: TimeBreakpoint[] = [{ distanceKm: 0, seconds: 0 }];
  let distanceKm = 0;
  let seconds = 0;
  for (const segment of segments) {
    distanceKm += segment.distance;
    seconds += segment.durationMinutes * 60;
    breakpoints.push({ distanceKm, seconds });
  }
  return breakpoints;
}

/** Interpole le temps de course cumulé (s) à une distance donnée (km). */
function timeAt(breakpoints: readonly TimeBreakpoint[], distanceKm: number): number {
  const last = breakpoints[breakpoints.length - 1]!;
  if (distanceKm <= 0) return 0;
  if (distanceKm >= last.distanceKm) return last.seconds;
  for (let index = 1; index < breakpoints.length; index++) {
    const current = breakpoints[index]!;
    if (current.distanceKm >= distanceKm) {
      const previous = breakpoints[index - 1]!;
      const span = current.distanceKm - previous.distanceKm || 1;
      const ratio = (distanceKm - previous.distanceKm) / span;
      return previous.seconds + (current.seconds - previous.seconds) * ratio;
    }
  }
  return last.seconds;
}

/** ISO 8601 du temps `baseTime + seconds`. */
function isoAt(baseTime: number, seconds: number): string {
  return new Date(baseTime + Math.round(seconds) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Construit le document TCX Course (Partenaire Virtuel) à partir de la trace et
 * des tronçons de pacing. Retourne une chaîne XML prête à télécharger.
 */
export function buildTcxCourse(options: BuildTcxOptions): string {
  const { points, segments } = options;
  const baseTime = (options.baseTime ?? new Date('2024-01-01T00:00:00Z')).getTime();
  const breakpoints = buildBreakpoints(segments);
  const totalSeconds = breakpoints[breakpoints.length - 1]?.seconds ?? 0;
  const totalMeters = (points[points.length - 1]?.distance ?? 0) * 1000;
  const first = points[0];
  const last = points[points.length - 1];
  const name = escapeXml(options.name.slice(0, 15) || 'Parcours');

  const trackpoints = points
    .map((point) => {
      const time = isoAt(baseTime, timeAt(breakpoints, point.distance));
      return [
        '      <Trackpoint>',
        `        <Time>${time}</Time>`,
        '        <Position>',
        `          <LatitudeDegrees>${point.lat}</LatitudeDegrees>`,
        `          <LongitudeDegrees>${point.lon}</LongitudeDegrees>`,
        '        </Position>',
        `        <AltitudeMeters>${point.ele}</AltitudeMeters>`,
        `        <DistanceMeters>${Math.round(point.distance * 1000)}</DistanceMeters>`,
        '      </Trackpoint>',
      ].join('\n');
    })
    .join('\n');

  const coursePoints = (options.coursePoints ?? [])
    .filter((cp) => Number.isFinite(cp.distanceKm))
    .map((cp) => {
      const time = isoAt(baseTime, timeAt(breakpoints, cp.distanceKm));
      const lines = [
        '      <CoursePoint>',
        `        <Name>${escapeXml(cp.name.slice(0, 10))}</Name>`,
        `        <Time>${time}</Time>`,
        '        <Position>',
        `          <LatitudeDegrees>${first?.lat ?? 0}</LatitudeDegrees>`,
        `          <LongitudeDegrees>${first?.lon ?? 0}</LongitudeDegrees>`,
        '        </Position>',
        `        <PointType>${cp.type}</PointType>`,
      ];
      if (cp.notes) lines.push(`        <Notes>${escapeXml(cp.notes)}</Notes>`);
      lines.push('      </CoursePoint>');
      return lines.join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">',
    '  <Courses>',
    '    <Course>',
    `      <Name>${name}</Name>`,
    '      <Lap>',
    `        <TotalTimeSeconds>${Math.round(totalSeconds)}</TotalTimeSeconds>`,
    `        <DistanceMeters>${Math.round(totalMeters)}</DistanceMeters>`,
    '        <BeginPosition>',
    `          <LatitudeDegrees>${first?.lat ?? 0}</LatitudeDegrees>`,
    `          <LongitudeDegrees>${first?.lon ?? 0}</LongitudeDegrees>`,
    '        </BeginPosition>',
    '        <EndPosition>',
    `          <LatitudeDegrees>${last?.lat ?? 0}</LatitudeDegrees>`,
    `          <LongitudeDegrees>${last?.lon ?? 0}</LongitudeDegrees>`,
    '        </EndPosition>',
    '        <Intensity>Active</Intensity>',
    '      </Lap>',
    '      <Track>',
    trackpoints,
    '      </Track>',
    coursePoints,
    '    </Course>',
    '  </Courses>',
    '</TrainingCenterDatabase>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}
