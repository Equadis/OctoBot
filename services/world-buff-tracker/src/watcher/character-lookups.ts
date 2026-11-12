/**
 * Asks something of whichever of our characters is in world to answer it — each lookup runs on one
 * character's own connection, and any of them will do.
 *
 * Two are pooled this way. A listener that sees an Infernal logs straight out, so it is not connected
 * long enough to ask who raised it: the others name the owner's GUID. And a player put on the wall
 * of shame by name alone needs a GUID to be spotted nearby: the others find it from the name. The one
 * that fled counts too, once it is back; a character leaves the pool when its connection closes, so
 * it is never asked while away.
 */

/** One character's way of answering — on its own connection; null when it could not. */
export type CharacterLookup<Query, Answer> = (query: Query) => Promise<Answer | null>;

export interface ResolveOptions {
  /** How many rounds to try, when nobody can answer yet. */
  readonly attempts?: number;
  /** The wait between rounds. */
  readonly retryMs?: number;
}

export class CharacterLookups<Query, Answer> {
  readonly #lookups = new Map<string, CharacterLookup<Query, Answer>>();
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
    this.#sleep = sleep;
  }

  /** A character in world offers its lookup. */
  register(character: string, lookup: CharacterLookup<Query, Answer>): void {
    this.#lookups.set(character, lookup);
  }

  /** The character left the world. */
  unregister(character: string): void {
    this.#lookups.delete(character);
  }

  /**
   * The answer, asked of each character in turn; a round in which nobody could say is tried again
   * after `retryMs`, up to `attempts` rounds. Null when no round found it.
   */
  async resolve(query: Query, options: ResolveOptions = {}): Promise<Answer | null> {
    const attempts = options.attempts ?? 1;
    for (let round = 0; round < attempts; round += 1) {
      if (round > 0) await this.#sleep(options.retryMs ?? 0);
      for (const lookup of [...this.#lookups.values()]) {
        const answer = await lookup(query);
        if (answer !== null) return answer;
      }
    }
    return null;
  }
}

/** Names a player's GUID. */
export type PlayerNames = CharacterLookups<bigint, string>;
/** Finds a player's GUID from their name. */
export type PlayerGuids = CharacterLookups<string, bigint>;
