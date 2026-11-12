/**
 * Tracks consecutive failures of a self-reconnecting supervisor so a SUSTAINED outage
 * (not a transient blip) alerts the errors channel exactly once, and its recovery is
 * announced exactly once — no spam while it retries, no silence while it's down.
 *
 * `fail()` returns true only on the failure that crosses the threshold; `recover()`
 * returns true only when a clean run follows an outage we had alerted about. Pure, so
 * the latch logic is unit-tested without a network or a clock.
 */
export class DownTracker {
  #failures = 0;
  #alerted = false;
  readonly #threshold: number;

  /** Alert after this many consecutive failures (backoff caps at 60s, so ~5 ≈ a couple of minutes). */
  constructor(threshold: number) {
    this.#threshold = Math.max(1, threshold);
  }

  /** Count a failure. True the moment it crosses the threshold (alert now), false otherwise. */
  fail(): boolean {
    this.#failures += 1;
    if (this.#failures >= this.#threshold && !this.#alerted) {
      this.#alerted = true;
      return true;
    }
    return false;
  }

  /** A clean run. True if it ends an outage we had alerted about (announce recovery), else false. */
  recover(): boolean {
    this.#failures = 0;
    if (this.#alerted) {
      this.#alerted = false;
      return true;
    }
    return false;
  }

  /** Consecutive failures so far — for the alert wording. */
  get failures(): number {
    return this.#failures;
  }
}
