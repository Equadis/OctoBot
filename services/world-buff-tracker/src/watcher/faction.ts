import type { WhoPlayer } from "../protocol/who.js";
import type { Faction } from "./buff-store.js";

/**
 * Splits a `/who` roster by faction (c). OctoWoW's `/who` returns both factions
 * mixed (see `protocol/who.ts`), and the buff we time is faction-wide, so a lair
 * roster must be attributed to a side before it can be gated against that side's
 * buff. Faction is read from each player's race.
 *
 * Only the eight vanilla races are known by default. Turtle/OctoWoW add custom
 * races (e.g. High Elf) whose ids we have not observed yet, so an unknown race
 * classifies as `null` rather than being forced onto a side — and the caller can
 * pass `overrides` to teach it a custom id once one is seen in live `/who` data.
 */

const VANILLA_RACE_FACTION: ReadonlyMap<number, Faction> = new Map([
  [1, "alliance"], // Human
  [3, "alliance"], // Dwarf
  [4, "alliance"], // Night Elf
  [7, "alliance"], // Gnome
  [2, "horde"], // Orc
  [5, "horde"], // Undead
  [6, "horde"], // Tauren
  [8, "horde"], // Troll
]);

/** The faction a race belongs to, or null if the race id is not known. */
export function factionOfRace(
  raceId: number,
  overrides?: ReadonlyMap<number, Faction>,
): Faction | null {
  return overrides?.get(raceId) ?? VANILLA_RACE_FACTION.get(raceId) ?? null;
}

export interface FactionSplit {
  readonly alliance: WhoPlayer[];
  readonly horde: WhoPlayer[];
  /** Players whose race id is not mapped to a faction. */
  readonly unknown: WhoPlayer[];
}

/** Partition a roster into alliance / horde / unknown by race. */
export function splitByFaction(
  players: readonly WhoPlayer[],
  overrides?: ReadonlyMap<number, Faction>,
): FactionSplit {
  const alliance: WhoPlayer[] = [];
  const horde: WhoPlayer[] = [];
  const unknown: WhoPlayer[] = [];
  for (const player of players) {
    const faction = factionOfRace(player.raceId, overrides);
    if (faction === "alliance") alliance.push(player);
    else if (faction === "horde") horde.push(player);
    else unknown.push(player);
  }
  return { alliance, horde, unknown };
}

/**
 * The faction that owns a group, by strict majority of its known-faction members.
 * Returns null when the group is empty, entirely unknown, or evenly split — a tie
 * is meaningful (it usually means two raids of opposite factions share the lair).
 */
export function majorityFaction(
  players: readonly WhoPlayer[],
  overrides?: ReadonlyMap<number, Faction>,
): Faction | null {
  const { alliance, horde } = splitByFaction(players, overrides);
  if (alliance.length === horde.length) return null;
  return alliance.length > horde.length ? "alliance" : "horde";
}
