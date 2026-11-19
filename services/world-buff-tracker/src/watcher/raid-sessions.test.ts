import { describe, expect, it } from "vitest";
import type { WhoPlayer } from "../protocol/who.js";
import type { LairView } from "./roster-source.js";
import { RaidTracker, type RaidTrackerOptions } from "./raid-tracker.js";

const M = 60_000;
const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);

const group = (guild: string, size: number, tag = guild): WhoPlayer[] =>
  Array.from({ length: size }, (_, i) => ({ name: `${tag}${i}`, guild, level: 60, classId: 1, raceId: 1, areaId: 2159 }));
const pug = (tag: string, size: number): WhoPlayer[] =>
  Array.from({ length: size }, (_, i) => ({ name: `${tag}${i}`, guild: `Solo-${tag}${i}`, level: 60, classId: 1, raceId: 1, areaId: 2159 }));
const view = (present: readonly WhoPlayer[], min: number, complete = true): LairView => ({ present, complete, at: T0 + min * M });

const ONY: RaidTrackerOptions = { minRaidSize: 15, grouping: "auto", clearSize: 5, clearSustainedMs: 5 * M, rosterCap: 30, maxConcurrentRaids: 2 };
const BWL: Partial<RaidTrackerOptions> = { minRaidSize: 20, rosterCap: 40 };
let counter = 0;
const make = (over: Partial<RaidTrackerOptions> = {}, start = 700): RaidTracker => {
  counter = start;
  return new RaidTracker({ ...ONY, nextRaidNumber: () => ++counter, ...over });
};
const live = (t: RaidTracker) => t.sessions().sessions.filter((s) => s.status !== "ended");
const ended = (t: RaidTracker) => t.sessions().sessions.filter((s) => s.status === "ended");
const feed = (t: RaidTracker, present: WhoPlayer[], from: number, to: number) => {
  for (let m = from; m <= to; m += 1) t.observe(view(present, m));
};

describe("single raids", () => {
  it("a normal 25-player Onyxia raid: authoritative id, clock from formation, guild label", () => {
    const t = make();
    feed(t, group("Nightfall", 25), 1, 8);
    const [s] = live(t);
    expect(live(t)).toHaveLength(1);
    expect(s).toMatchObject({ id: 701, status: "in_progress", confidence: "high", formedAt: T0 + 1 * M, peak: 25 });
    expect(s?.guild).toMatchObject({ kind: "guild", label: "Nightfall" });
    expect(t.raidElapsedMs(T0 + 9 * M)).toBe(8 * M);
  });
  it("a normal 40-player BWL raid", () => {
    const t = make(BWL);
    feed(t, group("Nightfall", 40), 1, 5);
    expect(live(t)[0]).toMatchObject({ id: 701, peak: 40, players: 40 });
  });
  it("forms exactly at 15 (Onyxia) and 20 (BWL), not one below", () => {
    const a = make();
    feed(a, group("G", 14), 1, 3);
    expect(live(a)).toHaveLength(0);
    feed(a, group("G", 15), 4, 4);
    expect(live(a)).toHaveLength(1);
    const b = make(BWL);
    feed(b, group("G", 19), 1, 3);
    expect(live(b)).toHaveLength(0);
    feed(b, group("G", 20), 4, 4);
    expect(live(b)).toHaveLength(1);
  });
  it("one or two players entering never starts a clock", () => {
    const t = make();
    feed(t, group("G", 2), 1, 5);
    expect(t.sessions().sessions).toHaveLength(0);
    expect(t.raidElapsedMs(T0 + 6 * M)).toBeNull();
  });
  it("a wipe and re-entry keeps the same raid and clock", () => {
    const t = make();
    const raid = group("Nightfall", 25);
    feed(t, raid, 1, 5);
    feed(t, raid.slice(0, 6), 6, 8); // wiped, 3 min < sustained
    expect(live(t)[0]?.status).toBe("leaving");
    feed(t, raid, 9, 10);
    expect(live(t)).toHaveLength(1);
    expect(live(t)[0]).toMatchObject({ id: 701, status: "in_progress", formedAt: T0 + 1 * M });
    expect(ended(t)).toHaveLength(0);
  });
  it("a long wipe read as a clear resumes the same session (not a new raid)", () => {
    const t = make();
    const raid = group("Nightfall", 25);
    feed(t, raid, 1, 5);
    feed(t, [], 6, 12); // gone past sustained -> cleared
    expect(ended(t)[0]).toMatchObject({ id: 701, endReason: "departed", clearSource: "roster_departure" });
    feed(t, raid, 13, 14);
    expect(ended(t)).toHaveLength(0);
    expect(live(t)[0]).toMatchObject({ id: 701, resumed: true, formedAt: T0 + 1 * M });
  });
  it("a disbanded raid ends without a kill claim and is not training data once annotated", () => {
    const t = make();
    feed(t, group("Nightfall", 25), 1, 3);
    feed(t, [], 4, 10);
    const e = ended(t)[0];
    expect(e).toMatchObject({ id: 701, clearSource: "roster_departure" });
    t.annotateEnd(701, "disbanded");
    expect(ended(t)[0]?.endReason).toBe("disbanded");
    expect(ended(t)[0]?.trusted).toBe(false);
  });
  it("a Chronicle-proven kill is the only way to a chronicle_kill source", () => {
    const t = make();
    feed(t, group("Nightfall", 25), 1, 6);
    feed(t, [], 7, 8);
    expect(t.pendingClear()).not.toBeNull();
    expect(t.confirmClearNow()).not.toBeNull();
    expect(ended(t)[0]).toMatchObject({ endReason: "kill_confirmed", clearSource: "chronicle_kill", trusted: true });
  });
  it("an empty /who alone never claims a kill", () => {
    const t = make();
    feed(t, group("Nightfall", 25), 1, 3);
    feed(t, [], 4, 20);
    expect(ended(t).length).toBeGreaterThan(0);
    expect(ended(t).every((s) => s.clearSource !== "chronicle_kill")).toBe(true);
  });
  it("back-to-back raids do not merge: the second gets its own id and clock", () => {
    const t = make();
    feed(t, group("Alpha", 25), 1, 6);
    feed(t, group("Beta", 25), 7, 14); // Alpha left, Beta in at once
    const lives = live(t);
    expect(lives).toHaveLength(1);
    expect(lives[0]?.id).toBe(702);
    expect(lives[0]?.formedAt).toBeGreaterThan(T0 + 6 * M);
    expect(ended(t)[0]?.id).toBe(701);
  });
  it("roster churn during a raid keeps the id and does not flip the guild label", () => {
    const t = make();
    const raid = group("Nightfall", 25);
    feed(t, raid, 1, 6);
    for (let m = 7; m <= 14; m += 1) {
      t.observe(view([...raid.slice(m % 3), ...group("Visitor", m % 2 === 0 ? 2 : 1)], m));
      expect(live(t)[0]?.id).toBe(701);
      expect(live(t)[0]?.guild.label).toBe("Nightfall");
    }
  });
  it("collector restart mid-raid resumes id, start and elapsed, and numbering continues", () => {
    const t = make();
    feed(t, group("Nightfall", 25), 1, 6);
    const snap = t.raidStateSnapshot();
    expect(snap).not.toBeNull();
    const t2 = make({}, 701);
    if (snap) t2.restoreRaidState(snap);
    t2.observe(view(group("Nightfall", 25), 7));
    expect(live(t2)[0]).toMatchObject({ id: 701, formedAt: T0 + 1 * M });
    expect(t2.raidElapsedMs(T0 + 9 * M)).toBe(8 * M);
    feed(t2, [], 8, 14);
    feed(t2, group("Beta", 25), 15, 16);
    expect(live(t2)[0]?.id).toBe(702);
  });
  it("a blind gap that loses the raid is 'interrupted', never a clear", () => {
    const t = make();
    feed(t, group("Nightfall", 25), 1, 4);
    t.observe(view([], 40)); // a 36-minute gap -> blackout, members gone
    const e = ended(t)[0];
    expect(e?.endReason).toBe("interrupted");
    expect(e?.trusted).toBe(false);
  });
});

describe("concurrent raids", () => {
  const a = group("Nightfall", 25);
  it("two guild raids simultaneously: separate ids/clocks, high confidence, own labels", () => {
    const t = make();
    const b = group("Stormguard", 20);
    feed(t, a, 1, 11);
    feed(t, [...a, ...b], 12, 16);
    const lives = live(t);
    expect(lives).toHaveLength(2);
    const [x, y] = lives;
    expect(x).toMatchObject({ id: 701, formedAt: T0 + 1 * M, confidence: "high" });
    expect(y).toMatchObject({ id: 702, formedAt: T0 + 12 * M, confidence: "high" });
    expect(x?.guild.label).toBe("Nightfall");
    expect(y?.guild.label).toBe("Stormguard");
    expect(t.raidElapsedMs(T0 + 20 * M)).toBe(19 * M);
  });
  it("two PUG raids: separated by timing only, so the second is tentative", () => {
    const t = make();
    feed(t, pug("a", 25), 1, 11);
    feed(t, [...pug("a", 25), ...pug("b", 20)], 12, 16);
    const lives = live(t);
    expect(lives).toHaveLength(2);
    expect(lives[1]?.confidence).toBe("tentative");
    expect(lives.map((s) => s.guild.label)).toEqual(["PUG", "PUG"]);
  });
  it("a guild raid alongside a PUG", () => {
    const t = make();
    feed(t, a, 1, 11);
    feed(t, [...a, ...pug("p", 20)], 12, 16);
    expect(live(t).map((s) => s.guild.label)).toEqual(["Nightfall", "PUG"]);
  });
  it("two raids of the SAME guild stay separate sessions but only tentative", () => {
    const t = make();
    const g1 = group("Nightfall", 25, "a");
    const g2 = group("Nightfall", 20, "b");
    feed(t, g1, 1, 11);
    feed(t, [...g1, ...g2], 12, 16);
    const lives = live(t);
    expect(lives).toHaveLength(2);
    expect(lives[1]?.confidence).toBe("tentative");
  });
  it("one raid clearing leaves the other running with its own clock", () => {
    const t = make();
    const b = group("Stormguard", 20);
    feed(t, a, 1, 11);
    feed(t, [...a, ...b], 12, 14);
    feed(t, b, 15, 24); // Nightfall leaves
    expect(live(t)).toHaveLength(1);
    expect(live(t)[0]).toMatchObject({ id: 702, formedAt: T0 + 12 * M });
    expect(ended(t)[0]).toMatchObject({ id: 701, endReason: "departed" });
  });
  it("40+ players present is NOT two raids: a 49-player lair assembled together is ambiguous", () => {
    const t = make();
    const all = [...group("A", 30), ...group("B", 19)];
    feed(t, all, 1, 6);
    expect(live(t)).toHaveLength(1);
    expect(t.sessions().ambiguity?.kind).toBe("overlapping_assembly");
    expect(live(t)[0]?.confidence).toBe("high");
  });
  it("a second group seen on a truncated /who is unresolved, not a session", () => {
    const t = make();
    feed(t, a, 1, 11);
    t.observe(view([...a, ...group("Stormguard", 20)], 12, false));
    expect(live(t)).toHaveLength(1);
    expect(t.sessions().ambiguity?.kind).toBe("truncated_view");
  });
  it("stragglers arriving one by one never become a raid", () => {
    const t = make();
    feed(t, a, 1, 11);
    for (let i = 0; i < 20; i += 1) t.observe(view([...a, ...group("Trickle", i + 1)], 12 + i * 3));
    expect(live(t)).toHaveLength(1);
    expect(t.sessions().ambiguity?.kind).toBe("staggered_arrivals");
  });
  it("with maxConcurrentRaids=1 behaviour is the original single roster", () => {
    const t = make({ maxConcurrentRaids: 1 });
    feed(t, a, 1, 11);
    feed(t, [...a, ...group("Stormguard", 20)], 12, 16);
    expect(live(t)).toHaveLength(1);
    expect(t.sessions().ambiguity).not.toBeNull();
  });
  it("persists a concurrent raid across a restart", () => {
    const t = make();
    const b = group("Stormguard", 20);
    feed(t, a, 1, 11);
    feed(t, [...a, ...b], 12, 14);
    const t2 = make({}, 702);
    const p = t.raidStateSnapshot();
    if (p) t2.restoreRaidState(p);
    for (const extra of t.extraRaidStates()) t2.restoreRaidState(extra.state, extra.slot);
    t2.observe(view([...a, ...b], 15));
    expect(live(t2).map((s) => s.id)).toEqual([701, 702]);
  });
});

describe("durable independent raid recovery", () => {
  const a = group("Nightfall", 40);
  const b = group("Stormguard", 40);
  it("restores a secondary after an extended wipe and restart while the primary remains active", () => {
    const t = make({ rosterCap: 40 });
    feed(t, a, 1, 10);
    feed(t, [...a, ...b], 11, 18);
    const before = live(t).find(s => s.id === 702)!;
    feed(t, a, 19, 25);
    expect(ended(t).find(s => s.id === 702)).toBeDefined();
    const restored = make({ rosterCap: 40 }, 702);
    restored.restoreCheckpoint(JSON.parse(JSON.stringify(t.checkpoint())));
    restored.observe(view(a, 26));
    const obs = restored.observe(view([...a, ...b], 27));
    expect(obs.events).toContainEqual(expect.objectContaining({kind:"resumed", number:702}));
    expect(live(restored).find(s => s.id === 702)).toMatchObject({key:before.key, formedAt:before.formedAt, guild:before.guild, resumed:true, players:40});
    expect(live(restored).map(s=>s.players).reduce((x,y)=>x+y,0)).toBe(80);
    expect(ended(restored).some(s=>s.id===702)).toBe(false);
  });
  it("does not turn a missing cohort across restart into a departure; can recover it later", () => {
    const t = make({ rosterCap: 40 });
    feed(t, a, 1, 10);
    const restored = make({ rosterCap: 40 }, 701);
    restored.restoreCheckpoint(t.checkpoint());
    expect(restored.observe(view([], 30)).events).toEqual([]);
    expect(ended(restored)[0]).toMatchObject({ id:701, endReason:"interrupted", trusted:false });
    restored.observe(view(a, 31, false));
    expect(live(restored)).toHaveLength(0);
    restored.observe(view(a, 32));
    expect(live(restored)[0]).toMatchObject({id:701, formedAt:T0+M, resumed:true});
  });
  it("never resurrects a proven kill after restart", () => {
    const t=make({rosterCap:40});
    feed(t,a,1,10); feed(t,[],11,12);
    expect(t.confirmClearNow(T0+12*M)).not.toBeNull();
    const restored=make({rosterCap:40},701);
    restored.restoreCheckpoint(t.checkpoint());
    feed(restored,a,13,17);
    expect(live(restored)).toHaveLength(0);
    expect(ended(restored)[0]).toMatchObject({id:701,endReason:"kill_confirmed"});
  });
});

it("a resumed raid keeps its identity even when its original slot has been reused",()=>{
  const t=make({rosterCap:40,maxConcurrentRaids:3});
  const a=group("A",40),b=group("B",40),c=group("C",40);
  feed(t,a,1,10);feed(t,[...a,...b],11,17);feed(t,b,18,24);
  expect(ended(t).some(s=>s.id===701)).toBe(true);
  feed(t,[...b,...c],25,30);
  const obs=t.observe(view([...a,...b,...c],31));
  expect(obs.events).toContainEqual(expect.objectContaining({kind:"resumed",number:701}));
  expect(live(t).map(s=>s.id).sort()).toEqual([701,702,703]);
  expect(live(t).reduce((total,s)=>total+s.players,0)).toBe(120);
});
it("confirms the specified pending raid, not just the first pending slot",()=>{
  const t=make({rosterCap:40});
  const a=group("A",40),b=group("B",40);
  feed(t,a,1,10);feed(t,[...a,...b],11,17);feed(t,[],18,19);
  const target=t.pendingClears().find(p=>p.number===702);
  expect(target).toBeDefined();
  expect(t.confirmClearNow(T0+19*M,target)?.number).toBe(702);
  expect(t.pendingClear()?.number).toBe(701);
  expect(ended(t).find(s=>s.id===702)?.endReason).toBe("kill_confirmed");
});

describe("Chronicle-first raid completion", () => {
  it("ends an active raid on a unique matching log and does not train on guessed kill time", () => {
    const t = make(BWL);
    const players = group("Nightfall",40);
    feed(t, players, 1, 8);
    const key=live(t)[0]!.key;
    expect(t.confirmChronicleKill("Nightfall0",T0+2*M,T0+8*M)).toBe(true);
    expect(live(t)).toHaveLength(0);
    expect(ended(t)[0]).toMatchObject({key,endReason:"kill_confirmed",clearSource:"chronicle_kill",trusted:false});
    expect(t.confirmChronicleKill("Nightfall0",T0+2*M,T0+9*M)).toBe(false);
    feed(t,players,9,10);
    expect(live(t)).toHaveLength(0);
  });
  it("upgrades a roster-departure fallback without changing the raid identity or completion timestamp", () => {
    const t=make(); const players=group("Nightfall",25);
    feed(t,players,1,8); feed(t,[],9,15);
    const old=ended(t)[0]!;
    expect(old.endReason).toBe("departed");
    expect(t.confirmChronicleKill("another-player",T0+2*M,T0+16*M)).toBe(false);
    expect(t.confirmChronicleKill("Nightfall0",T0-10*M,T0+16*M)).toBe(false);
    expect(t.confirmChronicleKill("NIGHTFALL0",T0+2*M,T0+16*M)).toBe(true);
    expect(ended(t)[0]).toMatchObject({key:old.key,confirmedAt:old.confirmedAt,endedAt:old.endedAt,endReason:"kill_confirmed",clearSource:"chronicle_kill"});
    expect(t.confirmChronicleKill("Nightfall0",T0+2*M,T0+17*M)).toBe(false);
  });
});
