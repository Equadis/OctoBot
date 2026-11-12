/**
 * Decides which nearby creature entries are worth asking the server to name.
 *
 * A parked character receives object updates constantly, and the same handful of entries over and
 * over — every wandering critter re-enters visibility all day. A creature's name never changes, so
 * one query per entry for the whole session is both correct and the difference between a few dozen
 * packets and a steady trickle forever.
 *
 * Entries are remembered as ASKED, not as answered: a query that goes unanswered (an entry the
 * server does not know, a dropped reply) must not be retried on a loop. The cost of that is one
 * unknown NPC staying unknown until the next reconnect, which is the right trade for a bot whose
 * whole job is to sit still without looking like a script.
 */
export class NpcWatch {
  readonly #asked = new Set<number>();
  readonly #limit: number;

  /** `limit` caps how many distinct entries may ever be asked about, so a pathological zone (or a
   *  mis-parsed update stream inventing entries) cannot turn into unbounded queries. */
  constructor(limit = 500) {
    this.#limit = limit;
  }

  /**
   * Filter `entries` down to the ones not asked about yet, marking them asked. Returns at most
   * `max` per call so a single crowded update does not fire a burst of queries at the server.
   */
  take(entries: Iterable<number>, max = 5): number[] {
    const fresh: number[] = [];
    for (const entry of entries) {
      if (fresh.length >= max) break;
      if (entry <= 0 || this.#asked.has(entry)) continue;
      if (this.#asked.size >= this.#limit) break;
      this.#asked.add(entry);
      fresh.push(entry);
    }
    return fresh;
  }

  /** How many distinct entries have been asked about, for the log line. */
  get asked(): number {
    return this.#asked.size;
  }
}
