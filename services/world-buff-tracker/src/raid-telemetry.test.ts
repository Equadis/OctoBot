import { describe, expect, it } from "vitest";
import type { WhoPlayer } from "./protocol/who.js";
import { RaidTelemetry } from "./raid-telemetry.js";
import { RaidTracker } from "./watcher/raid-tracker.js";

const M = 60_000;
const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);
const logger = { debug() {}, info() {}, warn() {}, error() {} } as never;
const group = (guild: string, n: number): WhoPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ name: `Secret${guild}${i}`, guild, level: 60, classId: 1, raceId: 1, areaId: 2159 }));
const players = (guild: string, n: number): WhoPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ name: `Secret${guild}${i}`, guild, level: 60, classId: 1, raceId: 1, areaId: 2159 }));
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(ok = true) {
  const sent: Record<string, unknown>[] = [];
  let clock = T0;
  const state = { ok };
  const telemetry = new RaidTelemetry({
    send: async (body) => {
      if (!state.ok) throw new Error("network down");
      sent.push(body);
      return true;
    },
    realm: "N'Zoth",
    account: "bufftracker",
    logger,
    now: () => clock,
  });
  let n = 700;
  const tracker = new RaidTracker({ minRaidSize: 15, grouping: "auto", clearSize: 5, clearSustainedMs: 5 * M, nextRaidNumber: () => ++n });
  const step = async (present: WhoPlayer[], min: number) => {
    clock = T0 + min * M;
    tracker.observe({ present, complete: true, at: clock });
    telemetry.report("onyxia", [{ label: "lair", sessions: tracker.sessions() }], { formAt: 15, floor: 15 });
    await settle();
  };
  return { sent, step, state, tracker };
}

describe("RaidTelemetry", () => {
  it("publishes the authoritative id and formation time, and never a character name", async () => {
    const { sent, step } = setup();
    for (let m = 1; m <= 5; m += 1) await step(players("Nightfall", 25), m);
    const snap = sent.find((e) => e.type === "raid_sessions" && (e.sessions as unknown[]).length > 0);
    expect(snap).toBeTruthy();
    const session = (snap?.sessions as Record<string, unknown>[])[0];
    expect(session).toMatchObject({ id: 701, status: "in_progress", formedAt: new Date(T0 + M).toISOString() });
    expect(JSON.stringify(sent)).not.toContain("Secret");
    expect(snap?.schema).toBe(1);
  });
  it("sends on change and on heartbeat only, not every poll", async () => {
    const { sent, step } = setup();
    for (let m = 1; m <= 10; m += 1) await step(players("Nightfall", 25), m);
    const count = sent.filter((e) => e.type === "raid_sessions").length;
    expect(count).toBeLessThan(10);
    expect(count).toBeGreaterThanOrEqual(2);
  });
  it("retries after a network outage without inventing a new raid", async () => {
    const { sent, step, state } = setup();
    for (let m = 1; m <= 3; m += 1) await step(players("Nightfall", 25), m);
    state.ok = false;
    for (let m = 4; m <= 8; m += 1) await step(players("Nightfall", 25), m);
    state.ok = true;
    await step(players("Nightfall", 25), 9);
    const ids = sent.filter((e) => e.type === "raid_sessions").flatMap((e) => (e.sessions as { id: number }[]).map((s) => s.id));
    expect(new Set(ids)).toEqual(new Set([701]));
    expect(sent[sent.length - 1]?.seq).toBeGreaterThan(0);
  });
  it("sends one raid_session_ended per ended session with a duration", async () => {
    const { sent, step } = setup();
    for (let m = 1; m <= 6; m += 1) await step(players("Nightfall", 25), m);
    for (let m = 7; m <= 16; m += 1) await step([], m);
    const ended = sent.filter((e) => e.type === "raid_session_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({ zone: "onyxia", session: { id: 701, endReason: "departed", clearSource: "roster_departure" } });
    expect(typeof ended[0]?.durationMs).toBe("number");
  });
});

// ---- Shared fixtures: the tracker's real wire output, replayed by the Worker and website tests so all three
// layers are compared on identical data. Regenerate with UPDATE_FIXTURES=1; otherwise the committed file must match.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { RaidTrackerOptions } from "./watcher/raid-tracker.js";

const FIXTURE = new URL("../../../cloudflare/octometrics/tests/fixtures/tracker-wire.json", import.meta.url);
const pugGroup = (tag: string, n: number): WhoPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ name: `${tag}${i}`, guild: `Solo-${tag}${i}`, level: 60, classId: 1, raceId: 1, areaId: 2159 }));

async function scenario(
  zone: "onyxia" | "bwl",
  options: Partial<RaidTrackerOptions>,
  firstNumber: number,
  script: (feed: (present: WhoPlayer[], min: number) => Promise<void>) => Promise<void>,
  endMin: number,
) {
  const sent: Record<string, unknown>[] = [];
  let clock = T0;
  const telemetry = new RaidTelemetry({ send: async (b) => (sent.push(b), true), realm: "N'Zoth", account: "bufftracker", logger, now: () => clock });
  let n = firstNumber - 1;
  const base: RaidTrackerOptions = { minRaidSize: 15, grouping: "auto", clearSize: 5, clearSustainedMs: 5 * M, rosterCap: 30, maxConcurrentRaids: 2, nextRaidNumber: () => ++n };
  const tracker = new RaidTracker({ ...base, ...options });
  const thresholds = { formAt: options.minRaidSize ?? 15, floor: options.minRaidSize ?? 15 };
  const feed = async (present: WhoPlayer[], min: number) => {
    clock = T0 + min * M;
    tracker.observe({ present, complete: true, at: clock });
    telemetry.report(zone, [{ label: zone, sessions: tracker.sessions() }], thresholds);
    await settle();
  };
  await script(feed);
  const at = T0 + endMin * M;
  const sessions = tracker.sessions().sessions;
  return {
    zone,
    t0: new Date(T0).toISOString(),
    at: new Date(at).toISOString(),
    events: sent,
    expected: {
      live: sessions.filter((s) => s.status !== "ended").map((s) => ({ id: s.id, label: s.guild.label, confidence: s.confidence, elapsedMs: at - s.formedAt })),
      endedIds: sessions.filter((s) => s.status === "ended").map((s) => s.id),
      oldestElapsedMs: tracker.raidElapsedMs(at),
    },
  };
}

describe("shared tracker -> Worker -> website fixtures", () => {
  it("match the committed fixture file", async () => {
    const a = group("Nightfall", 25);
    const b = group("Stormguard", 20);
    const fixtures = {
      "onyxia-two-raids": await scenario("onyxia", {}, 702, async (feed) => {
        for (let m = 1; m <= 11; m += 1) await feed(a, m);
        for (let m = 12; m <= 24; m += 1) await feed([...a, ...b], m);
      }, 24),
      "bwl-single": await scenario("bwl", { minRaidSize: 20, rosterCap: 45 }, 33, async (feed) => {
        const raid = pugGroup("w", 38);
        for (let m = 1; m <= 50; m += 1) await feed(raid, m);
      }, 50),
      "onyxia-back-to-back": await scenario("onyxia", {}, 701, async (feed) => {
        for (let m = 1; m <= 6; m += 1) await feed(group("Alpha", 25), m);
        for (let m = 7; m <= 20; m += 1) await feed(group("Beta", 25), m);
      }, 20),
    };
    if (process.env.UPDATE_FIXTURES === "1") {
      mkdirSync(new URL("./", FIXTURE), { recursive: true });
      writeFileSync(FIXTURE, JSON.stringify(fixtures, null, 1) + "\n");
    }
    expect(existsSync(FIXTURE)).toBe(true);
    expect(JSON.parse(JSON.stringify(fixtures))).toEqual(JSON.parse(readFileSync(FIXTURE, "utf8")));
    expect(fixtures["onyxia-two-raids"].expected.live.map((s) => s.id)).toEqual([702, 703]);
    expect(fixtures["bwl-single"].expected.live[0]?.id).toBe(33);
  });
});
