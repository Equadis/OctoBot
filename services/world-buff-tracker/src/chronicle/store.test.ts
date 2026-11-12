import { describe, expect, it, vi } from "vitest";
import { InMemoryChronicleStore, MongoChronicleStore, type ChronicleDb, type StoredKill } from "./store.js";

function kill(over: Partial<StoredKill> = {}): StoredKill {
  return {
    logId: "l1", realm: "N'Zoth", uploader: "Anaeri", at: new Date("2026-09-01T02:00:00Z"),
    playerCount: 28, matched: true, processedAt: new Date("2026-09-01T02:30:00Z"), ...over,
  };
}

describe("InMemoryChronicleStore", () => {
  it("reports which logIds are already stored", async () => {
    const store = new InMemoryChronicleStore();
    await store.record(kill({ logId: "a" }));
    await store.record(kill({ logId: "b" }));
    expect(await store.knownLogIds(["a", "c", "b"])).toEqual(new Set(["a", "b"]));
  });

  it("keeps the first verdict for a repeated logId (idempotent)", async () => {
    const store = new InMemoryChronicleStore();
    await store.record(kill({ logId: "a", matched: true }));
    await store.record(kill({ logId: "a", matched: false })); // repeat — ignored
    expect(await store.knownLogIds(["a"])).toEqual(new Set(["a"]));
  });
});

describe("MongoChronicleStore", () => {
  function fakeDb(): ChronicleDb & { stored: StoredKill[]; upsert: ReturnType<typeof vi.fn> } {
    const stored: StoredKill[] = [];
    const upsert = vi.fn(async (k: StoredKill) => {
      if (!stored.some((s) => s.logId === k.logId)) stored.push(k);
    });
    return {
      stored,
      upsert,
      existing: async (ids) => stored.filter((s) => ids.includes(s.logId)).map((s) => s.logId),
      close: vi.fn(async () => {}),
    };
  }

  it("records via upsert and maps existing logIds", async () => {
    const db = fakeDb();
    const store = new MongoChronicleStore(db);
    await store.record(kill({ logId: "a" }));
    expect(db.upsert).toHaveBeenCalledOnce();
    expect(await store.knownLogIds(["a", "z"])).toEqual(new Set(["a"]));
  });

  it("short-circuits knownLogIds for an empty list without querying", async () => {
    const db = fakeDb();
    const existing = vi.spyOn(db, "existing");
    expect(await new MongoChronicleStore(db).knownLogIds([])).toEqual(new Set());
    expect(existing).not.toHaveBeenCalled();
  });
});
