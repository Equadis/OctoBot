import { describe, expect, it } from "vitest";
import type { WhoPlayer } from "../protocol/who.js";
import type { Faction } from "./buff-store.js";
import { factionOfRace, majorityFaction, splitByFaction } from "./faction.js";

const player = (name: string, raceId: number): WhoPlayer => ({
  name,
  guild: "",
  level: 60,
  classId: 1,
  raceId,
  areaId: 2159,
});

describe("factionOfRace", () => {
  it("maps the four vanilla Alliance races", () => {
    for (const raceId of [1, 3, 4, 7]) expect(factionOfRace(raceId)).toBe("alliance");
  });

  it("maps the four vanilla Horde races", () => {
    for (const raceId of [2, 5, 6, 8]) expect(factionOfRace(raceId)).toBe("horde");
  });

  it("returns null for an unknown race id rather than guessing", () => {
    expect(factionOfRace(10)).toBeNull(); // e.g. a custom Turtle/Octo race, not yet observed
  });

  it("lets an override teach a custom race id", () => {
    const overrides: ReadonlyMap<number, Faction> = new Map([[10, "alliance"]]); // High Elf, say
    expect(factionOfRace(10, overrides)).toBe("alliance");
  });
});

describe("splitByFaction", () => {
  it("partitions a mixed roster into alliance / horde / unknown", () => {
    const roster = [player("Human", 1), player("Orc", 2), player("Custom", 99), player("Troll", 8)];
    const split = splitByFaction(roster);
    expect(split.alliance.map((p) => p.name)).toEqual(["Human"]);
    expect(split.horde.map((p) => p.name)).toEqual(["Orc", "Troll"]);
    expect(split.unknown.map((p) => p.name)).toEqual(["Custom"]);
  });
});

describe("majorityFaction", () => {
  it("returns the strict majority side", () => {
    const roster = [player("a", 1), player("b", 4), player("c", 7), player("d", 2)]; // 3 A, 1 H
    expect(majorityFaction(roster)).toBe("alliance");
  });

  it("returns null on an even split (two raids sharing the lair)", () => {
    const roster = [player("a", 1), player("b", 4), player("c", 2), player("d", 8)]; // 2 A, 2 H
    expect(majorityFaction(roster)).toBeNull();
  });

  it("ignores unknown races when deciding the majority", () => {
    const roster = [player("a", 1), player("b", 2), player("c", 99)]; // 1 A, 1 H, 1 unknown → tie
    expect(majorityFaction(roster)).toBeNull();
  });

  it("returns null for an empty or all-unknown group", () => {
    expect(majorityFaction([])).toBeNull();
    expect(majorityFaction([player("x", 99), player("y", 100)])).toBeNull();
  });
});
