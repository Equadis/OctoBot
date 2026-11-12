import { describe, expect, it } from "vitest";
import { isRealmStable, medianLatency, pongLatency, type PingSample, type RealmHealthThresholds } from "./realm-health.js";

const T: RealmHealthThresholds = { windowMs: 180_000, maxMedianMs: 300, maxSpreadMs: 200, minSamples: 3 };
/** Samples at `ms` latency each, spaced 30s apart ending at `now`. */
const series = (now: number, ...ms: number[]): PingSample[] => ms.map((m, i) => ({ ms: m, at: now - (ms.length - 1 - i) * 30_000 }));

describe("pongLatency", () => {
  it("returns the round-trip when the pong matches the outstanding ping", () => {
    expect(pongLatency({ seq: 7, sentAt: 1_000 }, 7, 1_120)).toBe(120);
  });

  it("is null for no pending ping, a mismatched sequence, or a stale/duplicate pong", () => {
    expect(pongLatency(null, 7, 2_000)).toBeNull();
    expect(pongLatency({ seq: 7, sentAt: 1_000 }, 8, 1_120)).toBeNull(); // wrong seq
  });

  it("never reports a negative RTT (clock skew clamps to 0)", () => {
    expect(pongLatency({ seq: 1, sentAt: 2_000 }, 1, 1_900)).toBe(0);
  });
});

describe("isRealmStable", () => {
  const now = 1_000_000;

  it("is true when enough recent samples are reasonable and steady", () => {
    expect(isRealmStable(series(now, 90, 110, 100, 120), now, T)).toBe(true);
  });

  it("is false with too few samples (pongs not flowing yet)", () => {
    expect(isRealmStable(series(now, 100, 110), now, T)).toBe(false); // 2 < minSamples 3
  });

  it("is false when the median is over the reasonable ceiling (laggy)", () => {
    expect(isRealmStable(series(now, 340, 360, 350, 355), now, T)).toBe(false); // median > 300
  });

  it("is false when the spread is too wide (spiking, not steady)", () => {
    expect(isRealmStable(series(now, 80, 500, 90, 100), now, T)).toBe(false); // spread 420 > 200
  });

  it("ignores samples older than the window (stale pre-outage pings don't count)", () => {
    const stale: PingSample[] = [
      { ms: 100, at: now - 10 * 60_000 }, // 10 min old — outside the 3-min window
      { ms: 100, at: now - 9 * 60_000 },
      { ms: 100, at: now - 8 * 60_000 },
      { ms: 100, at: now - 20_000 }, // only one recent sample
    ];
    expect(isRealmStable(stale, now, T)).toBe(false); // 1 recent < minSamples
  });

  it("passes right at the ceilings (median == max, spread == max)", () => {
    // three samples 100..300 -> median 300 (== maxMedianMs), spread 200 (== maxSpreadMs)
    expect(isRealmStable(series(now, 100, 300, 300), now, T)).toBe(true);
  });
});

describe("medianLatency", () => {
  it("returns the median of the recent samples, or null when none are recent", () => {
    const now = 500_000;
    expect(medianLatency(series(now, 80, 120, 100), now, 180_000)).toBe(100);
    expect(medianLatency([{ ms: 100, at: now - 10 * 60_000 }], now, 180_000)).toBeNull();
  });
});
