import { describe, expect, it } from 'vitest';
import type { AidStation, GpxTrack } from '../models';
import { buildPacingSegments, computePacing } from './pacing.util';

const track: GpxTrack = {
  id: 'track',
  eventId: 'event',
  distance: 20,
  elevationGain: 600,
  elevationLoss: 600,
  minAltitude: 100,
  maxAltitude: 700,
  pointCount: 3,
  bbox: { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 },
  points: [
    { lat: 0, lon: 0, ele: 100, distance: 0, elevationGain: 0, elevationLoss: 0 },
    { lat: 0.5, lon: 0.5, ele: 400, distance: 10, elevationGain: 600, elevationLoss: 100 },
    { lat: 1, lon: 1, ele: 100, distance: 20, elevationGain: 600, elevationLoss: 600 },
  ],
};

const aid: AidStation = {
  id: 'aid',
  name: 'Ravito',
  types: [],
  distanceFromStart: 10,
  elevationGainFromStart: 600,
  estimatedDurationFromStart: 0,
  stopDurationMinutes: 5,
  pickup: [],
  drop: [],
  todo: [],
  consumptions: [],
};

describe('computePacing', () => {
  it('résout une allure de référence pour atteindre exactement le chrono cible', () => {
    const result = computePacing(track, [aid], [], {}, undefined, 180);
    expect(result.feasible).toBe(true);
    expect(result.totalMinutes).toBeCloseTo(180, 5);
    expect(result.stopMinutes).toBe(5);
    expect(result.basePaceMinKm).toBeGreaterThan(0);
  });

  it('respecte la durée forcée d’un segment verrouillé', () => {
    const plan = { lockedSegmentIds: ['__start__:aid'], segmentDurations: { '__start__:aid': 90 } };
    const result = computePacing(track, [aid], [], {}, plan, 180);
    const locked = result.segments.find((segment) => segment.id === '__start__:aid');
    expect(locked?.durationMinutes).toBe(90);
    expect(locked?.locked).toBe(true);
    expect(result.totalMinutes).toBeCloseTo(180, 5);
  });

  it('fige la durée d’un segment sans le verrouiller', () => {
    const plan = { segmentDurations: { '__start__:aid': 90 } };
    const result = computePacing(track, [aid], [], {}, plan, 180);
    const forced = result.segments.find((segment) => segment.id === '__start__:aid');
    expect(forced?.durationMinutes).toBe(90);
    expect(forced?.overridden).toBe(true);
    expect(forced?.locked).toBe(false);
    expect(result.totalMinutes).toBeCloseTo(180, 5);
  });

  it('ralentit un segment plus difficile', () => {
    const easy = computePacing(track, [aid], [], { '__start__:aid': 1 }, undefined, 180);
    const hard = computePacing(track, [aid], [], { '__start__:aid': 5 }, undefined, 180);
    const easyClimb = easy.segments.find((s) => s.id === '__start__:aid')!;
    const hardClimb = hard.segments.find((s) => s.id === '__start__:aid')!;
    expect(hardClimb.durationMinutes).toBeGreaterThan(easyClimb.durationMinutes);
  });

  it('applique le pourcentage d’un scénario dérivé (allure imposée)', () => {
    const base = computePacing(track, [aid], [], {}, undefined, 180);
    const slower = computePacing(track, [aid], [], {}, undefined, 0, base.basePaceMinKm * 1.15);
    expect(slower.runningMinutes).toBeGreaterThan(base.runningMinutes);
  });

  it('calcule le D- de chaque segment depuis le cumul GPX', () => {
    const segments = buildPacingSegments(track, [aid], [], undefined, undefined, 180);
    expect(segments.map((segment) => segment.elevationLoss)).toEqual([100, 500]);
  });
});
