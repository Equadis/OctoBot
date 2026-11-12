import { describe, expect, it, vi } from "vitest";
import { ShameList } from "./shame-list.js";
import { InMemoryShameListStore, type ShamedPlayer, type ShameListStore } from "./shame-list-store.js";

const GANKER_GUID = 0x555n;
const WARLOCKZ_GUID = 0x1234n;
const ganker: ShamedPlayer = { name: "Ganker", guid: GANKER_GUID.toString(), details: null };

describe("ShameList", () => {
  it("knows the players saved by an earlier run, by name and by GUID", async () => {
    const list = new ShameList(new InMemoryShameListStore([ganker]));
    await list.load();
    expect(list.has("Ganker")).toBe(true);
    expect(list.hasGuid(GANKER_GUID)).toBe(true);
    expect(list.has("Raider")).toBe(false);
    expect(list.hasGuid(0x666n)).toBe(false);
  });

  it("finds a listed player by GUID", async () => {
    const list = new ShameList(new InMemoryShameListStore([ganker]));
    await list.load();
    expect(list.byGuid(GANKER_GUID)?.name).toBe("Ganker");
    expect(list.byGuid(0x666n)).toBeUndefined();
  });

  it("matches a player's name whatever the case", async () => {
    const list = new ShameList(new InMemoryShameListStore([ganker]));
    await list.load();
    expect(list.has("ganker")).toBe(true);
    expect(list.has(" GANKER ")).toBe(true);
  });

  it("adds a player once, in the order they first killed, and saves the list", async () => {
    const store = new InMemoryShameListStore();
    const list = new ShameList(store);
    await list.load();
    expect(await list.add("Ganker", GANKER_GUID)).toBe(true);
    expect(await list.add("Warlockz", WARLOCKZ_GUID)).toBe(true);
    expect(await list.add("GANKER", GANKER_GUID)).toBe(false);
    expect(list.hasGuid(WARLOCKZ_GUID)).toBe(true);
    expect(await store.load()).toEqual([
      { name: "Ganker", guid: "1365", details: null },
      { name: "Warlockz", guid: "4660", details: null },
    ]);
  });

  it("gives a player listed without a GUID the one it learns", async () => {
    const store = new InMemoryShameListStore([{ name: "Ganker", guid: null, details: null }]);
    const list = new ShameList(store);
    await list.load();
    expect(list.hasGuid(GANKER_GUID)).toBe(false);
    expect(await list.add("Ganker", GANKER_GUID)).toBe(false); // not new — only better known
    expect(list.hasGuid(GANKER_GUID)).toBe(true);
    expect(await store.load()).toEqual([{ name: "Ganker", guid: "1365", details: null }]);
  });

  it("records who a listed player is, and says so only when it changed", async () => {
    const store = new InMemoryShameListStore([ganker]);
    const list = new ShameList(store);
    await list.load();
    expect(list.undescribed).toEqual(["Ganker"]);

    expect(await list.describe("ganker", { raceId: 2, classId: 9 })).toBe(true);
    expect(await list.describe("Ganker", { raceId: 2, classId: 9 })).toBe(false);
    expect(list.undescribed).toEqual([]);
    expect(await store.load()).toEqual([{ ...ganker, details: { raceId: 2, classId: 9 } }]);
  });

  it("describes nobody who is not on the list", async () => {
    const list = new ShameList(new InMemoryShameListStore());
    expect(await list.describe("Raider", { raceId: 1, classId: 1 })).toBe(false);
    expect(list.players).toEqual([]);
  });

  it("lists a player at once, before the save lands", async () => {
    const list = new ShameList(new InMemoryShameListStore());
    const adding = list.add("Ganker", GANKER_GUID);
    expect(list.has("Ganker")).toBe(true);
    expect(list.hasGuid(GANKER_GUID)).toBe(true);
    await adding;
  });

  it("saves in order, so a later list is never overwritten by an earlier one", async () => {
    const saved: (readonly ShamedPlayer[])[] = [];
    let release: () => void = () => {};
    const firstSaveHeld = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store = {
      load: vi.fn(async (): Promise<readonly ShamedPlayer[]> => []),
      save: vi.fn(async (players: readonly ShamedPlayer[]) => {
        if (saved.length === 0) await firstSaveHeld;
        saved.push(players);
      }),
      close: vi.fn(async () => undefined),
    } satisfies ShameListStore;
    const list = new ShameList(store);

    const first = list.add("Ganker", GANKER_GUID);
    const second = list.add("Warlockz", WARLOCKZ_GUID);
    release();
    await Promise.all([first, second]);
    expect(saved.map((players) => players.map((player) => player.name))).toEqual([
      ["Ganker"],
      ["Ganker", "Warlockz"],
    ]);
  });

  it("keeps the player listed when the save fails, and reports the failure", async () => {
    const store = {
      load: vi.fn(async (): Promise<readonly ShamedPlayer[]> => []),
      save: vi.fn(async () => {
        throw new Error("mongo down");
      }),
      close: vi.fn(async () => undefined),
    } satisfies ShameListStore;
    const list = new ShameList(store);
    await expect(list.add("Ganker", GANKER_GUID)).rejects.toThrow("mongo down");
    expect(list.has("Ganker")).toBe(true);
  });
});
