import { describe, expect, it } from "vitest";
import {
  classifyDropOrigin,
  newLairActivity,
  noteLairPoll,
  LAIR_RAID_FLOOR,
  STALE_POLL_MS,
  POLL_GAP_BLIND_MS,
  type LairActivity,
} from "./drop-origin.js";

const MIN = 60_000;
const FRESH = 40 * MIN;
const opts = { freshWindowMs: FRESH };

/** Poll continuously every 60s over [fromAt, toAt] (no blind gaps), present given by `present(t)`. */
function fillPolls(a: LairActivity, fromAt: number, toAt: number, present: (t: number) => number): void {
  for (let t = fromAt; t <= toAt; t += MIN) noteLairPoll(a, present(t), t);
}

describe("noteLairPoll", () => {
  it("stamps lastStrengthAt only when the lair is at raid strength", () => {
    const a = newLairActivity();
    noteLairPoll(a, LAIR_RAID_FLOOR - 1, 1000);
    expect(a.lastStrengthAt).toBeNull();
    expect(a.lastPollAt).toBe(1000);
    noteLairPoll(a, LAIR_RAID_FLOOR, 2000);
    expect(a.lastStrengthAt).toBe(2000);
  });

  it("marks a blind gap when consecutive polls are further apart than the blackout threshold", () => {
    const a = newLairActivity();
    noteLairPoll(a, 0, 0);
    noteLairPoll(a, 0, POLL_GAP_BLIND_MS + 1); // a gap -> blind
    expect(a.lastBlackoutEndAt).toBe(POLL_GAP_BLIND_MS + 1);
  });

  it("does not mark a blind gap for normal ~60s polling", () => {
    const a = newLairActivity();
    noteLairPoll(a, 0, 0);
    noteLairPoll(a, 0, MIN);
    expect(a.lastBlackoutEndAt).toBeNull();
  });
});

describe("classifyDropOrigin", () => {
  const now = 10_000_000;

  it("fresh: a raid was in the lair within the window", () => {
    const a = newLairActivity();
    // Continuous polling: a raid until ~5m ago, empty since, up to the drop.
    fillPolls(a, now - 60 * MIN, now - MIN, (t) => (t <= now - 5 * MIN ? 30 : 0));
    expect(classifyDropOrigin(now, a, opts)).toBe("fresh");
  });

  it("fresh at the boundary, saved just past it (40m)", () => {
    const a = newLairActivity();
    fillPolls(a, now - 60 * MIN, now - MIN, (t) => (t === now - FRESH ? 30 : 0)); // strength exactly 40m ago
    expect(classifyDropOrigin(now, a, opts)).toBe("fresh"); // <= window

    const a2 = newLairActivity();
    fillPolls(a2, now - 60 * MIN, now - MIN, (t) => (t === now - FRESH - MIN ? 30 : 0)); // 41m ago
    expect(classifyDropOrigin(now, a2, opts)).toBe("saved"); // past the window
  });

  it("saved: full coverage, no raid for well over the window (the empty-lair drop)", () => {
    const a = newLairActivity();
    for (let t = 90; t >= 1; t--) noteLairPoll(a, t <= 2 ? 1 : 0, now - t * MIN); // 90m of an empty lair
    expect(classifyDropOrigin(now, a, opts)).toBe("saved");
  });

  it("unknown: the watcher has not polled recently (stale census)", () => {
    const a = newLairActivity();
    fillPolls(a, now - STALE_POLL_MS - 4 * MIN, now - STALE_POLL_MS - MIN, () => 0); // last poll is stale
    expect(classifyDropOrigin(now, a, opts)).toBe("unknown");
  });

  it("unknown: never polled at all", () => {
    expect(classifyDropOrigin(now, newLairActivity(), opts)).toBe("unknown");
  });

  it("unknown: a blackout ended inside the window, so a raid could have been missed", () => {
    const a = newLairActivity();
    noteLairPoll(a, 0, now - (FRESH + 5 * MIN)); // before the gap
    noteLairPoll(a, 0, now - 10 * MIN); // gap of ~35m -> blind, ended 10m ago (inside 40m window)
    noteLairPoll(a, 0, now - MIN);
    expect(classifyDropOrigin(now, a, opts)).toBe("unknown");
  });

  it("blind beats fresh: a pre-blackout raid does not count as a fresh kill after the gap", () => {
    const a = newLairActivity();
    noteLairPoll(a, 30, now - 20 * MIN); // raid at strength 20m ago (would be 'fresh')...
    noteLairPoll(a, 0, now - 5 * MIN); // ...but a 15m gap (blind) ended 5m ago, inside the window
    noteLairPoll(a, 0, now - MIN);
    expect(classifyDropOrigin(now, a, opts)).toBe("unknown");
  });

  it("saved again once the blackout ages out beyond the window", () => {
    const a = newLairActivity();
    noteLairPoll(a, 0, now - (FRESH + 20 * MIN));
    noteLairPoll(a, 0, now - (FRESH + 5 * MIN)); // blind gap ended > 40m ago
    for (let t = 40; t >= 1; t--) noteLairPoll(a, 0, now - t * MIN); // clean empty coverage since
    expect(classifyDropOrigin(now, a, opts)).toBe("saved");
  });
});
