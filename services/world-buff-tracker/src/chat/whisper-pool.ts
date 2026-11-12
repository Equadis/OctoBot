import type { Faction } from "../subscribers/store.js";
import type { AlertWhisper, WhisperQueue } from "./whisper-queue.js";

/**
 * The set of characters that can whisper — Bufftracker plus the parked listeners — pooled so a
 * broadcast to many subscribers is SPLIT across them. Each character has its own server-side
 * distinct-recipient throttle budget, so N members give roughly N× the headroom before the server
 * starts dropping whispers. Cross-faction whisper works on this realm (probed), so any member can
 * reach any subscriber; the alert's own faction is preferred first purely as a sensible default.
 *
 * Members register when in world and unregister on disconnect, so the pool is always the set that
 * can actually send right now.
 */
interface PoolMember {
  readonly faction: Faction | null;
  readonly queue: WhisperQueue;
}

export class WhisperPool {
  readonly #members = new Map<string, PoolMember>();

  register(id: string, faction: Faction | null, queue: WhisperQueue): void {
    this.#members.set(id, { faction, queue });
  }

  unregister(id: string): void {
    this.#members.delete(id);
  }

  get size(): number {
    return this.#members.size;
  }

  /**
   * Fan `message` out to `targets`, split evenly across the available members (the alert's-faction
   * members first). Each member's own queue paces and throttle-handles its share independently.
   * Returns how many members carried the load — 0 if the pool is empty (caller should fall back).
   */
  fanOut(
    targets: readonly string[],
    message: string,
    faction: Faction | null = null,
    alert: AlertWhisper = {},
  ): number {
    const members = [...this.#members.values()];
    if (members.length === 0 || targets.length === 0) return 0;
    // Same-faction members first, the rest after — a stable preference, not a hard requirement.
    members.sort((a, b) => Number(b.faction === faction) - Number(a.faction === faction));
    targets.forEach((target, i) => {
      members[i % members.length]?.queue.enqueue(target, message, alert);
    });
    return members.length;
  }

  /** Purge the pending park alerts about `faction`'s capital across every member (a buff dropped
   *  there). Returns the total dropped. */
  dropForFaction(faction: Faction): number {
    let dropped = 0;
    for (const member of this.#members.values()) dropped += member.queue.dropForFaction(faction);
    return dropped;
  }
}
