import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../logger.js";
import type { WhoPlayer, WhoQuery, WhoResult } from "../protocol/who.js";
import { ShameList } from "./shame-list.js";
import { InMemoryShameListStore, type ShamedPlayer } from "./shame-list-store.js";
import { ShameProfiler, type WhoRunner } from "./shame-profiler.js";

const whoPlayer = (name: string, raceId: number, classId: number): WhoPlayer => ({
  name,
  guild: "",
  level: 60,
  classId,
  raceId,
  areaId: 1637,
});

async function setup(
  players: readonly ShamedPlayer[],
  online: readonly WhoPlayer[],
  guids: ReadonlyMap<string, bigint> = new Map(),
) {
  const list = new ShameList(new InMemoryShameListStore(players));
  await list.load();
  const who = vi.fn(
    async (query: WhoQuery): Promise<WhoResult> => {
      const found = online.filter((p) => p.name.toLowerCase().includes((query.playerName ?? "").toLowerCase()));
      return { players: found, onlineCount: found.length };
    },
  );
  const onDescribed = vi.fn();
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger;
  let runner: WhoRunner | null = who;
  const guidOf = vi.fn(async (name: string): Promise<bigint | null> => guids.get(name) ?? null);
  const profiler = new ShameProfiler({ list, who: () => runner, guidOf, onDescribed, logger });
  return { list, who, guidOf, onDescribed, logger, profiler, dropWho: () => (runner = null) };
}

describe("ShameProfiler", () => {
  it("records the race and class a /who by name reports, and asks for a repaint", async () => {
    const { list, who, onDescribed, profiler } = await setup(
      [{ name: "Ganker", guid: null, details: null }],
      [whoPlayer("Ganker", 2, 9)],
    );
    expect(await profiler.profile("Ganker")).toBe(true);
    expect(who).toHaveBeenCalledWith({ minLevel: 0, maxLevel: 100, playerName: "Ganker" });
    expect(list.players).toEqual([{ name: "Ganker", guid: null, details: { raceId: 2, classId: 9 } }]);
    expect(onDescribed).toHaveBeenCalledTimes(1);
  });

  it("takes only the exact name, not another that contains it", async () => {
    const { list, profiler } = await setup([{ name: "Gank", guid: null, details: null }], [whoPlayer("Gankerella", 1, 1)]);
    expect(await profiler.profile("Gank")).toBe(false);
    expect(list.undescribed).toEqual(["Gank"]);
  });

  it("leaves a player who is offline to the next sweep, which finds them once online", async () => {
    const online: WhoPlayer[] = [];
    const { list, profiler, onDescribed } = await setup([{ name: "Ganker", guid: null, details: null }], online);
    expect(await profiler.profile("Ganker")).toBe(false);
    expect(list.undescribed).toEqual(["Ganker"]);

    online.push(whoPlayer("Ganker", 5, 4));
    await profiler.sweep();
    expect(list.players).toEqual([{ name: "Ganker", guid: null, details: { raceId: 5, classId: 4 } }]);
    expect(onDescribed).toHaveBeenCalledTimes(1);
  });

  it("sweeps only the players still undescribed", async () => {
    const { who, profiler } = await setup(
      [
        { name: "Ganker", guid: null, details: { raceId: 2, classId: 9 } },
        { name: "Warlockz", guid: null, details: null },
      ],
      [whoPlayer("Warlockz", 2, 9)],
    );
    await profiler.sweep();
    expect(who).toHaveBeenCalledTimes(1);
    expect(who).toHaveBeenCalledWith(expect.objectContaining({ playerName: "Warlockz" }));
  });

  it("waits while no /who is available", async () => {
    const { list, profiler, dropWho } = await setup([{ name: "Ganker", guid: null, details: null }], [whoPlayer("Ganker", 2, 9)]);
    dropWho();
    expect(await profiler.profile("Ganker")).toBe(false);
    expect(list.undescribed).toEqual(["Ganker"]);
  });

  it("survives a /who that fails", async () => {
    const { who, list, profiler } = await setup([{ name: "Ganker", guid: null, details: null }], []);
    who.mockRejectedValueOnce(new Error("who timed out"));
    expect(await profiler.profile("Ganker")).toBe(false);
    expect(list.undescribed).toEqual(["Ganker"]);
  });

  it("flags a race it cannot name, and still records it", async () => {
    const { list, logger, profiler } = await setup([{ name: "Elfie", guid: null, details: null }], [whoPlayer("Elfie", 10, 8)]);
    expect(await profiler.profile("Elfie")).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith("shame list: Elfie is race #10, which has no name or faction mapped yet");
    expect(list.players[0]?.details).toEqual({ raceId: 10, classId: 8 });
  });

  it("finds the GUID of a player listed by name alone, so they can be spotted nearby", async () => {
    const { list, profiler } = await setup([{ name: "Zezerver", guid: null, details: null }], [], new Map([["Zezerver", 0x2f1an]]));
    expect(list.unidentified).toEqual(["Zezerver"]);
    expect(await profiler.identify("Zezerver")).toBe(true);
    expect(list.hasGuid(0x2f1an)).toBe(true);
    expect(list.unidentified).toEqual([]);
  });

  it("leaves a GUID nobody could find to the next sweep", async () => {
    const { list, profiler } = await setup([{ name: "Zezerver", guid: null, details: null }], []);
    expect(await profiler.identify("Zezerver")).toBe(false);
    expect(list.unidentified).toEqual(["Zezerver"]);
  });

  it("sweeps for missing GUIDs as well as missing race and class", async () => {
    const { list, guidOf, who, profiler } = await setup(
      [
        { name: "Zezerver", guid: null, details: { raceId: 8, classId: 9 } },
        { name: "Ganker", guid: "1365", details: null },
      ],
      [whoPlayer("Ganker", 2, 1)],
      new Map([["Zezerver", 0x2f1an]]),
    );
    await profiler.sweep();
    expect(guidOf).toHaveBeenCalledTimes(1);
    expect(guidOf).toHaveBeenCalledWith("Zezerver");
    expect(who).toHaveBeenCalledTimes(1);
    expect(list.unidentified).toEqual([]);
    expect(list.undescribed).toEqual([]);
  });

  it("does not repaint when nothing changed", async () => {
    const { onDescribed, profiler } = await setup(
      [{ name: "Ganker", guid: null, details: { raceId: 2, classId: 9 } }],
      [whoPlayer("Ganker", 2, 9)],
    );
    expect(await profiler.profile("Ganker")).toBe(true);
    expect(onDescribed).not.toHaveBeenCalled();
  });
});
