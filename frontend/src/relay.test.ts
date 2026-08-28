import { describe, expect, it } from 'vitest';
import { averageScore, nearestBeatDelta, normalizeRoomCode, timingScore } from './relay';

describe('relay timing helpers', () => {
  it('normalizes a six-character room code', () => {
    expect(normalizeRoomCode(' ab-12cd! ')).toBe('AB12CD');
  });

  it('scores exact and late taps', () => {
    expect(timingScore(0, 500)).toBe(100);
    expect(timingScore(125, 500)).toBe(50);
    expect(timingScore(400, 500)).toBe(0);
  });

  it('finds the nearest beat and averages scores', () => {
    expect(nearestBeatDelta(1120, [500, 1000, 1500])).toBe(120);
    expect(averageScore([100, 80, 90])).toBe(90);
  });
});

