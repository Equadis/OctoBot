import { describe, expect, it } from "vitest";
import { InMemoryUserLedger, MongoUserLedger, type UserDb } from "./user-ledger.js";

describe("InMemoryUserLedger", () => {
  it("counts distinct users and never shrinks", async () => {
    const ledger = new InMemoryUserLedger();
    expect(await ledger.count()).toBe(0);
    await ledger.record("Alice");
    await ledger.record("Bob");
    expect(await ledger.count()).toBe(2);
  });

  it("counts a person once regardless of name casing", async () => {
    const ledger = new InMemoryUserLedger();
    await ledger.record("Raider");
    await ledger.record("RAIDER");
    await ledger.record("  raider ");
    expect(await ledger.count()).toBe(1);
  });

  it("does not forget a recorded user (unsubscribe never reaches here)", async () => {
    const ledger = new InMemoryUserLedger();
    await ledger.record("Gone");
    // there is no remove — the total is a lifetime figure
    expect(await ledger.count()).toBe(1);
  });
});

describe("MongoUserLedger", () => {
  /** A fake UserDb mirroring the insert-if-absent contract. */
  function fakeDb() {
    const rows = new Set<string>();
    const keys: string[] = [];
    const db: UserDb = {
      upsert: async (key) => {
        keys.push(key);
        rows.add(key);
      },
      count: async () => rows.size,
      close: async () => {},
    };
    return { db, keys };
  }

  it("keys by the canonical name and counts distinct upserts", async () => {
    const { db, keys } = fakeDb();
    const ledger = new MongoUserLedger(db);
    await ledger.record("Raider");
    await ledger.record("RAIDER");
    expect(keys).toEqual(["raider", "raider"]); // same key both times
    expect(await ledger.count()).toBe(1);
  });
});
