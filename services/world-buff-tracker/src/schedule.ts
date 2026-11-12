/**
 * A randomized delay around a base interval, so the /who cadence isn't a perfectly
 * regular tick (which is itself an automation fingerprint).
 *
 * jitter(60000, 0.15) returns a value in [51000, 69000]. `random` is injectable
 * for deterministic tests.
 */
export function jitter(baseMs: number, ratio: number, random: () => number = Math.random): number {
  if (ratio < 0 || ratio > 1) throw new RangeError("ratio must be between 0 and 1");
  const delta = baseMs * ratio;
  return Math.round(baseMs - delta + random() * delta * 2);
}
