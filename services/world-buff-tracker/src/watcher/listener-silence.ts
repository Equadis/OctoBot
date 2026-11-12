/**
 * Watches a parked listener for the one failure that has no symptom: hearing nothing.
 *
 * A city listener exists to overhear one NPC yell a month — the buff drop — so it can be deaf for
 * weeks and look perfectly healthy the whole time. It stays logged in, drains its whisper queue and
 * yells the status board on schedule, and every one of those is a sign of life that proves nothing
 * about the only thing it is for. The bot simply never mentions the buff, and nobody can tell that
 * from a quiet realm.
 *
 * What makes this detectable is that capitals are never actually silent. Criers, roaming vendors
 * and event NPCs yell through the day, so a correctly parked listener hears SOMETHING every few
 * hours. Measured over 19h: the Stormwind pair heard 164 yells each; one Orgrimmar character heard
 * 23 (a single roaming vendor, i.e. in the city but nowhere near the fixed criers); the other heard
 * zero while looking entirely healthy.
 *
 * So the check is deliberately not "did we hear a BUFF yell" — that would only fire once a month and
 * could not tell a deaf listener from a quiet one. It is "did we hear ANY monster chat", which
 * catches the whole class at once: a character that died and released to a graveyard, one parked
 * inside a building or in an empty corner, one the server stopped sending zone chat to.
 */

export interface SilenceWatchOptions {
  /** Silence longer than this means the listener is not where it needs to be. */
  readonly silenceMs: number;
  /** Grace after connecting before silence counts, so a fresh login is not instantly suspect. */
  readonly graceMs?: number;
}

export class SilenceWatch {
  readonly #silenceMs: number;
  readonly #graceMs: number;
  /** Last monster chat heard, or the connect time until something is. */
  #lastHeardAt: number;
  /** True once reported, so one deaf listener is one alert and not one per check. */
  #reported = false;

  constructor(connectedAt: number, options: SilenceWatchOptions) {
    this.#silenceMs = options.silenceMs;
    this.#graceMs = options.graceMs ?? 0;
    this.#lastHeardAt = connectedAt + this.#graceMs;
  }

  /** Any monster chat reached us — the listener is in earshot of the world. */
  heard(at: number): void {
    this.#lastHeardAt = at;
    // Re-arm: a listener that starts hearing again should be able to report a LATER silence.
    this.#reported = false;
  }

  /** How long this listener has been deaf. */
  silentFor(now: number): number {
    return Math.max(0, now - this.#lastHeardAt);
  }

  /**
   * Whether to raise the alarm now. True at most once per stretch of silence — the condition
   * persists by nature, and repeating it every check would train the reader to ignore it.
   */
  shouldReport(now: number): boolean {
    if (this.#reported) return false;
    if (this.silentFor(now) < this.#silenceMs) return false;
    this.#reported = true;
    return true;
  }
}
