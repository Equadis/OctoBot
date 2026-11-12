import type { CombatEvent } from "../protocol/combat-log.js";
import type { UnitOwner } from "../protocol/unit-owner.js";

/**
 * Remembers the last few seconds around a parked listener, so that when it dies there is an
 * account of how.
 *
 * Nothing is logged while the character is fine — a city is busy and almost all of it is noise.
 * The recorder only keeps a rolling window of what could explain a death: hits taken, nearby player
 * chat, server system messages, and our own health. The moment our health drops to zero it hands
 * that window back.
 *
 * A character that is already dead when first seen (logged in as a corpse) produces no report:
 * whatever killed it happened before this session and is not in the window.
 */

export type DeathClue =
  | {
      readonly at: number;
      readonly kind: "combat";
      readonly event: CombatEvent;
      /** Who the attacker answered to at the time — a warlock behind its Infernal. Null for none. */
      readonly attackerOwner: UnitOwner | null;
    }
  | {
      readonly at: number;
      readonly kind: "chat";
      readonly senderGuid: bigint;
      readonly chatType: number;
      readonly text: string;
    }
  | { readonly at: number; readonly kind: "system"; readonly text: string }
  | { readonly at: number; readonly kind: "health"; readonly health: number };

export interface DeathReport {
  readonly diedAt: number;
  /** Oldest first, all within the window before `diedAt`, ending with the health reaching zero. */
  readonly clues: readonly DeathClue[];
}

export interface DeathRecorderOptions {
  /** How far back a report reaches. */
  readonly windowMs: number;
  /** Hard cap on clues held, so a crowded city cannot grow the buffer without bound. */
  readonly maxClues?: number;
}

export class DeathRecorder {
  readonly #windowMs: number;
  readonly #maxClues: number;
  #clues: DeathClue[] = [];
  #health: number | null = null;

  constructor(options: DeathRecorderOptions) {
    this.#windowMs = options.windowMs;
    this.#maxClues = options.maxClues ?? 200;
  }

  record(clue: DeathClue): void {
    this.#clues.push(clue);
    this.#prune(clue.at);
  }

  /**
   * Note our health. Returns the report when this reading is the death — alive before, zero now —
   * and null otherwise. Only a change is kept as a clue.
   */
  observeHealth(at: number, health: number): DeathReport | null {
    const previous = this.#health;
    this.#health = health;
    if (previous === health) return null;
    this.record({ at, kind: "health", health });
    if (health !== 0 || previous === null || previous === 0) return null;
    return { diedAt: at, clues: this.#clues.filter((clue) => clue.at >= at - this.#windowMs) };
  }

  #prune(now: number): void {
    const cutoff = now - this.#windowMs;
    this.#clues = this.#clues.filter((clue) => clue.at >= cutoff);
    if (this.#clues.length > this.#maxClues) this.#clues = this.#clues.slice(-this.#maxClues);
  }
}
