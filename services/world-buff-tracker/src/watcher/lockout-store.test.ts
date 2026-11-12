import { describe, expect, it, vi } from "vitest";
import { InMemoryLockoutStore, MongoLockoutStore, type LockoutDb } from "./lockout-store.js";

describe("InMemoryLockoutStore", () => {
  it("round-trips a lane's ledger and isolates lanes", async () => {
    const store = new InMemoryLockoutStore();
    expect(await store.load("lair")).toBeNull();
    await store.save("lair", { Alice: 100, Bob: 200 });
    await store.save("horde", { Carol: 300 });
    expect(await store.load("lair")).toEqual({ Alice: 100, Bob: 200 });
    expect(await store.load("horde")).toEqual({ Carol: 300 });
  });

  it("overwrites a lane's ledger on re-save (the pruned set replaces the old one)", async () => {
    const store = new InMemoryLockoutStore();
    await store.save("lair", { Alice: 100, Bob: 200 });
    await store.save("lair", { Bob: 200 }); // Alice pruned out
    expect(await store.load("lair")).toEqual({ Bob: 200 });
  });
});

describe("MongoLockoutStore", () => {
  it("delegates load/save/close to its db port", async () => {
    const db: LockoutDb = {
      get: vi.fn().mockResolvedValue({ Alice: 100 }),
      set: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const store = new MongoLockoutStore(db);

    expect(await store.load("lair")).toEqual({ Alice: 100 });
    await store.save("lair", { Bob: 200 });
    await store.close();

    expect(db.get).toHaveBeenCalledWith("lair");
    expect(db.set).toHaveBeenCalledWith("lair", { Bob: 200 });
    expect(db.close).toHaveBeenCalledOnce();
  });
});
