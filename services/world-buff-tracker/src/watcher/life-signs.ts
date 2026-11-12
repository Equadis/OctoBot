/**
 * Whether a character is alive, read from its own health, and reported only when that changes.
 *
 * A corpse has 0 health, and a released ghost 1 — the server sets a ghost's health to 1 — so anything
 * above 1 is alive. Two things settle it sooner than a health reading can: a Spirit Healer beside the
 * character (it released at a graveyard) and a resurrection it accepted.
 */

/** A ghost's health — the server's, on releasing — and so the most a dead character reads. */
const GHOST_HEALTH = 1;

export class LifeSigns {
  readonly #onChange: (alive: boolean) => void;
  #alive: boolean | null = null;

  constructor(onChange: (alive: boolean) => void) {
    this.#onChange = onChange;
  }

  /** A health reading from an object update. */
  health(health: number): void {
    this.#set(health > GHOST_HEALTH);
  }

  /** A Spirit Healer is beside the character: it died and released. */
  released(): void {
    this.#set(false);
  }

  /** The character accepted a resurrection. */
  resurrected(): void {
    this.#set(true);
  }

  #set(alive: boolean): void {
    if (alive === this.#alive) return;
    this.#alive = alive;
    this.#onChange(alive);
  }
}
