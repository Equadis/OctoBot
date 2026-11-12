/**
 * The raids whose boss head drops the Rallying Cry of the Dragonslayer: Onyxia's Lair (Onyxia's head)
 * and Blackwing Lair (Nefarian's head). Both heads land the same city-wide buff, but each comes from
 * its own raid, so the bot watches each lair on its own and labels every drop with the head behind it.
 *
 * This is the wording half only — what a raid and its boss are called in alerts and status. Where the
 * lair is (its /who area id) and how its raids behave (sizes, clear times) are configuration.
 */
export type RaidZoneId = "onyxia" | "bwl";

export const RAID_ZONE_IDS: readonly RaidZoneId[] = ["onyxia", "bwl"];

export interface RaidZone {
  readonly id: RaidZoneId;
  /** The boss whose head, turned in, drops the Rallying Cry: "Onyxia", "Nefarian". */
  readonly boss: string;
  /** The raid's short name in alerts and status: "Onyxia", "BWL". */
  readonly raidName: string;
  /** The zone's own name, as the game spells it: "Onyxia's Lair", "Blackwing Lair". */
  readonly areaName: string;
  /** The zone's area id in stock 1.12 — what /who filters on unless configured otherwise. */
  readonly defaultAreaId: number;
}

export const ONYXIA: RaidZone = {
  id: "onyxia",
  boss: "Onyxia",
  raidName: "Onyxia",
  areaName: "Onyxia's Lair",
  defaultAreaId: 2159,
};

export const BLACKWING_LAIR: RaidZone = {
  id: "bwl",
  boss: "Nefarian",
  raidName: "BWL",
  areaName: "Blackwing Lair",
  defaultAreaId: 2677,
};

export const RAID_ZONES: Readonly<Record<RaidZoneId, RaidZone>> = { onyxia: ONYXIA, bwl: BLACKWING_LAIR };

export function isRaidZoneId(value: unknown): value is RaidZoneId {
  return value === "onyxia" || value === "bwl";
}
