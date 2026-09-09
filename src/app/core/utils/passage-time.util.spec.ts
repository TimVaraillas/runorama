import { describe, expect, it } from 'vitest';
import { formatPassageTime } from './passage-time.util';

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