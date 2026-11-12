import { describe, expect, it, vi } from "vitest";
import { BuffTracker, type BuffTrackerDeps } from "./buff-tracker.js";
import { InMemoryBuffStore, type Faction } from "./buff-store.js";
import type { BuffYell } from "./buff-yell.js";
import { newLairActivity, noteLairPoll, type LairActivity } from "./drop-origin.js";

const MIN = 60_000;
const meta = { sourceName: "Someguildie", text: "Rallying Cry of the Dragonslayer!", detectedBy: "Onybuffog" };

const ony = (faction: Faction): BuffYell => ({ faction, head: "onyxia" });
const nef = (faction: Faction): BuffYell => ({ faction, head: "bwl" });

function harness(over: Partial<BuffTrackerDeps> = {}) {
  const store = new InMemoryBuffStore();
  const activity: LairActivity = newLairActivity();
  const bwlActivity: LairActivity = newLairActivity();
  const logger = { info: vi.fn(), error: vi.fn() };
  const deps: BuffTrackerDeps = {
    store,
    dedupWindowMs: 10 * MIN,
    cooldownMs: 0,
    lairs: {
      onyxia: { activity, freshWindowMs: 15 * MIN },
      bwl: { activity: bwlActivity, freshWindowMs: 30 * MIN },
    },
    logger,
    ...over,
  };
  return { tracker: new BuffTracker(deps), store, activity, bwlActivity, logger };
}

describe("BuffTracker.record", () => {
  it("records a fresh kill when a raid was in the lair within the window, and persists it", async () => {
    const { tracker, store, activity } = harness();
    noteLairPoll(activity, 25, 1_000); // a raid is present
    const drop = tracker.record(ony("alliance"), meta, 2_000);
    expect(drop).toEqual({ appliedAt: new Date(2_000), head: "onyxia", origin: "fresh" });
    expect(await store.current("alliance")).toEqual({ faction: "alliance", appliedAt: new Date(2_000), head: "onyxia" });
  });

  it("classifies a drop over an empty (fully-observed) lair as a saved head", () => {
    const { tracker, activity } = harness();
    noteLairPoll(activity, 0, 1_000); // full coverage, nobody in the lair
    expect(tracker.record(ony("horde"), meta, 2_000)?.origin).toBe("saved");
  });

  it("classifies a drop as unknown when the lair was never polled (blind)", () => {
    const { tracker } = harness();
    expect(tracker.record(ony("horde"), meta, 2_000)?.origin).toBe("unknown");
  });

  it("ignores a duplicate heard by a second listener within the dedup window", () => {
    const { tracker, logger } = harness();
    expect(tracker.record(ony("alliance"), meta, 1_000)).not.toBeNull();
    expect(tracker.record(ony("alliance"), { ...meta, detectedBy: "Onybuffsw" }, 1_000 + 30_000)).toBeNull();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("ignoring duplicate heard by Onybuffsw"));
  });

  it("lets the SAME faction drop again once the dedup window has passed", () => {
    const { tracker } = harness({ dedupWindowMs: 5 * MIN });
    expect(tracker.record(ony("alliance"), meta, 0)).not.toBeNull();
    expect(tracker.record(ony("alliance"), meta, 6 * MIN)).not.toBeNull(); // a genuinely later drop
  });

  it("dedups per faction — alliance and horde don't shadow each other", () => {
    const { tracker } = harness();
    expect(tracker.record(ony("alliance"), meta, 1_000)).not.toBeNull();
    expect(tracker.record(ony("horde"), meta, 1_000)).not.toBeNull();
  });
});

describe("BuffTracker.record — Nefarian's head", () => {
  it("classifies a Nefarian drop against Blackwing Lair, not Onyxia's empty lair", async () => {
    const { tracker, store, activity, bwlActivity } = harness();
    noteLairPoll(activity, 0, 1_000); // Onyxia's lair empty — would call it a saved head
    noteLairPoll(bwlActivity, 38, 1_000); // a raid in BWL
    expect(tracker.record(nef("horde"), meta, 2_000)).toEqual({ appliedAt: new Date(2_000), head: "bwl", origin: "fresh" });
    expect(await store.current("horde")).toEqual({ faction: "horde", appliedAt: new Date(2_000), head: "bwl" });
  });

  it("uses Blackwing Lair's own fresh window", () => {
    const { tracker, activity, bwlActivity } = harness();
    noteLairPoll(activity, 38, 0);
    noteLairPoll(bwlActivity, 38, 0);
    noteLairPoll(activity, 0, 2 * MIN);
    noteLairPoll(bwlActivity, 0, 2 * MIN);
    noteLairPoll(activity, 0, 4 * MIN);
    noteLairPoll(bwlActivity, 0, 4 * MIN);
    // 20m after the raid was last seen at strength: past Onyxia's 15m window, inside BWL's 30m one.
    // (Polled 1m before the drop so neither census is stale.)
    for (let m = 6; m <= 19; m += 1) {
      noteLairPoll(activity, 0, m * MIN);
      noteLairPoll(bwlActivity, 0, m * MIN);
    }
    expect(tracker.record(ony("alliance"), meta, 20 * MIN)?.origin).toBe("saved");
    expect(tracker.record(nef("alliance"), meta, 20 * MIN)?.origin).toBe("fresh");
  });

  it("is unknown when Blackwing Lair was never watched, whatever Onyxia's lair shows", () => {
    const { tracker, activity } = harness();
    noteLairPoll(activity, 0, 1_000);
    expect(tracker.record(nef("alliance"), meta, 2_000)?.origin).toBe("unknown");
  });

  it("dedups per head — an Onyxia and a Nefarian head on the same side are two drops", () => {
    const { tracker } = harness();
    expect(tracker.record(ony("alliance"), meta, 1_000)).not.toBeNull();
    expect(tracker.record(nef("alliance"), meta, 2_000)).not.toBeNull();
    expect(tracker.record(nef("alliance"), meta, 3_000)).toBeNull();
  });
});

describe("BuffTracker state (for the policy + status)", () => {
  it("treats either head as the side's latest drop", async () => {
    const { tracker } = harness();
    tracker.record(ony("horde"), meta, 1_000);
    tracker.record(nef("horde"), meta, 5_000);
    expect(await tracker.lastDropAt("horde")).toEqual(new Date(5_000));
    expect(await tracker.lastDrop("horde")).toEqual({ faction: "horde", appliedAt: new Date(5_000), head: "bwl" });
  });

  it("reports the last drop time per faction", async () => {
    const { tracker } = harness();
    expect(await tracker.lastDropAt("alliance")).toBeNull();
    tracker.record(ony("alliance"), meta, 5_000);
    expect(await tracker.lastDropAt("alliance")).toEqual(new Date(5_000));
    expect(await tracker.lastDropAt("horde")).toBeNull();
  });

  it("reports cooldown remaining when a cooldown is configured and active", async () => {
    const { tracker } = harness({ cooldownMs: 60 * MIN });
    tracker.record(ony("horde"), meta, 10 * MIN);
    const state = await tracker.cooldownState("horde", 12 * MIN); // 2m since a 60m cooldown drop
    expect(state).toEqual({ faction: "horde", sinceLastDropMs: 2 * MIN, cooldownRemainingMs: 58 * MIN, lastHead: "onyxia" });
  });

  it("names a Nefarian head as the last drop's, and no head before any drop", async () => {
    const { tracker } = harness({ cooldownMs: 0 });
    expect((await tracker.cooldownState("alliance", 12 * MIN)).lastHead).toBeUndefined();
    tracker.record(nef("alliance"), meta, 10 * MIN);
    expect((await tracker.cooldownState("alliance", 12 * MIN)).lastHead).toBe("bwl");
  });

  it("reports zero cooldown remaining when no cooldown is configured", async () => {
    const { tracker } = harness({ cooldownMs: 0 });
    tracker.record(ony("horde"), meta, 10 * MIN);
    const state = await tracker.cooldownState("horde", 12 * MIN);
    expect(state.cooldownRemainingMs).toBe(0);
    expect(state.sinceLastDropMs).toBe(2 * MIN);
  });

  it("exposes the drop history for interval measurement", async () => {
    const { tracker } = harness({ dedupWindowMs: 1 });
    tracker.record(ony("alliance"), meta, 1_000);
    tracker.record(ony("alliance"), meta, 2_000);
    expect((await tracker.history("alliance", 5)).map((d) => d.appliedAt)).toEqual([new Date(1_000), new Date(2_000)]);
  });
});
