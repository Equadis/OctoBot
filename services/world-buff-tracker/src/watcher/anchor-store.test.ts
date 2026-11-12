import { describe, expect, it, vi } from "vitest";
import { anchorFrom } from "./listener-anchor.js";
import { InMemoryAnchorStore, MongoAnchorStore, type AnchorDb, type AnchorDoc } from "./anchor-store.js";

const anchor = anchorFrom({ x: 0, y: 0, z: 0 }, [{ x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }]);

describe("InMemoryAnchorStore", () => {
  it("round-trips a per-listener anchor", async () => {
    const store = new InMemoryAnchorStore();
    expect(await store.loadAnchor("Onyxiabuffsw")).toBeNull();
    await store.saveAnchor("Onyxiabuffsw", anchor);
    expect(await store.loadAnchor("Onyxiabuffsw")).toEqual(anchor);
    expect(await store.loadAnchor("Onyxiabuffog")).toBeNull(); // keyed per listener
  });

  it("records the login-enabled marker (null until set)", async () => {
    const store = new InMemoryAnchorStore();
    expect(await store.wasEnabled()).toBeNull();
    await store.setEnabled(false);
    expect(await store.wasEnabled()).toBe(false);
    await store.setEnabled(true);
    expect(await store.wasEnabled()).toBe(true);
  });
});

describe("MongoAnchorStore", () => {
  function fakeDb(): AnchorDb & { docs: Map<string, AnchorDoc> } {
    const docs = new Map<string, AnchorDoc>();
    return {
      docs,
      get: vi.fn(async (id: string) => docs.get(id) ?? null),
      put: vi.fn(async (id: string, fields) => {
        docs.set(id, { ...(docs.get(id) ?? { _id: id }), ...fields, _id: id });
      }),
      close: vi.fn(async () => {}),
    };
  }

  it("stores and reads back an anchor, dropping a doc missing its fields", async () => {
    const db = fakeDb();
    const store = new MongoAnchorStore(db);
    await store.saveAnchor("Onyxiabuffsw", anchor);
    expect(await store.loadAnchor("Onyxiabuffsw")).toEqual(anchor);
    db.docs.set("half", { _id: "half", parked: { x: 0, y: 0, z: 0 } }); // no doodads
    expect(await store.loadAnchor("half")).toBeNull();
  });

  it("keeps the login flag separate from any listener's anchor", async () => {
    const db = fakeDb();
    const store = new MongoAnchorStore(db);
    await store.setEnabled(true);
    await store.saveAnchor("Onyxiabuffsw", anchor);
    expect(await store.wasEnabled()).toBe(true);
    expect(await store.loadAnchor("Onyxiabuffsw")).toEqual(anchor); // not clobbered by the flag
  });
});
