import { describe, expect, it, vi } from "vitest";
import { InMemoryRaidCounterStore, MongoRaidCounterStore, type RaidCounterDb } from "./raid-counter-store.js";

describe("InMemoryRaidCounterStore", () => {
  it("starts at 0 and round-trips saved values", async () => {
    const store = new InMemoryRaidCounterStore();
    expect(await store.load()).toBe(0);
    await store.save(834);
    expect(await store.load()).toBe(834);
  });

  it("accepts an initial value (for tests)", async () => {
    expect(await new InMemoryRaidCounterStore(41).load()).toBe(41);
  });
});

describe("MongoRaidCounterStore", () => {
  function fakeDb(): RaidCounterDb & { value: number | null } {
    const state = { value: null as number | null };
    return {
      get value() {
        return state.value;
      },
      get: vi.fn(async () => state.value),
      set: vi.fn(async (v: number) => {
        state.value = v;
      }),
      close: vi.fn(async () => {}),
    };
  }

  it("loads 0 when nothing is stored, then the saved value", async () => {
    const db = fakeDb();
    const store = new MongoRaidCounterStore(db);
    expect(await store.load()).toBe(0);
    await store.save(29);
    expect(db.value).toBe(29);
    expect(await store.load()).toBe(29);
  });

  it("closes the underlying connection", async () => {
    const db = fakeDb();
    await new MongoRaidCounterStore(db).close();
    expect(db.close).toHaveBeenCalled();
  });
});
