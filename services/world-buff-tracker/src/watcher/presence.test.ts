import { describe, expect, it } from "vitest";
import { type Departure, PresenceTracker } from "./presence.js";

const MIN = 60_000;
const seq = (n: number, prefix = "p") => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe("PresenceTracker — core", () => {
  it("treats the first poll as a baseline: arrivals are not confidently observed", () => {
    const c = new PresenceTracker().observe(["A", "B"], 0, true);
    expect(c.arrivals.every((a) => !a.arrivalObserved)).toBe(true);
  });

  it("witnesses a genuine arrival on the next complete poll", () => {
    const p = new PresenceTracker();
    p.observe(["A"], 0, true);
    const c = p.observe(["A", "B"], MIN, true);
    expect(c.arrivals).toEqual([{ name: "B", arrivalObserved: true }]);
  });

  it("reports a confident departure with a real, usable duration", () => {
    const p = new PresenceTracker();
    p.observe(["A"], 0, true); // A baseline
    p.observe(["A", "B"], MIN, true); // B observed arrival at 1m
    p.observe(["A", "B"], 4 * MIN, true); // B present, lastSeen 4m
    p.observe(["A"], 5 * MIN, true); // B missing 1m
    const gone = p.observe(["A"], 7 * MIN, true); // B absent 3m > grace
    const b = gone.departures.find((d) => d.name === "B");
    expect(b).toMatchObject({ confident: true, stayKnown: true });
    expect(b?.stayedMs).toBe(3 * MIN); // firstSeen 1m, lastSeen 4m
  });
});

describe("PresenceTracker — HOLDS against the attacks that broke the old census", () => {
  it("a truncated view (at the cap) never evicts hidden players → no phantom raid-left", () => {
    const p = new PresenceTracker({ graceMs: 120_000, hardTimeoutMs: 15 * MIN });
    const all = seq(55);
    p.observe(all.slice(0, 49), 0, false); // 49 == cap → complete=false
    let confident = 0;
    for (let k = 1; k <= 5; k++) {
      confident += p.observe(all.slice(6, 55), k * MIN, false).departures.filter((d) => d.confident).length;
    }
    expect(confident).toBe(0); // p0..p5 hidden by the cap, not "departed"
  });

  it("arrivals during truncation are not confident → durations can't be corrupted", () => {
    const p = new PresenceTracker();
    const all = seq(55);
    p.observe(all.slice(0, 49), 0, false);
    const c = p.observe(all.slice(6, 55), MIN, false); // p49..p54 newly visible
    expect(c.arrivals.length).toBeGreaterThan(0);
    expect(c.arrivals.every((a) => !a.arrivalObserved)).toBe(true);
  });

  it("players present at baseline depart with stayKnown=false (excluded from stats)", () => {
    const p = new PresenceTracker();
    const raid = seq(15, "r");
    p.observe(raid, 0, true); // baseline
    p.observe(raid, MIN, true);
    p.observe([], 2 * MIN, true);
    const gone = p.observe([], 4 * MIN, true); // absent 3m > grace
    expect(gone.departures).toHaveLength(15);
    expect(gone.departures.every((d) => !d.stayKnown)).toBe(true);
  });

  it("a single flaky short /who does not evict a present raid (grace bridges it)", () => {
    const p = new PresenceTracker();
    const raid = seq(25, "r");
    p.observe(raid, 0, true);
    p.observe(raid, MIN, true);
    p.observe(raid.slice(0, 3), 2 * MIN, true); // flaky poll: only 3 returned
    expect(p.observe(raid, 3 * MIN, true).departures).toEqual([]); // all back, nobody evicted
  });
});

describe("PresenceTracker — a real leave out of a truncated lair is still caught", () => {
  it("detects the departure (delayed) once the view drops below the cap", () => {
    const p = new PresenceTracker({ graceMs: 120_000 });
    const big = seq(50);
    p.observe(big.slice(0, 49), 0, false); // truncated
    p.observe(big.slice(0, 49), MIN, false); // still truncated
    const remain = big.slice(0, 30); // ~19 of the visible left → 30, below cap (complete)
    p.observe(remain, 2 * MIN, true); // first complete: transition, not trustworthy yet
    p.observe(remain, 3 * MIN, true);
    const gone = p.observe(remain, 5 * MIN, true); // absent > grace on complete views
    expect(gone.departures.filter((d) => d.confident).length).toBeGreaterThan(0);
  });
});

describe("PresenceTracker — bounded under sustained truncation", () => {
  it("evicts absent players at the hard timeout even while truncated, but low-confidence", () => {
    const p = new PresenceTracker({ graceMs: 2 * MIN, hardTimeoutMs: 5 * MIN });
    p.observe(["A", "B"], 0, false); // truncated view
    const evicted: Departure[] = [];
    for (let k = 1; k <= 7; k++) {
      for (const d of p.observe(["B"], k * MIN, false).departures) evicted.push(d);
    }
    expect(evicted.some((d) => d.name === "A")).toBe(true); // A bounded out
    expect(evicted.every((d) => !d.confident)).toBe(true); // never a confident (raid) departure
    expect(p.tracked).toBe(1); // only B remains
  });
});
