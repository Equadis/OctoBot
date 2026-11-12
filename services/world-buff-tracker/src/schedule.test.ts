import { describe, expect, it } from "vitest";
import { jitter } from "./schedule.js";

describe("jitter", () => {
  it("returns the base at the midpoint of the random range", () => {
    expect(jitter(60_000, 0.15, () => 0.5)).toBe(60_000);
  });

  it("reaches the low and high bounds at the extremes", () => {
    expect(jitter(60_000, 0.15, () => 0)).toBe(51_000);
    expect(jitter(60_000, 0.15, () => 1)).toBe(69_000);
  });

  it("stays within [base*(1-ratio), base*(1+ratio)] across many samples", () => {
    for (let i = 0; i < 1000; i += 1) {
      const value = jitter(20_000, 0.15);
      expect(value).toBeGreaterThanOrEqual(17_000);
      expect(value).toBeLessThanOrEqual(23_000);
    }
  });

  it("returns exactly the base when ratio is 0", () => {
    expect(jitter(30_000, 0)).toBe(30_000);
  });

  it("rejects a ratio outside 0..1", () => {
    expect(() => jitter(1000, -0.1)).toThrow(/ratio/);
    expect(() => jitter(1000, 1.5)).toThrow(/ratio/);
  });
});
