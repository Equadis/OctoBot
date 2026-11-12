import { describe, expect, it, vi } from "vitest";
import {
  InMemoryDarkmoonWidgetStore,
  MongoDarkmoonWidgetStore,
  type DarkmoonWidgetDb,
} from "./widget-store.js";

describe("InMemoryDarkmoonWidgetStore", () => {
  it("starts empty and returns what was saved", async () => {
    const store = new InMemoryDarkmoonWidgetStore();
    expect(await store.load()).toBeNull();
    await store.save({ messageId: "msg-1" });
    expect(await store.load()).toEqual({ messageId: "msg-1" });
  });

  it("can be seeded, standing in for a previous deploy", async () => {
    expect(await new InMemoryDarkmoonWidgetStore({ messageId: "old" }).load()).toEqual({ messageId: "old" });
  });
});

describe("MongoDarkmoonWidgetStore", () => {
  const fakeDb = () => {
    let held: { messageId: string | null } | null = null;
    const db: DarkmoonWidgetDb = {
      get: vi.fn(async () => held),
      set: vi.fn(async (state: { messageId: string | null }) => {
        held = state;
      }),
      close: vi.fn(async () => undefined),
    };
    return db;
  };

  it("round-trips the message id through the collection", async () => {
    const db = fakeDb();
    const store = new MongoDarkmoonWidgetStore(db);
    expect(await store.load()).toBeNull();
    await store.save({ messageId: "msg-1" });
    expect(db.set).toHaveBeenCalledWith({ messageId: "msg-1" });
    expect(await store.load()).toEqual({ messageId: "msg-1" });
  });

  it("releases the client on close", async () => {
    const db = fakeDb();
    await new MongoDarkmoonWidgetStore(db).close();
    expect(db.close).toHaveBeenCalledTimes(1);
  });
});
