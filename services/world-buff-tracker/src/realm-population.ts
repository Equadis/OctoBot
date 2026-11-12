import type { WhoFn } from "./watcher/roster.js";

/**
 * The realm's ONLINE PLAYER COUNT, read off the `/who` responses the bot already sends.
 *
 * SMSG_WHO carries two numbers: the players listed (capped at 49) and a second count. On this core
 * that second count is REALM-WIDE, not a tally of the query's own matches — a zone `/who` for an
 * empty Onyxia's Lair came back "0 returned, 661 online". So every `/who` the bot makes, whatever it
 * filters on, hands back the realm population for free.
 *
 * Which is why this observes the `WhoFn` seam (`observePopulation`) instead of taking a census of its
 * own: the server lets each character `/who` only about once every 30s (see net/who-pool.ts), so a
 * dedicated population query would spend lookups the raid detection needs. The watcher polls every ~20s, so the reading is near-live at zero extra cost.
 *
 * A reading EXPIRES (`staleAfterMs`). When the realm goes down — or the watcher simply stops polling
 * — no `/who` lands, and the widget has to say "unknown" rather than freeze the last count from
 * before the outage next to a "Down" status.
 */

/** One observed realm population: `online` players, seen at `at` (epoch ms). */
export interface PopulationReading {
  readonly online: number;
  readonly at: number;
}

/** How long a reading stays current. Generously above the ~20s poll interval: anything older means
 *  the watcher is not polling at all, and a count from that long ago is not worth showing. */
export const DEFAULT_POPULATION_STALE_MS = 10 * 60_000;

/** The latest realm population the bot has seen, with an expiry so a stale count is never shown. */
export class RealmPopulation {
  readonly #staleAfterMs: number;
  #latest: PopulationReading | null = null;

  constructor(staleAfterMs: number = DEFAULT_POPULATION_STALE_MS) {
    this.#staleAfterMs = staleAfterMs;
  }

  /** Record a reading. Non-integer, negative, and out-of-order readings are ignored — `/who` replies
   *  are queued but resolve independently, so an older one must not overwrite a newer one. */
  record(online: number, at: number): void {
    if (!Number.isInteger(online) || online < 0) return;
    if (this.#latest !== null && at < this.#latest.at) return;
    this.#latest = { online, at };
  }

  /** The current count, or null when nothing has been read yet or the last reading has expired. */
  current(now: number): number | null {
    if (this.#latest === null) return null;
    return now - this.#latest.at > this.#staleAfterMs ? null : this.#latest.online;
  }
}

/**
 * Wrap a `/who` function so every successful response also feeds its realm-wide online count to
 * `population`. A rejected query records nothing and its error propagates untouched — observing must
 * never change what the caller sees.
 */
export function observePopulation(
  who: WhoFn,
  population: RealmPopulation,
  now: () => number = Date.now,
): WhoFn {
  return async (query) => {
    const result = await who(query);
    population.record(result.onlineCount, now());
    return result;
  };
}
