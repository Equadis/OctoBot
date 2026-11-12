import { describe, expect, it } from "vitest";
import { latencySpread, type PingSample } from "./realm-health.js";

const at = (ms: number, t: number): PingSample => ({ ms, at: t });

describe("latencySpread", () => {
  it("is max - min over the samples in the window", () => {
    const samples = [at(180, 1_000), at(240, 1_050), at(190, 1_100)];
    expect(latencySpread(samples, 1_100, 10_000)).toBe(60);
  });

  it("ignores samples outside the window", () => {
    const samples = [at(900, 0), at(180, 60_000), at(200, 61_000)];
    expect(latencySpread(samples, 61_000, 5_000)).toBe(20); // the 900ms sample is too old
  });

  it("is null when there are no samples in the window", () => {
    expect(latencySpread([at(180, 0)], 1_000_000, 5_000)).toBeNull();
    expect(latencySpread([], 1_000, 5_000)).toBeNull();
  });
});
