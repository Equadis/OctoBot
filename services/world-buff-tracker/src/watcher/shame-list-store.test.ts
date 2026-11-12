import { describe, expect, it, vi } from "vitest";
import {
  InMemoryShameListStore,
  MongoShameListStore,
  playersOf,
  type ShamedPlayer,
  type ShameListDb,
} from "./shame-list-store.js";

const ganker: ShamedPlayer = { name: "Ganker", guid: null, details: { raceId: 2, classId: 9 } };

describe("InMemoryShameListStore", () => {
  it("starts empty and returns what was saved", async () => {
    const store = new InMemoryShameListStore();
    expect(await store.load()).toEqual([]);
    await store.save([ganker]);
    expect(await store.load()).toEqual([ganker]);
  });
});

describe("playersOf", () => {
  it("reads the players a document holds", () => {
    expect(playersOf({ players: [ganker] })).toEqual([ganker]);
  });

  it("reads the names-only list the first release wrote, with no details yet", () => {
    expect(playersOf({ names: ["Ganker", "Warlockz"] })).toEqual([
      { name: "Ganker", guid: null, details: null },
      { name: "Warlockz", guid: null, details: null },
    ]);
  });

  it("reads a player stored before GUIDs were kept", () => {
    expect(playersOf({ players: [{ name: "Ganker", details: { raceId: 2, classId: 9 } }] })).toEqual([ganker]);
  });

  it("is empty with no document", () => {
    expect(playersOf(null)).toEqual([]);
  });
});

describe("MongoShameListStore", () => {
  const fakeDb = () => {
    let held: readonly ShamedPlayer[] = [];
    const db = {
      get: vi.fn(async () => held),
      set: vi.fn(async (players: readonly ShamedPlayer[]) => {
        held = players;
      }),
      close: vi.fn(async () => undefined),
    } satisfies ShameListDb;
    return db;
  };

  it("round-trips the players through the collection", async () => {
    const db = fakeDb();
    const store = new MongoShameListStore(db);
    expect(await store.load()).toEqual([]);
    await store.save([ganker]);
    expect(db.set).toHaveBeenCalledWith([ganker]);
    expect(await store.load()).toEqual([ganker]);
  });

  it("releases the client on close", async () => {
    const db = fakeDb();
    await new MongoShameListStore(db).close();
    expect(db.close).toHaveBeenCalledTimes(1);
  });
});
