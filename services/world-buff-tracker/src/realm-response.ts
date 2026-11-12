/**
 * Turns the realm's ping into a QUALITATIVE verdict, because the bot pings from US-hosted Railway and
 * the readers are worldwide — the absolute millisecond number is meaningless to them, and worse,
 * misread as their own ping. What IS meaningful and location-independent is how the realm's ping
 * behaves against ITS OWN typical baseline: is it steady, running higher than usual, or fluctuating?
 *
 * The baseline is a slow time-decayed average (~a day) of the recent median ping, persisted so it
 * survives the frequent redeploys. A short spike barely moves it; a sustained shift adapts it over
 * ~a day. The verdict compares the current short-window median/spread against that baseline. All pure,
 * so the thresholds are pinned by tests rather than computed inline where nobody can check them.
 */

export type RealmResponse = "unknown" | "steady" | "elevated" | "unstable";

export interface ResponseBaseline {
  /** Time-decayed average of the median ping (the "typical" line), or null before any sample. */
  readonly emaMs: number | null;
  /** How many samples have been folded in — a warm-up gate before the verdict is trusted. */
  readonly samples: number;
  /** When the baseline was last folded (epoch ms), for the time-aware decay; null if never. */
  readonly updatedAt: number | null;
}

export const EMPTY_BASELINE: ResponseBaseline = { emaMs: null, samples: 0, updatedAt: null };

/** ~1 day of memory for the baseline. */
export const BASELINE_TAU_MS = 24 * 60 * 60_000;

/**
 * Fold the current median ping into the baseline with a time-aware EMA: weight = 1 - e^(-dt/tau), so
 * the memory length is ~tau however often this is called (robust to the refresh interval changing).
 * A null median (no pongs — realm down/quiet) is ignored, so outages don't drag the line up.
 */
export function foldBaseline(
  prev: ResponseBaseline,
  medianMs: number | null,
  now: number,
  tauMs: number = BASELINE_TAU_MS,
): ResponseBaseline {
  if (medianMs === null) return prev;
  if (prev.emaMs === null || prev.updatedAt === null) {
    return { emaMs: medianMs, samples: 1, updatedAt: now };
  }
  const dt = Math.max(0, now - prev.updatedAt);
  const weight = 1 - Math.exp(-dt / tauMs);
  return {
    emaMs: prev.emaMs + weight * (medianMs - prev.emaMs),
    samples: prev.samples + 1,
    updatedAt: now,
  };
}

export interface ResponseThresholds {
  /** The baseline must have at least this many folds before the verdict is anything but "unknown". */
  readonly minSamples: number;
  /** "elevated" once the current median exceeds baseline * this. */
  readonly elevatedFactor: number;
  /** "unstable" once the current spread exceeds baseline * this... */
  readonly unstableSpreadFactor: number;
  /** ...but never below this floor, so ordinary jitter on a low baseline isn't called unstable. */
  readonly unstableSpreadFloorMs: number;
}

export const DEFAULT_RESPONSE_THRESHOLDS: ResponseThresholds = {
  minSamples: 5,
  elevatedFactor: 1.5,
  unstableSpreadFactor: 0.6,
  unstableSpreadFloorMs: 120,
};

/**
 * The verdict. Instability is checked first (a fluctuating realm is the most notable), then elevation,
 * else steady. "unknown" while there is no current reading or the baseline has not warmed up — better
 * to say nothing than to judge against a baseline built from a handful of samples.
 */
export function classifyResponse(
  medianMs: number | null,
  spreadMs: number | null,
  baseline: ResponseBaseline,
  t: ResponseThresholds = DEFAULT_RESPONSE_THRESHOLDS,
): RealmResponse {
  if (medianMs === null || spreadMs === null) return "unknown";
  if (baseline.emaMs === null || baseline.samples < t.minSamples) return "unknown";
  const unstableAbove = Math.max(t.unstableSpreadFloorMs, baseline.emaMs * t.unstableSpreadFactor);
  if (spreadMs > unstableAbove) return "unstable";
  if (medianMs > baseline.emaMs * t.elevatedFactor) return "elevated";
  return "steady";
}
