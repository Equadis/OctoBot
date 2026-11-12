import { describe, expect, it, vi } from "vitest";
import {
  InMemoryFeedbackStore,
  MongoFeedbackStore,
  type FeedbackDb,
  type FeedbackEntry,
} from "./store.js";

const at = (sec: number): Date => new Date(sec * 1000);
const entry = (from: string, text: string, sec: number): FeedbackEntry => ({ from, text, at: at(sec) });

describe("InMemoryFeedbackStore", () => {
  it("returns nothing before anything is recorded", async () => {
    expect(await new InMemoryFeedbackStore().recent(10)).toEqual([]);
  });

  it("returns recent entries newest-first, bounded by limit", async () => {
    const store = new InMemoryFeedbackStore();
    await store.record(entry("Alice", "first", 100));
    await store.record(entry("Bob", "second", 200));
    await store.record(entry("Cara", "third", 300));
    const recent = await store.recent(2);
    expect(recent.map((e) => e.from)).toEqual(["Cara", "Bob"]);
  });
});

describe("MongoFeedbackStore", () => {
  function fakeDb(): FeedbackDb & { docs: FeedbackEntry[] } {
    const docs: FeedbackEntry[] = [];
    return {
      docs,
      insert: vi.fn(async (doc) => {
        docs.push({ from: doc.from, text: doc.text, at: doc.at });
      }),
      latest: vi.fn(async (limit: number) =>
        [...docs].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit),
      ),
      close: vi.fn(async () => {}),
    };
  }

  it("records an entry and reads it back newest-first", async () => {
    const db = fakeDb();
    const store = new MongoFeedbackStore(db);
    await store.record(entry("Alice", "the timer felt late", 100));
    await store.record(entry("Bob", "love it", 300));
    const recent = await store.recent(5);
    expect(recent.map((e) => e.from)).toEqual(["Bob", "Alice"]);
    expect(recent[0]?.text).toBe("love it");
  });

  it("closes the underlying connection", async () => {
    const db = fakeDb();
    await new MongoFeedbackStore(db).close();
    expect(db.close).toHaveBeenCalled();
  });
});
