import { describe, expect, it } from "vitest";
import {
  InMemoryServerMonitorStore,
  MongoServerMonitorStore,
  type ServerMonitorDb,
} from "./server-monitor-store.js";
import type { ServerMonitorState } from "./server-monitor.js";

const OPEN: ServerMonitorState = { announced: true, downSince: 7_000 };
const CLOSED: ServerMonitorState = { announced: false, downSince: null };

/** An in-memory fake of the Mongo port, so the store's load/save logic is tested without a DB. */
function fakeDb(): ServerMonitorDb {
  let doc: ServerMonitorState | null = null;
  return {
    get: async () => doc,
    set: async (state) => void (doc = state),
    close: async () => {},
  };
}

describe("InMemoryServerMonitorStore", () => {
  it("returns null before anything is saved, then round-trips the state", async () => {
    const store = new InMemoryServerMonitorStore();
    expect(await store.load()).toBeNull();
    await store.save(OPEN);
    expect(await store.load()).toEqual(OPEN);
    await store.save(CLOSED);
    expect(await store.load()).toEqual(CLOSED);
  });

  it("can be seeded with an initial state", async () => {
    expect(await new InMemoryServerMonitorStore(OPEN).load()).toEqual(OPEN);
  });
});

describe("MongoServerMonitorStore", () => {
  it("loads null when the document is absent and round-trips a saved state", async () => {
    const store = new MongoServerMonitorStore(fakeDb());
    expect(await store.load()).toBeNull();
    await store.save(OPEN);
    expect(await store.load()).toEqual(OPEN);
  });

  it("overwrites the open outage with the closed state on recovery", async () => {
    const store = new MongoServerMonitorStore(fakeDb());
    await store.save(OPEN);
    await store.save(CLOSED);
    expect(await store.load()).toEqual(CLOSED);
  });
});
