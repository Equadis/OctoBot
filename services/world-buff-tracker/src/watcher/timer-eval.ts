import { medianOf } from "./duration-store.js";

/**
 * Self-evaluation of the learned raid-duration timer. The store already learns a median
 * clear time and predicts a forming raid's end from it; this scores how good that
 * prediction has BEEN, so the overnight logs can answer "is the timer any good?" without
 * anybody eyeballing raw durations.
 *
 * It replays history honestly: for each clear, it predicts from ONLY the clears that came
 * before it (an expanding-window median, the information the bot actually had at the time)
 * and compares to what happened. From those residuals:
 *
 *   - `maeMs`  — mean absolute error: typical miss, in either direction.
 *   - `biasMs` — mean signed error (actual − predicted). POSITIVE means raids run LONGER
 *     than predicted, so the park-alert fires early (people wait); NEGATIVE means they run
 *     short, so it fires late (people can miss the window) — the worse failure.
 *   - `p90ErrorMs` — the 90th-percentile miss, the tail a reader should size for.
 *
 * And it CLOSES the loop: `improvedEstimate` is the median with that measured bias pulled back
 * out, which is the number the live timer actually uses — so the more the bot sees, the better
 * its prediction, not just its self-report. Pure over the chronological series, so both are
 * unit-tested without a clock or a database.
 */
export interface TimerEvaluation {
  /** Total clears on record. */
  readonly samples: number;
  /** The plain learned median estimate (ms), or null while still below `minSamples`. */
  readonly estimateMs: number | null;
  /** The bias-corrected estimate the live timer uses (ms), or null below `minSamples`. */
  readonly improvedEstimateMs: number | null;
  /** How many past clears were scored (those with at least `minSamples` priors). */
  readonly evaluated: number;
  /** Mean absolute prediction error (ms), or null if nothing was scored. */
  readonly maeMs: number | null;
  /** Mean signed error (ms): actual − predicted. Positive = raids run longer than predicted. */
  readonly biasMs: number | null;
  /** 90th-percentile absolute error (ms), or null if nothing was scored. */
  readonly p90ErrorMs: number | null;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Below this many clears there is no distribution worth quoting, so the reader-facing "how long
 *  does a raid take" falls back to the single config estimate rather than an invented range. */
const MIN_SAMPLES_FOR_RANGE = 6;

/**
 * A reader-facing "how long a raid usually takes" string for the alerts, honest about the wide
 * spread: the middle half of observed clears (25th–75th percentile) rounded to the nearest 5
 * minutes, e.g. "30-50m". Below MIN_SAMPLES_FOR_RANGE clears there is no distribution to quote,
 * so it shows the config estimate as a single "~Nm". ASCII hyphen so it renders in-game too.
 */
export function typicalClearText(samplesMs: readonly number[], estimateMs: number): string {
  const toMin = (ms: number): number => Math.round(ms / 60_000);
  const round5 = (min: number): number => Math.round(min / 5) * 5;
  if (samplesMs.length < MIN_SAMPLES_FOR_RANGE) return `~${toMin(estimateMs)}m`;
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const at = (q: number): number => {
    const i = (sorted.length - 1) * q;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
  };
  const low = round5(toMin(at(0.25)));
  const high = Math.max(low + 5, round5(toMin(at(0.75))));
  return `${low}-${high}m`;
}

/** The value at the given quantile (0..1) of the sorted absolute errors. */
function percentile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[idx]!;
}

/**
 * Honest expanding-window residuals: for each clear from `minSamples` on, `actual − median(of
 * only the clears before it)` — the prediction the bot could have made at that moment. Shared
 * by the evaluation and the improved estimate so they never disagree about the past.
 */
function residuals(seriesChrono: readonly number[], minSamples: number): { signed: number[]; abs: number[] } {
  const signed: number[] = [];
  const abs: number[] = [];
  for (let i = Math.max(minSamples, 1); i < seriesChrono.length; i += 1) {
    const predicted = medianOf(seriesChrono.slice(0, i));
    if (predicted === null) continue;
    const error = seriesChrono[i]! - predicted;
    signed.push(error);
    abs.push(Math.abs(error));
  }
  return { signed, abs };
}

/** How far the bias correction may move the estimate, as a fraction of the base median.
 *  ASYMMETRIC on purpose: predicting SHORTER (raids ran short) fires the heads-up earlier,
 *  which is safe, so it's allowed further; predicting LONGER delays the heads-up — the worse
 *  failure — so it's capped tighter. Both keep thin/noisy history from swinging the estimate. */
const MAX_DOWN_FRACTION = 0.25;
const MAX_UP_FRACTION = 0.15;

/**
 * The self-IMPROVING estimate: the learned median, corrected by the MEDIAN of its own past
 * residuals so a systematic miss (a cadence that shifted, a stale window) is pulled out. The
 * median residual is used, not the mean, for the same reason the base predictor is a median —
 * a wipe or a stalled raid is an outlier that must not drag the correction. The correction is
 * clamped (asymmetrically, above), so it can only nudge the estimate, never dominate it.
 * Returns null below `minSamples`, exactly like the plain median, so the caller falls back to
 * the config estimate identically.
 */
export function improvedEstimate(seriesChrono: readonly number[], minSamples: number): number | null {
  if (seriesChrono.length < minSamples) return null;
  const base = medianOf(seriesChrono);
  if (base === null) return null;
  const { signed } = residuals(seriesChrono, minSamples);
  const correction = signed.length ? medianOf(signed)! : 0;
  const clamped = Math.max(-base * MAX_DOWN_FRACTION, Math.min(base * MAX_UP_FRACTION, correction));
  return Math.round(base + clamped);
}

/**
 * @param seriesChrono clear durations (ms) in the order they happened, oldest first.
 * @param minSamples   the same floor the live estimate uses before it trusts the median.
 */
export function evaluateTimer(seriesChrono: readonly number[], minSamples: number): TimerEvaluation {
  const samples = seriesChrono.length;
  const estimateMs = samples >= minSamples ? medianOf(seriesChrono) : null;
  const { signed, abs } = residuals(seriesChrono, minSamples);
  const evaluated = abs.length;
  return {
    samples,
    estimateMs,
    improvedEstimateMs: improvedEstimate(seriesChrono, minSamples),
    evaluated,
    maeMs: evaluated ? mean(abs) : null,
    biasMs: evaluated ? mean(signed) : null,
    p90ErrorMs: evaluated ? percentile(abs, 0.9) : null,
  };
}
