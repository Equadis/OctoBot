import { describe, expect, it } from "vitest";
import type { Faction } from "../watcher/buff-store.js";
import { groupByRelevantCities } from "./faction-routing.js";

const sub = (name: string, factions: Faction[]) => ({ name, factions });

describe("groupByRelevantCities", () => {
  it("routes each subscriber to only the side(s) they want among the open cities", () => {
    const subs = [
      sub("Aly", ["alliance"]),
      sub("Hordie", ["horde"]),
      sub("Both", ["alliance", "horde"]),
    ];
    const groups = groupByRelevantCities(subs, ["alliance", "horde"]);
    const byKey = new Map(groups.map((g) => [g.cities.join(","), g.members.map((m) => m.name)]));
    expect(byKey.get("alliance")).toEqual(["Aly"]);
    expect(byKey.get("horde")).toEqual(["Hordie"]);
    expect(byKey.get("alliance,horde")).toEqual(["Both"]);
  });

  it("drops a subscriber whose side isn't among the open cities", () => {
    const groups = groupByRelevantCities([sub("Hordie", ["horde"])], ["alliance"]);
    expect(groups).toEqual([]);
  });

  it("puts a both-subscriber in the single open city when only one is open", () => {
    const groups = groupByRelevantCities([sub("Both", ["alliance", "horde"])], ["alliance"]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.cities).toEqual(["alliance"]);
    expect(groups[0]!.members.map((m) => m.name)).toEqual(["Both"]);
  });
});
