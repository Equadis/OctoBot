import { describe, expect, it } from "vitest";
import type { WhoPlayer } from "../protocol/who.js";
import type { LairView } from "./roster-source.js";
import { RaidTracker, type RaidLifecycleEvent, type RaidTrackerOptions } from "./raid-tracker.js";

const M = 60_000;

function raid(size: number, guild: string, raceId = 1): WhoPlayer[] {
  return Array.from({ length: size }, (_, i) => ({
    name: `${guild}${i}`,
    guild,
    level: 60,
    classId: 1,
    raceId,
    areaId: 2159,
  }));
}

const view = (present: readonly WhoPlayer[], at: number, complete = true): LairView => ({ present, complete, at });

const BASE: RaidTrackerOptions = { minRaidSize: 15, grouping: "auto", clearSize: 5, clearSustainedMs: 5 * M };
const tracker = (over: Partial<RaidTrackerOptions> = {}): RaidTracker => new RaidTracker({ ...BASE, ...over });
const kinds = (events: readonly RaidLifecycleEvent[]): string[] => events.map((e) => e.kind);

describe("RaidTracker — lifecycle events", () => {
  it("emits a 'formed' event the poll the roster reaches strength, carrying the peak, once", () => {
    const t = tracker();
    expect(t.observe(view(raid(8, "Nightfall"), M)).events).toEqual([]); // below strength
    const events = t.observe(view(raid(18, "Nightfall"), 2 * M)).events;
    expect(kinds(events)).toEqual(["formed"]);
    expect(events[0]).toMatchObject({ kind: "formed", peak: 18 });
    expect(t.observe(view(raid(20, "Nightfall"), 3 * M)).events).toEqual([]); // already formed, not re-emitted
  });

  it("stays quiet below strength", () => {
    const t = tracker();
    expect(t.observe(view(raid(8, "Horde"), M)).events).toEqual([]);
    expect(t.activeRaids()).toHaveLength(0);
  });

  it("emits a 'cleared' event once the roster leaves and stays gone past the window", () => {
    const t = tracker();
    t.observe(view(raid(20, "Nightfall"), M)); // formed
    t.observe(view([], 2 * M)); // everyone gone — departure begins
    expect(t.observe(view([], 5 * M)).events).toEqual([]); // 3 min — a wipe could still run back
    const events = t.observe(view([], 7 * M)).events; // 5 min sustained
    expect(kinds(events)).toEqual(["cleared"]);
    expect(events[0]).toMatchObject({ kind: "cleared", peak: 20, killConfirmed: false });
  });

  it("emits 'resumed' when a raid read as cleared has its members back, keeping its number and timer", () => {
    let n = 0;
    const t = tracker({ nextRaidNumber: () => ++n });
    t.observe(view(raid(20, "Nightfall"), M)); // #1 formed at 1M
    t.observe(view([], 2 * M)); // a wipe whose run-back outlasts the wait
    t.observe(view([], 5 * M));
    expect(kinds(t.observe(view([], 7 * M)).events)).toEqual(["cleared"]);
    const events = t.observe(view(raid(20, "Nightfall"), 9 * M)).events;
    expect(events).toEqual([{ kind: "resumed", number: 1, elapsedMs: 8 * M, awayMs: 7 * M }]);
    expect(t.raidNumber()).toBe(1);
    expect(t.raidElapsedMs(10 * M)).toBe(9 * M);
  });

  it("never emits 'formed' and 'cleared' in the same poll", () => {
    const t = tracker();
    const e = t.observe(view(raid(20, "Nightfall"), M)).events;
    expect(e).toHaveLength(1); // only the formation
  });

  it("absorbs a blackout without emitting events and flags the census", () => {
    const t = tracker();
    t.observe(view(raid(16, "Nightfall"), M));
    const obs = t.observe(view(raid(16, "Nightfall"), M + 20 * M)); // 20-min blind gap
    expect(obs.census.blackout).toBe(true);
    expect(obs.events).toEqual([]);
  });

  it("surfaces the census (present count, arrivals) for the log line", () => {
    const t = tracker();
    const obs = t.observe(view(raid(12, "Nightfall"), M));
    expect(obs.census.present).toBe(12);
    expect(obs.census.arrivals).toHaveLength(12); // first poll — all fresh
  });
});

describe("RaidTracker — status queries", () => {
  it("reports elapsed time from form, and null when not tracking", () => {
    const t = tracker();
    expect(t.raidElapsedMs(M)).toBeNull();
    t.observe(view(raid(20, "Nightfall"), M));
    expect(t.raidElapsedMs(6 * M)).toBe(5 * M); // formed at 1M → 5m elapsed at 6M
  });

  it("numbers the raid in progress from the injected counter, on the event and the query", () => {
    let n = 833;
    const t = tracker({ nextRaidNumber: () => ++n });
    expect(t.raidNumber()).toBeNull();
    const events = t.observe(view(raid(20, "Nightfall"), M)).events;
    expect(events[0]).toMatchObject({ kind: "formed", number: 834 });
    expect(t.raidNumber()).toBe(834);
  });

  it("activeRaids lists the raid in progress with a guild-derived label, and is empty when idle", () => {
    const t = tracker();
    expect(t.activeRaids()).toEqual([]);
    t.observe(view(raid(20, "Nightfall"), M));
    const active = t.activeRaids();
    expect(active).toHaveLength(1);
    expect(active[0]?.peak).toBe(20);
    expect(active[0]?.label).toContain("Nightfall");
  });
});

describe("RaidTracker — remembered players", () => {
  it("labels by the whole roster, including members who left before the raid was confirmed", () => {
    // 12 Dawn + 8 Nightfall form a raid; 5 Dawn leave while it is still forming. Counted over the
    // roster Dawn still leads 12–8; counted over only those present it would flip to Nightfall 8–7.
    const t = tracker({ formConfirmMs: 2 * M });
    const dawn = raid(12, "Dawn");
    const nightfall = raid(8, "Nightfall");
    t.observe(view([...dawn, ...nightfall], 0));
    const remaining = [...dawn.slice(0, 7), ...nightfall];
    t.observe(view(remaining, 1 * M));
    t.observe(view(remaining, 2 * M)); // confirmed now
    const [active] = t.activeRaids();
    expect(active?.count).toBe(20);
    expect(active?.label).toContain("Dawn");
  });

  it("forgets a visitor who leaves while no raid is tracked", () => {
    const t = tracker();
    t.observe(view(raid(3, "Tourist"), 0));
    expect(t.rememberedPlayers).toBe(3);
    t.observe(view([], M));
    expect(t.rememberedPlayers).toBe(0);
  });

  it("keeps the roster through a raid, then lets it go once the raid clears", () => {
    const t = tracker({ fillWindowMs: M / 2 }); // arrivals after 30s are not this raid's members
    t.observe(view(raid(20, "Nightfall"), 0));
    t.observe(view(raid(3, "Tourist"), M)); // the raid left; three strangers wander in
    expect(t.rememberedPlayers).toBe(23); // roster (still tracked) + those present
    t.observe(view([], 20 * M)); // gone past the sustained window → cleared
    expect(t.activeRaids()).toEqual([]);
    expect(t.rememberedPlayers).toBe(0);
  });

  it("forgets strangers during a blackout poll too, but never the roster", () => {
    const t = tracker({ fillWindowMs: M / 2 });
    t.observe(view(raid(20, "Nightfall"), 0));
    t.observe(view(raid(2, "Tourist"), M)); // 20 roster + 2 strangers
    t.observe(view([], 2 * M, false)); // incomplete /who — a blackout
    expect(t.rememberedPlayers).toBe(20);
    expect(t.activeRaids()[0]?.label).toContain("Nightfall");
  });
});

describe("RaidTracker — two-point start (forming size < strength, leave below the floor)", () => {
  const opts: Partial<RaidTrackerOptions> = { minRaidSize: 20, strengthSize: 23, leftFloor: 15, clearSustainedMs: 5 * M };

  it("emits 'formed' only at strength (where the number exists), not at the forming size", () => {
    const t = tracker(opts);
    expect(t.observe(view(raid(20, "Nightfall"), M)).events).toEqual([]); // 20 < strength 23
    expect(t.raidElapsedMs(M)).toBeNull(); // clock not started
    const events = t.observe(view(raid(23, "Nightfall"), 2 * M)).events;
    expect(kinds(events)).toEqual(["formed"]);
    expect(t.raidElapsedMs(2 * M)).toBe(0); // clock starts at strength
  });

  it("does not read churn above the left floor as leaving", () => {
    const t = tracker(opts);
    t.observe(view(raid(25, "Nightfall"), M)); // at strength
    t.observe(view(raid(18, "Nightfall"), 2 * M)); // dipped to 18, above the 15 floor
    expect(t.observe(view(raid(18, "Nightfall"), 3 * M)).events).toEqual([]);
  });

  it("confirms a clear below the floor, timed from strength not forming", () => {
    const t = tracker(opts);
    t.observe(view(raid(20, "Nightfall"), 1 * M)); // forming — clock NOT started
    t.observe(view(raid(23, "Nightfall"), 2 * M)); // strength — clock starts
    t.observe(view(raid(10, "Nightfall"), 3 * M)); // below 15 → departure begins
    t.observe(view(raid(10, "Nightfall"), 5 * M)); // not yet sustained
    const events = t.observe(view(raid(10, "Nightfall"), 8 * M)).events; // 5 min sustained
    expect(kinds(events)).toEqual(["cleared"]);
    // form→clear = belowSince(3M) − strength(2M) = 1M; from forming(1M) it would be 2M.
    expect(events[0]).toMatchObject({ kind: "cleared", durationMs: 1 * M });
  });
});

describe("RaidTracker — Chronicle early-confirm + persistence", () => {
  // Polls stay <= the 3-min blackout gap: a larger jump is read as a blind gap (the manager's
  // PresenceTracker, exactly as the live poll at ~30-60s never triggers).
  it("reports a pending departure and confirms it early with the same clear", () => {
    const t = tracker();
    t.observe(view(raid(30, "Nightfall"), 0));
    expect(t.pendingClear()).toBeNull(); // present, not leaving
    t.observe(view(raid(30, "Nightfall"), 2 * M)); // still here
    t.observe(view(raid(1, "Nightfall"), 4 * M)); // departure begins at 4M
    const pending = t.pendingClear();
    expect(pending).not.toBeNull();
    expect(pending?.formedAt).toBe(0);
    const clear = t.confirmClearNow(); // Chronicle proved the kill — confirm now, not after the wait
    expect(clear?.durationMs).toBe(4 * M); // form(0) → departure start(4M)
    expect(t.pendingClear()).toBeNull(); // reset
  });

  it("snapshots a raid and resumes it after a restart, still catching the clear", () => {
    const a = tracker();
    a.observe(view(raid(30, "Nightfall"), 0));
    a.observe(view(raid(30, "Nightfall"), 2 * M));
    const snap = a.raidStateSnapshot();
    expect(snap).not.toBeNull();

    const b = tracker();
    b.restoreRaidState(snap!);
    expect(b.raidElapsedMs(2 * M)).toBe(2 * M); // same form time (0)
    b.observe(view([], 3 * M)); // departure begins at 3M
    b.observe(view([], 5 * M)); // not yet sustained
    const events = b.observe(view([], 8 * M)).events; // 5 min sustained
    expect(kinds(events)).toEqual(["cleared"]);
    expect(events[0]).toMatchObject({ durationMs: 3 * M }); // 0 → 3M, spanning the restart
  });
});

describe("RaidTracker — formation confirm window wiring", () => {
  it("holds the 'formed' event until the roster has stayed for formConfirmMs", () => {
    const t = tracker({ formConfirmMs: 2 * M });
    expect(t.observe(view(raid(20, "Nightfall"), 0)).events).toEqual([]); // at strength, forming
    expect(t.observe(view(raid(20, "Nightfall"), 1 * M)).events).toEqual([]); // 1m < 2m
    const events = t.observe(view(raid(20, "Nightfall"), 2 * M)).events; // 2m held → formed
    expect(kinds(events)).toEqual(["formed"]);
    expect(t.raidElapsedMs(2 * M)).toBe(2 * M); // now in progress, timed from strength
  });
});
