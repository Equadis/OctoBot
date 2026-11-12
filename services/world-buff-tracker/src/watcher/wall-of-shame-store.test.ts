import { describe, expect, it, vi } from "vitest";
import {
  InMemoryWallOfShameStore,
  MongoWallOfShameStore,
  type WallOfShameDb,
  type WallOfShameState,
} from "./wall-of-shame-store.js";

describe("InMemoryWallOfShameStore", () => {
  it("starts empty and returns what was saved", async () => {
    const store = new InMemoryWallOfShameStore();
    expect(await store.load()).toBeNull();
    await store.save({ messageId: "msg-1" });
    expect(await store.load()).toEqual({ messageId: "msg-1" });
  });
});

describe("MongoWallOfShameStore", () => {
  const fakeDb = () => {
    let held: WallOfShameState | null = null;
    const db = {
      get: vi.fn(async () => held),
      set: vi.fn(async (state: WallOfShameState) => {
        held = state;
      }),
      close: vi.fn(async () => undefined),
    } satisfies WallOfShameDb;
    return db;
  };

  it("round-trips the message id through the collection", async () => {
    const db = fakeDb();
    const store = new MongoWallOfShameStore(db);
    expect(await store.load()).toBeNull();
    await store.save({ messageId: "msg-1" });
    expect(db.set).toHaveBeenCalledWith({ messageId: "msg-1" });
    expect(await store.load()).toEqual({ messageId: "msg-1" });
  });

  it("releases the client on close", async () => {
    const db = fakeDb();
    await new MongoWallOfShameStore(db).close();
    expect(db.close).toHaveBeenCalledTimes(1);
  });
});
