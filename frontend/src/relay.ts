export function normalizeRoomCode(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
}

export function timingScore(deltaMs: number, beatMs: number): number {
  const window = beatMs / 2;
  return Math.max(0, Math.round(100 * (1 - Math.abs(deltaMs) / window)));
}

export function averageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export function nearestBeatDelta(now: number, beats: number[]): number | null {
  if (beats.length === 0) return null;
  return beats.reduce((nearest, beat) =>
    Math.abs(now - beat) < Math.abs(nearest) ? now - beat : nearest,
  now - beats[0]);
}

type BeatTimer = (callback: () => void, delayMs: number) => number;

export function startBeatClock(
  onBeat: () => void,
  intervalMs: number,
  now: () => number = () => performance.now(),
  schedule: BeatTimer = (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancel: (timer: number) => void = (timer) => window.clearTimeout(timer),
): () => void {
  const startedAt = now();
  let nextBeat = 0;
  let timer: number | undefined;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    onBeat();
    nextBeat += 1;
    const nextDeadline = startedAt + nextBeat * intervalMs;
    timer = schedule(tick, Math.max(0, nextDeadline - now()));
  };

  tick();
  return () => {
    stopped = true;
    if (timer !== undefined) cancel(timer);
  };
}
