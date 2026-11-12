import { describe, expect, it } from "vitest";
import { InMemoryIntroStore, MongoIntroStore, type IntroDb } from "./intro-store.js";

describe("InMemoryIntroStore", () => {
  it("returns true the first time and false thereafter", async () => {
    const store = new InMemoryIntroStore();
    expect(await store.introduceOnce("Raider")).toBe(true);
    expect(await store.introduceOnce("Raider")).toBe(false);
  });

  it("treats names case-insensitively (one person, one intro)", async () => {
    const store = new InMemoryIntroStore();
    expect(await store.introduceOnce("Raider")).toBe(true);
    expect(await store.introduceOnce("RAIDER")).toBe(false);
    expect(await store.introduceOnce("  raider ")).toBe(false);
  });

  it("intros distinct players independently", async () => {
    const store = new InMemoryIntroStore();
    expect(await store.introduceOnce("A")).toBe(true);
    expect(await store.introduceOnce("B")).toBe(true);
    expect(await store.introduceOnce("A")).toBe(false);
  });
});

describe("MongoIntroStore", () => {
  /** A fake IntroDb mirroring the upsert-if-absent contract. */
  function fakeDb() {
    const rows = new Set<string>();
    const marks: string[] = [];
    const db: IntroDb = {
      markIfNew: async (key) => {
        marks.push(key);
        if (rows.has(key)) return false;
        rows.add(key);
        return true;
      },
      close: async () => {},
    };
    return { db, marks };
  }

  it("keys by the canonical (trimmed, lowercased) name and maps a new insert to true", async () => {
    const { db, marks } = fakeDb();
    const store = new MongoIntroStore(db);
    expect(await store.introduceOnce("Raider")).toBe(true);
    expect(await store.introduceOnce("RAIDER")).toBe(false);
    expect(marks).toEqual(["raider", "raider"]); // both queried the same key
  });
});
