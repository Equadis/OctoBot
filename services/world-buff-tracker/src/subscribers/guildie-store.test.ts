import { describe, expect, it } from "vitest";
import { InMemoryGuildieStore, MongoGuildieStore, type GuildieDb } from "./guildie-store.js";

describe("InMemoryGuildieStore", () => {
  it("adds on join, removes on leave, and counts the current members", async () => {
    const store = new InMemoryGuildieStore();
    expect(await store.count()).toBe(0);
    expect(await store.add("Alice")).toBe(true);
    expect(await store.add("Bob")).toBe(true);
    expect(await store.add("alice")).toBe(false); // case-insensitive, already in
    expect(await store.count()).toBe(2);
    expect(await store.remove("ALICE")).toBe(true); // she left
    expect(await store.remove("ALICE")).toBe(false); // already gone
    expect(await store.count()).toBe(1);
  });

  it("removing someone who never joined via us is a harmless no-op", async () => {
    const store = new InMemoryGuildieStore();
    expect(await store.remove("Stranger")).toBe(false);
    expect(await store.count()).toBe(0);
  });
});

describe("MongoGuildieStore", () => {
  function fakeDb() {
    const rows = new Set<string>();
    const db: GuildieDb = {
      addKey: async (key) => (rows.has(key) ? false : (rows.add(key), true)),
      removeKey: async (key) => rows.delete(key),
      count: async () => rows.size,
      close: async () => {},
    };
    return db;
  }

  it("keys by the canonical name for add and remove", async () => {
    const store = new MongoGuildieStore(fakeDb());
    expect(await store.add("Raider")).toBe(true);
    expect(await store.add("RAIDER")).toBe(false);
    expect(await store.count()).toBe(1);
    expect(await store.remove(" raider ")).toBe(true);
    expect(await store.count()).toBe(0);
  });
});
