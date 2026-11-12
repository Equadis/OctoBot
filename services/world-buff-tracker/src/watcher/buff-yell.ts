import type { Faction } from "./buff-store.js";
import type { RaidZoneId } from "./raid-zone.js";

/**
 * Recognises the city-wide NPC yell that fires when a dragon head is turned in and
 * the Rallying Cry of the Dragonslayer buff drops (a).
 *
 * EITHER Onyxia's or Nefarian's head triggers the same faction-wide buff, so all four
 * yells count as "this faction's buff just dropped" — and each also says WHICH head it
 * was, so a Nefarian drop is checked against Blackwing Lair (not Onyxia's empty lair,
 * which would wrongly call it a saved head) and labelled as Nefarian's.
 *
 * Trigger strings are from the PizzaWorldBuffs addon (Turtle WoW) and MUST be
 * confirmed against a live Octo drop. The world client logs any unmatched monster
 * yell so the real text can be captured and corrected here if Octo's differs.
 */

/** A heard buff yell: whose capital the buff dropped in, and whose head was turned in. */
export interface BuffYell {
  readonly faction: Faction;
  readonly head: RaidZoneId;
}

interface YellTrigger extends BuffYell {
  /** A distinctive substring of the full yell; matched with `includes`. */
  readonly needle: string;
}

const TRIGGERS: readonly YellTrigger[] = [
  { faction: "alliance", head: "onyxia", needle: "Onyxia, hangs from the arches" },
  { faction: "alliance", head: "bwl", needle: "the Lord of Blackrock is slain! Nefarian has been subdued" },
  { faction: "horde", head: "onyxia", needle: "The brood mother, Onyxia, has been slain" },
  { faction: "horde", head: "bwl", needle: "NEFARIAN IS SLAIN! People of Orgrimmar" },
];

/** The buff that just dropped (side + head), or null if the text is not a buff yell. */
export function matchBuffYell(text: string): BuffYell | null {
  for (const trigger of TRIGGERS) {
    if (text.includes(trigger.needle)) return { faction: trigger.faction, head: trigger.head };
  }
  return null;
}
