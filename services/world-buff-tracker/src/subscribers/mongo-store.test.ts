import { describe, expect, it, vi } from "vitest";
import { MongoSubscriberStore, type SubscriberDb, type SubscriberDoc } from "./mongo-store.js";

/** A fake SubscriberDb backed by a Map, honouring upsert/delete/update semantics. */
function fakeDb(): SubscriberDb & { docs: Map<string, SubscriberDoc> } {
  const docs = new Map<string, SubscriberDoc>();
  return {
    docs,
    upsertNew: vi.fn(async (doc: SubscriberDoc) => {
      if (docs.has(doc._id)) return { upsertedCount: 0 };
      docs.set(doc._id, doc);
      return { upsertedCount: 1 };
    }),
    deleteByKey: vi.fn(async (key: string) => ({ deletedCount: docs.delete(key) ? 1 : 0 })),
    countByKey: vi.fn(async (key: string) => (docs.has(key) ? 1 : 0)),
    getByKey: vi.fn(async (key: string) => docs.get(key) ?? null),
    setFields: vi.fn(async (key: string, fields) => {
      const doc = docs.get(key);
      if (!doc) return { matchedCount: 0 };
      docs.set(key, { ...doc, ...fields });
      return { matchedCount: 1 };
    }),
    list: vi.fn(async () => [...docs.values()]),
    close: vi.fn(async () => {}),
  };
}

describe("MongoSubscriberStore", () => {
  it("maps a first upsert to true and a repeat to false, with defaults", async () => {
    const db = fakeDb();
    const store = new MongoSubscriberStore(db);
    expect(await store.add("Raider")).toBe(true);
    expect(await store.add("raider")).toBe(false);
    expect(db.docs.get("raider")).toMatchObject({
      name: "Raider",
      factions: ["alliance", "horde"],
      factionSource: "default",
    });
  });

  it("reads a doc with MISSING or EMPTY factions as both (an empty array must not silently drop it)", async () => {
    const db = fakeDb();
    db.docs.set("old", { _id: "old", name: "Old", subscribedAt: new Date() }); // no factions field
    db.docs.set("empty", { _id: "empty", name: "Empty", factions: [], subscribedAt: new Date() });
    const store = new MongoSubscriberStore(db);
    expect((await store.get("old"))?.factions).toEqual(["alliance", "horde"]);
    expect((await store.get("empty"))?.factions).toEqual(["alliance", "horde"]);
  });

  it("reads a doc with no factionSource as 'default' (resolvable), and keeps a stored one", async () => {
    const db = fakeDb();
    db.docs.set("old", { _id: "old", name: "Old", factions: ["horde"], subscribedAt: new Date() });
    db.docs.set("set", { _id: "set", name: "Set", factions: ["horde"], factionSource: "manual", subscribedAt: new Date() });
    const store = new MongoSubscriberStore(db);
    expect((await store.get("old"))?.factionSource).toBe("default");
    expect((await store.get("set"))?.factionSource).toBe("manual");
  });

  it("updates the factionSource alongside the side", async () => {
    const db = fakeDb();
    const store = new MongoSubscriberStore(db);
    await store.add("Raider");
    await store.update("raider", { factions: ["horde"], factionSource: "manual" });
    expect(db.docs.get("raider")).toMatchObject({ factions: ["horde"], factionSource: "manual" });
  });

  it("maps a delete to whether a doc was removed", async () => {
    const db = fakeDb();
    const store = new MongoSubscriberStore(db);
    await store.add("Raider");
    expect(await store.remove("RAIDER")).toBe(true);
    expect(await store.remove("RAIDER")).toBe(false);
  });

  it("gets a subscriber without the internal _id", async () => {
    const db = fakeDb();
    const store = new MongoSubscriberStore(db);
    await store.add("Raider");
    const sub = await store.get("raider");
    expect(sub).toMatchObject({ name: "Raider", factions: ["alliance", "horde"] });
    expect(sub).not.toHaveProperty("_id");
  });

  it("updates only the provided fields", async () => {
    const db = fakeDb();
    const store = new MongoSubscriberStore(db);
    await store.add("Raider");
    expect(await store.update("raider", { factions: ["horde"] })).toBe(true);
    expect(db.setFields).toHaveBeenCalledWith("raider", { factions: ["horde"] });
    expect(db.docs.get("raider")?.factions).toEqual(["horde"]);
  });

  it("returns false updating a name that isn't subscribed", async () => {
    const db = fakeDb();
    const store = new MongoSubscriberStore(db);
    expect(await store.update("Ghost", { factions: ["alliance"] })).toBe(false);
  });

  it("lists subscribers without the internal _id", async () => {
    const db = fakeDb();
    const store = new MongoSubscriberStore(db);
    await store.add("Raider");
    const all = await store.all();
    expect(all[0]?.name).toBe("Raider");
    expect(all[0]).not.toHaveProperty("_id");
  });

  it("closes the underlying connection", async () => {
    const db = fakeDb();
    await new MongoSubscriberStore(db).close();
    expect(db.close).toHaveBeenCalled();
  });
});
