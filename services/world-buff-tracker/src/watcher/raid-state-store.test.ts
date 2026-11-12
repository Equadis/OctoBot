import { describe, expect, it, vi } from "vitest";
import {
  InMemoryRaidStateStore,
  MongoRaidStateStore,
  type RaidStateDb,
} from "./raid-state-store.js";
import type { ClearTrackerState } from "./clear-tracker.js";

const state = (number: number): ClearTrackerState => ({
  formedAt: 1000,
  number,
  roster: ["r0", "r1", "r2"],
  peak: 30,
  belowSince: null,
});

describe("InMemoryRaidStateStore", () => {
  it("round-trips a lane's raid and clears it on null", async () => {
    const store = new InMemoryRaidStateStore();
    expect(await store.load("lair")).toBeNull();
    await store.save("lair", state(7));
    expect((await store.load("lair"))?.number).toBe(7);
    await store.save("lair", null);
    expect(await store.load("lair")).toBeNull();
  });

  it("keeps lanes independent", async () => {
    const store = new InMemoryRaidStateStore();
    await store.save("alliance", state(1));
    expect(await store.load("horde")).toBeNull();
    expect((await store.load("alliance"))?.number).toBe(1);
  });
});

describe("MongoRaidStateStore", () => {
  function fakeDb(): RaidStateDb & { docs: Map<string, ClearTrackerState> } {
    const docs = new Map<string, ClearTrackerState>();
    return {
      docs,
      get: vi.fn(async (lane: string) => docs.get(lane) ?? null),
      set: vi.fn(async (lane: string, s: ClearTrackerState) => {
        docs.set(lane, s);
      }),
      remove: vi.fn(async (lane: string) => {
        docs.delete(lane);
      }),
      close: vi.fn(async () => {}),
    };
  }

  it("saves a raid and reads it back, and remove clears it", async () => {
    const db = fakeDb();
    const store = new MongoRaidStateStore(db);
    await store.save("lair", state(834));
    expect((await store.load("lair"))?.number).toBe(834);
    await store.save("lair", null);
    expect(db.remove).toHaveBeenCalledWith("lair");
    expect(await store.load("lair")).toBeNull();
  });

  it("closes the underlying connection", async () => {
    const db = fakeDb();
    await new MongoRaidStateStore(db).close();
    expect(db.close).toHaveBeenCalled();
  });
});
