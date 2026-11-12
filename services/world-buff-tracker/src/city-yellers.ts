import type { YellSink } from "./lanes.js";
import type { Faction } from "./watcher/buff-store.js";

/**
 * Which listener shouts into each capital. Every yeller parked in a city signs up while it is in
 * world; the one listed first in WOW_LISTENERS holds its side's yell, and a later one takes over only
 * while every one ahead of it is offline — handing the yell back the moment one of them returns.
 *
 * Before this the yell went to whichever yeller logged in last, so a backup parked out of the crowd's
 * earshot could take it from the primary; and a holder dropping left its side with no yell at all,
 * even with another yeller still standing in the city.
 */

type Yell = (message: string) => void;

export class CityYellers implements YellSink {
  readonly #rank: ReadonlyMap<string, number>;
  readonly #signedUp = new Map<Faction, Map<string, Yell>>();

  /** `priority`: the listeners' character names, the first to yell first. */
  constructor(priority: readonly string[]) {
    this.#rank = new Map(priority.map((name, index) => [name.toLowerCase(), index]));
  }

  /** A yeller is in world in `faction`'s capital. Returns who holds that side's yell now. */
  signUp(faction: Faction, characterName: string, yell: Yell): string {
    const side = this.#signedUp.get(faction) ?? new Map<string, Yell>();
    side.set(characterName, yell);
    this.#signedUp.set(faction, side);
    return this.holder(faction) ?? characterName;
  }

  /**
   * A yeller is gone. `yell` is the one it signed up with: a reconnect that has already signed up
   * again is left alone. Returns who holds the side's yell now, or null if no yeller is left.
   */
  leave(faction: Faction, characterName: string, yell: Yell): string | null {
    const side = this.#signedUp.get(faction);
    if (side?.get(characterName) === yell) side.delete(characterName);
    return this.holder(faction);
  }

  /** The character whose yell reaches `faction`'s capital, or null when none can yell there. */
  holder(faction: Faction): string | null {
    const side = this.#signedUp.get(faction);
    if (!side) return null;
    return [...side.keys()].sort((a, b) => this.#rankOf(a) - this.#rankOf(b))[0] ?? null;
  }

  yellFor(faction: Faction): Yell | undefined {
    const holder = this.holder(faction);
    return holder === null ? undefined : this.#signedUp.get(faction)?.get(holder);
  }

  /** A name missing from the priority list yells only after every listed one. */
  #rankOf(characterName: string): number {
    return this.#rank.get(characterName.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
  }
}
