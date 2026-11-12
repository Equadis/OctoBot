import type { Faction } from "./buff-store.js";
import { factionOfRace } from "./faction.js";

/**
 * A player's race and class in words — "Horde Orc Warlock" — from the ids a /who reply carries.
 *
 * Only the vanilla races and classes are named. OctoWoW may add custom races whose ids have not been
 * seen yet, so an unknown id is shown as it is ("race #10") rather than guessed at, and its faction
 * is left out — the same caution faction.ts takes.
 */

export interface CharacterDetails {
  readonly raceId: number;
  readonly classId: number;
}

const RACE_NAMES: ReadonlyMap<number, string> = new Map([
  [1, "Human"],
  [2, "Orc"],
  [3, "Dwarf"],
  [4, "Night Elf"],
  [5, "Undead"],
  [6, "Tauren"],
  [7, "Gnome"],
  [8, "Troll"],
]);

const CLASS_NAMES: ReadonlyMap<number, string> = new Map([
  [1, "Warrior"],
  [2, "Paladin"],
  [3, "Hunter"],
  [4, "Rogue"],
  [5, "Priest"],
  [7, "Shaman"],
  [8, "Mage"],
  [9, "Warlock"],
  [11, "Druid"],
]);

const FACTION_NAMES: Readonly<Record<Faction, string>> = { alliance: "Alliance", horde: "Horde" };

/** Whether the race id is one this module can name — false for a custom race not yet mapped. */
export function isKnownRace(raceId: number): boolean {
  return RACE_NAMES.has(raceId);
}

/** "Horde Orc Warlock"; an unmapped race or class is shown by its id, and then no faction. */
export function describeCharacter({ raceId, classId }: CharacterDetails): string {
  const faction = factionOfRace(raceId);
  const race = RACE_NAMES.get(raceId) ?? `race #${raceId}`;
  const cls = CLASS_NAMES.get(classId) ?? `class #${classId}`;
  return [faction ? FACTION_NAMES[faction] : null, race, cls].filter((part) => part !== null).join(" ");
}
