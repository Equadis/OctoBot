/**
 * Recognises the one NPC that proves a parked character is dead.
 *
 * A Spirit Healer only stands at a graveyard, and a listener only reaches a graveyard by dying and
 * releasing. So seeing one next to us is not a hint that something is wrong — it is the answer:
 * the character is a corpse run away from where it is supposed to be standing, it cannot hear the
 * capital, and it cannot yell.
 *
 * This is the fast half of the health check. Silence (see `listener-silence.ts`) catches every way
 * a listener can stop working but takes hours to be sure; this catches the most likely single
 * cause within a poll, and says exactly what happened instead of listing possibilities.
 */

/** The graveyard attendant, as the server names it. */
const SPIRIT_HEALER = "spirit healer";

/** Whether a resolved NPC name is the graveyard's Spirit Healer. */
export function isSpiritHealer(name: string): boolean {
  return name.trim().toLowerCase() === SPIRIT_HEALER;
}
