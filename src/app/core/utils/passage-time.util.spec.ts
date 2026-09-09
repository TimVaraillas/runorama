import { describe, expect, it } from 'vitest';
import { estimateArrivalTime, formatPassageTime } from './passage-time.util';

describe('formatPassageTime', () => {
  it('adds elapsed time to the configured departure time', () => {
    expect(formatPassageTime('08:30', 95)).toBe('10:05');
  });

  it('wraps to the next day after midnight', () => {
    expect(formatPassageTime('23:45', 30)).toBe('00:15');
  });

  it('uses the default departure time for missing legacy data', () => {
    expect(formatPassageTime(undefined, 60)).toBe('09:00');
  });
});

describe('estimateArrivalTime', () => {
  const stops = [
    { distanceFromStart: 25, stopDurationMinutes: 5 },
    { distanceFromStart: 50, stopDurationMinutes: 10 },
  ];

  it('keeps the target duration fixed while reserving time for aid-station stops', () => {
    expect(estimateArrivalTime(100, 600, 100, stops)).toBe(600);
  });

  it('adds only preceding aid-station stops to an arrival time', () => {
    expect(estimateArrivalTime(50, 600, 100, stops)).toBe(298);
  });
});
