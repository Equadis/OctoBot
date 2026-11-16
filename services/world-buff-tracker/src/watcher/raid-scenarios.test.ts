import { describe, expect, it } from "vitest";
import type { WhoPlayer } from "../protocol/who.js";
import type { LairView } from "./roster-source.js";
import { RaidTracker, type RaidTrackerOptions } from "./raid-tracker.js";

/**
 * Brief scenarios that the older suites did not pin down: a multi-guild raid stays ONE session, a mixed PUG is a PUG, a roster with unknown
 * guilds is Unknown (never PUG), and temporary /who failures neither end a raid nor reset its clock.
 */
const M = 60_000;
const T0 = Date.UTC(2026, 10, 16, 12, 0, 0);
const players = (guild: string | undefined, size: number, tag: string): WhoPlayer[] =>
  Array.from({ length: size }, (_, i) => ({ name: `${tag}${i}`, guild: guild as string, level: 60, classId: 1, raceId: 1, areaId: 2159 }));
const view = (present: readonly WhoPlayer[], min: number, complete = true): LairView => ({ present, complete, at: T0 + min * M });
const OPTS: RaidTrackerOptions = { minRaidSize: 15, grouping: "auto", clearSize: 5, clearSustainedMs: 5 * M, rosterCap: 49, maxConcurrentRaids: 2 };
let n = 700;
const make = (): RaidTracker => { n = 700; return new RaidTracker({ ...OPTS, nextRaidNumber: () => ++n }); };
const live = (t: RaidTracker) => t.sessions().sessions.filter((s) => s.status !== "ended");
const feed = (t: RaidTracker, present: WhoPlayer[], from: number, to: number, complete = true) => {
  for (let m = from; m <= to; m += 1) t.observe(view(present, m, complete));
};

describe("guild composition inside one inferred raid", () => {
  it("two guilds raiding together stay ONE session labelled as a collaboration (guilds never split a raid)", () => {
    const t = make();
    feed(t, [...players("Nightfall", 14, "N"), ...players("Stormguard", 12, "S"), ...players("Solo", 4, "x")], 1, 8);
    expect(live(t)).toHaveLength(1);
    const s = live(t)[0];
    expect(s?.id).toBe(701);
    expect(s?.guild.kind).toBe("collab");
    expect(s?.guild.label).toBe("Nightfall + Stormguard");
    expect(t.sessions().ambiguity).toBeNull();
  });
  it("a guild-led PUG: one guild at 50-59% of its own roster", () => {
    const t = make();
    feed(t, [...players("Nightfall", 17, "N"), ...players(undefined, 0, "u"), ...Array.from({ length: 13 }, (_, i) => players(`Solo${i}`, 1, `p${i}`)[0]!)], 1, 8);
    expect(live(t)[0]?.guild.kind).toBe("guild-led");
    expect(live(t)[0]?.guild.label).toBe("Nightfall-led PUG");
  });
  it("a fully mixed PUG is labelled PUG, and one guild at 33% does not make it a guild raid", () => {
    const t = make();
    feed(t, [...players("Small", 6, "m"), ...Array.from({ length: 24 }, (_, i) => players(`Solo${i}`, 1, `p${i}`)[0]!)], 1, 8);
    expect(live(t)).toHaveLength(1);
    expect(live(t)[0]?.guild.kind).toBe("pug");
    expect(live(t)[0]?.guild.label).toBe("PUG");
  });
  it("unknown guild membership is Unknown, never counted as PUG", () => {
    const t = make();
    const unknown = Array.from({ length: 25 }, (_, i) => ({ name: `q${i}`, level: 60, classId: 1, raceId: 1, areaId: 2159 }) as unknown as WhoPlayer);
    feed(t, unknown, 1, 8);
    expect(live(t)[0]?.guild.kind).toBe("unknown");
    expect(live(t)[0]?.guild.label).toBe("Unknown");
  });
});

describe("temporary /who failures", () => {
  it("incomplete or empty polls inside the gap tolerance neither end the raid nor move its clock", () => {
    const t = make();
    feed(t, players("Nightfall", 25, "N"), 1, 6);
    const before = live(t)[0];
    feed(t, [], 7, 8, false);                    // /who failed twice: an incomplete, empty view
    const during = live(t)[0];
    expect(during?.id).toBe(701);
    expect(during?.formedAt).toBe(before?.formedAt);
    expect(during?.status).not.toBe("ended");
    feed(t, players("Nightfall", 25, "N"), 9, 10);
    expect(live(t)).toHaveLength(1);
    expect(live(t)[0]).toMatchObject({ id: 701, formedAt: before?.formedAt });
    expect(t.sessions().sessions.filter((s) => s.status === "ended")).toHaveLength(0);
  });
  it("a failed poll never starts a clock for a raid that was not seen", () => {
    const t = make();
    feed(t, [], 1, 4, false);
    expect(live(t)).toHaveLength(0);
    feed(t, players("Nightfall", 25, "N"), 5, 6);
    expect(live(t)[0]?.formedAt).toBe(T0 + 5 * M);      // formation is when the roster was actually seen, not back-dated
  });
  it("an empty complete /who after a raid is not a kill", () => {
    const t = make();
    feed(t, players("Nightfall", 25, "N"), 1, 6);
    feed(t, [], 7, 20);
    for (const e of t.sessions().sessions.filter((s) => s.status === "ended")) {
      expect(e.clearSource).not.toBe("chronicle_kill");
      expect(e.endReason).not.toBe("kill_confirmed");
    }
  });
});

describe("the 49-player /who cap", () => {
  it("49 players listed with an incomplete view never yield two invented raids or a confident guild label", () => {
    const t = make();
    feed(t, [...players("Nightfall", 30, "N"), ...players("Stormguard", 19, "S")], 1, 6, false);
    expect(live(t).length).toBeLessThanOrEqual(1);
    for (const s of live(t)) expect(["unknown", "collab", "guild-led", "guild"]).toContain(s.guild.kind);
  });
});
