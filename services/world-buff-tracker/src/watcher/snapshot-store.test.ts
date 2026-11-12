import { describe, expect, it, vi } from "vitest";
import {
  InMemorySnapshotStore,
  MongoSnapshotStore,
  type PollSnapshot,
  type SnapshotDb,
} from "./snapshot-store.js";

function snap(sec: number, names: string[], complete = true): PollSnapshot {
  return { ts: new Date(sec * 1000), present: names.length, complete, names };
}

describe("InMemorySnapshotStore", () => {
  it("records and returns the most recent N in chronological order", async () => {
    const store = new InMemorySnapshotStore();
    await store.record(snap(1, ["a"]));
    await store.record(snap(2, ["a", "b"]));
    await store.record(snap(3, ["a", "b", "c"]));
    const recent = await store.recent(2);
    expect(recent.map((s) => s.present)).toEqual([2, 3]); // oldest-of-the-last-two first
  });
});

describe("MongoSnapshotStore", () => {
  function fakeDb(): SnapshotDb & { docs: PollSnapshot[] } {
    const docs: PollSnapshot[] = [];
    return {
      docs,
      insert: vi.fn(async (doc) => {
        docs.push(doc);
      }),
      latest: vi.fn(async (limit: number) =>
        [...docs].sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, limit).map((d) => ({
          ts: d.ts,
          present: d.present,
          complete: d.complete,
          names: [...d.names],
        })),
      ),
      close: vi.fn(async () => {}),
    };
  }

  it("inserts a snapshot with a copied names array", async () => {
    const db = fakeDb();
    const store = new MongoSnapshotStore(db);
    const names = ["a", "b"];
    await store.record(snap(1, names));
    names.push("c"); // mutate the caller's array afterwards
    expect(db.docs[0]?.names).toEqual(["a", "b"]); // store kept its own copy
  });

  it("returns recent snapshots ascending (chronological) for replay", async () => {
    const db = fakeDb();
    const store = new MongoSnapshotStore(db);
    await store.record(snap(1, ["a"]));
    await store.record(snap(3, ["a", "b", "c"]));
    await store.record(snap(2, ["a", "b"]));
    const recent = await store.recent(3);
    expect(recent.map((s) => s.ts.getTime() / 1000)).toEqual([1, 2, 3]);
  });

  it("closes the underlying connection", async () => {
    const db = fakeDb();
    await new MongoSnapshotStore(db).close();
    expect(db.close).toHaveBeenCalled();
  });
});
