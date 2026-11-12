import { describe, expect, it, vi } from "vitest";
import {
  InMemoryServerStatusWidgetStore,
  MongoServerStatusWidgetStore,
  docToState,
  stateToDoc,
  type ServerStatusWidgetDb,
  type ServerStatusWidgetState,
} from "./status-widget-store.js";

const sample: ServerStatusWidgetState = {
  messageId: "msg42",
  lastOutageEndedAt: 1_700_000_000_000,
  lastOutageDurationMs: 720_000,
  channelName: "🟢server-status",
  baselineEmaMs: 182.5,
  baselineSamples: 40,
  baselineUpdatedAt: 1_700_000_500_000,
};

describe("InMemoryServerStatusWidgetStore", () => {
  it("loads null on a fresh install", async () => {
    expect(await new InMemoryServerStatusWidgetStore().load()).toBeNull();
  });

  it("round-trips the saved state", async () => {
    const store = new InMemoryServerStatusWidgetStore();
    await store.save(sample);
    expect(await store.load()).toEqual(sample);
  });

  it("returns the initial state it was constructed with", async () => {
    expect(await new InMemoryServerStatusWidgetStore(sample).load()).toEqual(sample);
  });
});

describe("state <-> document mapping", () => {
  it("drops nothing on the round trip and never invents an _id", () => {
    const doc = stateToDoc(sample);
    expect(doc).toEqual({
      messageId: "msg42",
      lastOutageEndedAt: 1_700_000_000_000,
      lastOutageDurationMs: 720_000,
      channelName: "🟢server-status",
      baselineEmaMs: 182.5,
      baselineSamples: 40,
      baselineUpdatedAt: 1_700_000_500_000,
    });
    expect("_id" in doc).toBe(false);
    expect(docToState({ _id: "status", ...doc })).toEqual(sample);
  });

  it("carries a fresh widget with no message yet", () => {
    const fresh: ServerStatusWidgetState = {
      messageId: null,
      lastOutageEndedAt: null,
      lastOutageDurationMs: null,
      channelName: null,
      baselineEmaMs: null,
      baselineSamples: 0,
      baselineUpdatedAt: null,
    };
    expect(docToState({ _id: "status", ...stateToDoc(fresh) })).toEqual(fresh);
  });

  it("reads a legacy document that predates channelName and the baseline, defaulting them", () => {
    // channelName and the baseline fields are optional on the stored doc, so a pre-feature document
    // is valid input and loads with those defaulted rather than throwing.
    const legacy = { _id: "status", messageId: "m", lastOutageEndedAt: null, lastOutageDurationMs: null };
    const restored = docToState(legacy);
    expect(restored.channelName).toBeNull();
    expect(restored.baselineEmaMs).toBeNull();
    expect(restored.baselineSamples).toBe(0);
    expect(restored.baselineUpdatedAt).toBeNull();
  });
});

describe("MongoServerStatusWidgetStore", () => {
  it("delegates load/save/close to its db port", async () => {
    const db: ServerStatusWidgetDb = {
      get: vi.fn().mockResolvedValue(sample),
      set: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const store = new MongoServerStatusWidgetStore(db);

    expect(await store.load()).toEqual(sample);
    await store.save(sample);
    await store.close();

    expect(db.get).toHaveBeenCalledOnce();
    expect(db.set).toHaveBeenCalledWith(sample);
    expect(db.close).toHaveBeenCalledOnce();
  });
});
