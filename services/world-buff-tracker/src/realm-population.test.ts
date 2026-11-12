import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_POPULATION_STALE_MS,
  RealmPopulation,
  observePopulation,
} from "./realm-population.js";
import type { WhoFn } from "./watcher/roster.js";
import type { WhoPlayer, WhoResult } from "./protocol/who.js";

const NOW = 1_700_000_000_000;

function player(name: string): WhoPlayer {
  return { name, guild: "", level: 60, classId: 1, raceId: 1, areaId: 2159 };
}

describe("RealmPopulation", () => {
  it("has no count before the first reading", () => {
    expect(new RealmPopulation().current(NOW)).toBeNull();
  });

  it("returns the latest reading while it is fresh", () => {
    const population = new RealmPopulation();
    population.record(661, NOW);
    expect(population.current(NOW)).toBe(661);
    expect(population.current(NOW + DEFAULT_POPULATION_STALE_MS)).toBe(661);
  });

  it("expires a reading once it is older than the stale window", () => {
    const population = new RealmPopulation(60_000);
    population.record(661, NOW);
    expect(population.current(NOW + 60_000)).toBe(661);
    expect(population.current(NOW + 60_001)).toBeNull();
  });

  it("takes a newer reading over an older one", () => {
    const population = new RealmPopulation();
    population.record(661, NOW);
    population.record(704, NOW + 20_000);
    expect(population.current(NOW + 20_000)).toBe(704);
  });

  it("ignores an out-of-order reading, so a late reply can't overwrite a newer one", () => {
    const population = new RealmPopulation();
    population.record(704, NOW + 20_000);
    population.record(661, NOW); // an earlier /who resolving late
    expect(population.current(NOW + 20_000)).toBe(704);
  });

  it("ignores a negative or non-integer count", () => {
    const population = new RealmPopulation();
    population.record(-1, NOW);
    population.record(12.5, NOW);
    expect(population.current(NOW)).toBeNull();
  });

  it("accepts a genuine zero (an empty realm is a fact, not a missing reading)", () => {
    const population = new RealmPopulation();
    population.record(0, NOW);
    expect(population.current(NOW)).toBe(0);
  });
});

describe("observePopulation", () => {
  it("records the online count off each response and passes the result through untouched", async () => {
    const result: WhoResult = { players: [player("Ariel")], onlineCount: 661 };
    const who = vi.fn<WhoFn>().mockResolvedValue(result);
    const population = new RealmPopulation();

    const observed = observePopulation(who, population, () => NOW);
    await expect(observed({ zoneIds: [2159] })).resolves.toBe(result);

    expect(who).toHaveBeenCalledWith({ zoneIds: [2159] });
    expect(population.current(NOW)).toBe(661);
  });

  it("records nothing and rethrows when the query fails", async () => {
    const who = vi.fn<WhoFn>().mockRejectedValue(new Error("who timed out"));
    const population = new RealmPopulation();

    const observed = observePopulation(who, population, () => NOW);
    await expect(observed({})).rejects.toThrow("who timed out");
    expect(population.current(NOW)).toBeNull();
  });

  it("reads the realm count even from a filtered query that matched nobody", async () => {
    // The measured case: a zone /who over an empty lair still carries the realm-wide count.
    const who = vi.fn<WhoFn>().mockResolvedValue({ players: [], onlineCount: 661 });
    const population = new RealmPopulation();

    await observePopulation(who, population, () => NOW)({ zoneIds: [2159] });
    expect(population.current(NOW)).toBe(661);
  });
});
