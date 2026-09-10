import { describe, expect, it } from 'vitest';
import type { GpxTrack } from '../models';
import { buildPacingSegments, createAutomaticPacingPlan } from './pacing.util';

const track: GpxTrack = {
  id: 'track',
  eventId: 'event',
  distance: 20,
  elevationGain: 600,
  elevationLoss: 600,
  minAltitude: 100,
  maxAltitude: 700,
  pointCount: 2,
  bbox: { minLat: 0, minLon: 0, maxLat: 1, maxLon: 1 },
  points: [
    { lat: 0, lon: 0, ele: 100, distance: 0, elevationGain: 0, elevationLoss: 0 },
    { lat: 0.5, lon: 0.5, ele: 400, distance: 10, elevationGain: 600, elevationLoss: 100 },
    { lat: 1, lon: 1, ele: 100, distance: 20, elevationGain: 600, elevationLoss: 600 },
  ],
};

describe('pacing', () => {
  it('allocates the target time between running and aid-station stops', () => {
    const stations = [
      {
        id: 'aid',
        name: 'Ravito',
        types: [],
        distanceFromStart: 10,
        elevationGainFromStart: 300,
        estimatedDurationFromStart: 0,
        stopDurationMinutes: 5,
        pickup: [],
        drop: [],
        todo: [],
        consumptions: [],
      },
    ];
    const plan = createAutomaticPacingPlan(track, stations, [], 180, undefined, 'BALANCED');
    expect(plan).not.toBeNull();
    const segments = buildPacingSegments(track, stations, [], plan!, 180);
    expect(segments.reduce((sum, segment) => sum + segment.durationMinutes + segment.stopMinutes, 0)).toBe(180);
  });

  it('calculates elevation loss for each segment from cumulative GPX loss', () => {
    const segments = buildPacingSegments(
      track,
      [
        {
          id: 'aid', name: 'Ravito', types: [], distanceFromStart: 10, estimatedDurationFromStart: 0,
          pickup: [], drop: [], todo: [], consumptions: [],
        },
      ],
      [],
      undefined,
      180,
    );
    expect(segments.map((segment) => segment.elevationLoss)).toEqual([100, 500]);
  });
});
