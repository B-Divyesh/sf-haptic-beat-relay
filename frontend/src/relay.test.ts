import { describe, expect, it } from 'vitest';
import { averageScore, nearestBeatDelta, normalizeRoomCode, startBeatClock, timingScore } from './relay';

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

  it('keeps the next beat on its deadline after a 126.67 ms scheduler stall', () => {
    let now = 1_000;
    const marks: number[] = [];
    const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
    const cancelled: number[] = [];
    const stop = startBeatClock(
      () => marks.push(now),
      1_000 / 3,
      () => now,
      (callback, delayMs) => scheduled.push({ callback, delayMs }),
      (timer) => cancelled.push(timer),
    );

    expect(marks).toEqual([1_000]);
    expect(scheduled[0].delayMs).toBeCloseTo(333.33, 2);

    now = 1_460;
    scheduled.shift()!.callback();
    expect(marks).toEqual([1_000, 1_460]);
    expect(scheduled[0].delayMs).toBeCloseTo(206.67, 2);

    now += scheduled[0].delayMs;
    scheduled.shift()!.callback();
    expect(marks[2]).toBeCloseTo(1_666.67, 2);
    expect(scheduled[0].delayMs).toBeCloseTo(333.33, 2);

    stop();
    expect(cancelled).toHaveLength(1);
  });
});
