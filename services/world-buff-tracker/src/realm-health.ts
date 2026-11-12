/**
 * Realm latency health, from the CMSG_PING -> SMSG_PONG round-trip the world client already runs as
 * its keepalive. Two pure pieces, so the logic is unit-tested without a socket or a clock:
 *
 *  - `pongLatency` matches a pong to the outstanding ping by sequence and returns the RTT.
 *  - `isRealmStable` decides whether recent samples are good enough to call the realm healthy —
 *    pongs are flowing (enough recent samples), the median is REASONABLE, and the spread is STEADY
 *    (not spiking). Used to gate the "server back up" post: a raid can't run on a laggy server, so
 *    recovery is declared only once the realm answers quickly and consistently.
 */

/** One measured round-trip: `ms` latency, taken at `at` (epoch ms). */
export interface PingSample {
  readonly ms: number;
  readonly at: number;
}

/** The ping awaiting its pong — the client keeps the latest, since pings are sequential. */
export interface PendingPing {
  readonly seq: number;
  readonly sentAt: number;
}

/**
 * The RTT for a pong, or null if it doesn't match the outstanding ping (a stale/duplicate pong, or
 * none pending). `seq` is the sequence echoed in SMSG_PONG; `now` the receive time.
 */
export function pongLatency(pending: PendingPing | null, seq: number, now: number): number | null {
  if (pending === null || pending.seq !== seq) return null;
  return Math.max(0, now - pending.sentAt);
}

export interface RealmHealthThresholds {
  /** Only samples taken within this long of `now` count — so pre-outage or stalled pings never do. */
  readonly windowMs: number;
  /** The realm is "reasonable" only if the median recent RTT is at or under this. */
  readonly maxMedianMs: number;
  /** The realm is "steady" only if the recent RTTs span at most this (max - min). */
  readonly maxSpreadMs: number;
  /** At least this many samples must be in the window — proof pongs are actually arriving. */
  readonly minSamples: number;
}

/**
 * Is the realm answering quickly and consistently right now? True only when, over the samples taken
 * within `windowMs` of `now`, there are at least `minSamples` (pongs flowing), the median is at or
 * under `maxMedianMs` (reasonable), and the spread is at or under `maxSpreadMs` (steady).
 */
export function isRealmStable(samples: readonly PingSample[], now: number, t: RealmHealthThresholds): boolean {
  const recent = samples.filter((s) => now - s.at <= t.windowMs).map((s) => s.ms);
  if (recent.length < t.minSamples) return false;
  const sorted = [...recent].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? Infinity;
  if (median > t.maxMedianMs) return false;
  const spread = (sorted[sorted.length - 1] ?? Infinity) - (sorted[0] ?? 0);
  return spread <= t.maxSpreadMs;
}

/** The median RTT over the samples in the window, or null if none — for the status/recovery wording. */
export function medianLatency(samples: readonly PingSample[], now: number, windowMs: number): number | null {
  const recent = samples.filter((s) => now - s.at <= windowMs).map((s) => s.ms).sort((a, b) => a - b);
  if (recent.length === 0) return null;
  return recent[Math.floor(recent.length / 2)] ?? null;
}

/** The spread (max - min) of the RTTs in the window, or null if none — a jitter measure for the
 *  status widget's "steady vs fluctuating" verdict. */
export function latencySpread(samples: readonly PingSample[], now: number, windowMs: number): number | null {
  const recent = samples.filter((s) => now - s.at <= windowMs).map((s) => s.ms);
  if (recent.length === 0) return null;
  return Math.max(...recent) - Math.min(...recent);
}
