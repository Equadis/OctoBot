import { describe, expect, it } from "vitest";
import { evaluateTimer, improvedEstimate, typicalClearText } from "./timer-eval.js";

const M = 60_000; // one minute in ms

describe("typicalClearText", () => {
  it("shows the middle-half range (p25-p75), rounded to 5m, once enough clears exist", () => {
    const samples = [20.1, 23.5, 24.2, 27.7, 31.7, 33.6, 37.1, 38.5, 39.9, 46.9, 47, 48.2, 65.3, 71.5].map((m) => m * M);
    expect(typicalClearText(samples, 45 * M)).toBe("30-45m"); // p25 28.7->30, p75 47->45
  });

  it("falls back to the config estimate as a single ~Nm below the sample floor", () => {
    expect(typicalClearText([38 * M, 40 * M], 45 * M)).toBe("~45m");
  });

  it("never returns a zero-width range", () => {
    const flat = [30 * M, 30 * M, 30 * M, 30 * M, 30 * M, 30 * M];
    expect(typicalClearText(flat, 45 * M)).toBe("30-35m");
  });
});

describe("evaluateTimer", () => {
  it("reports no estimate and nothing scored below the sample floor", () => {
    const evaln = evaluateTimer([40 * M, 50 * M], 5);
    expect(evaln.samples).toBe(2);
    expect(evaln.estimateMs).toBeNull();
    expect(evaln.evaluated).toBe(0);
    expect(evaln.maeMs).toBeNull();
    expect(evaln.biasMs).toBeNull();
  });

  it("gives the median estimate once the floor is met", () => {
    const evaln = evaluateTimer([40 * M, 45 * M, 50 * M], 3);
    expect(evaln.estimateMs).toBe(45 * M);
  });

  it("scores a perfectly steady series as zero error and zero bias", () => {
    const evaln = evaluateTimer(Array(10).fill(45 * M), 3);
    expect(evaln.evaluated).toBe(7); // indices 3..9
    expect(evaln.maeMs).toBe(0);
    expect(evaln.biasMs).toBe(0);
    expect(evaln.p90ErrorMs).toBe(0);
  });

  it("reports positive bias when raids run longer than the prior median predicted", () => {
    // Steady 40m, then a run of 60m clears — actual exceeds the predicted median.
    const series = [40 * M, 40 * M, 40 * M, 60 * M, 60 * M, 60 * M];
    const evaln = evaluateTimer(series, 3);
    expect(evaln.biasMs).not.toBeNull();
    expect(evaln.biasMs!).toBeGreaterThan(0);
    expect(evaln.maeMs!).toBeGreaterThan(0);
  });

  it("reports negative bias when raids run shorter than predicted (the worse miss)", () => {
    const series = [60 * M, 60 * M, 60 * M, 40 * M, 40 * M, 40 * M];
    const evaln = evaluateTimer(series, 3);
    expect(evaln.biasMs!).toBeLessThan(0);
  });

  it("computes MAE from the honest expanding-window prediction", () => {
    // priors before index 3 are [40,40,40] → predicted 40; actual 46 → error 6m.
    // Only one scored point (minSamples 3, series length 4).
    const evaln = evaluateTimer([40 * M, 40 * M, 40 * M, 46 * M], 3);
    expect(evaln.evaluated).toBe(1);
    expect(evaln.maeMs).toBe(6 * M);
    expect(evaln.biasMs).toBe(6 * M);
  });

  it("exposes the improved estimate, which equals the median for a steady series", () => {
    const evaln = evaluateTimer(Array(10).fill(45 * M), 3);
    expect(evaln.improvedEstimateMs).toBe(45 * M); // no bias to correct
  });
});

describe("improvedEstimate", () => {
  it("returns null below the sample floor, like the plain median", () => {
    expect(improvedEstimate([40 * M, 50 * M], 5)).toBeNull();
  });

  it("equals the median when the predictor has been unbiased", () => {
    expect(improvedEstimate(Array(10).fill(45 * M), 3)).toBe(45 * M);
  });

  it("nudges the estimate up by a modest, unclamped positive bias", () => {
    // base median 43m; median residual +6m; cap is 43*0.15≈6.45m, so +6m applies whole.
    expect(improvedEstimate([40 * M, 40 * M, 40 * M, 46 * M, 46 * M, 46 * M], 3)).toBe(49 * M);
  });

  it("caps a large predict-LONGER correction tightly (+15% of the base)", () => {
    // base median 40m, median residual +60m → clamped to +40*0.15 = +6m → 46m.
    const series = [40 * M, 40 * M, 40 * M, 40 * M, 40 * M, 100 * M, 100 * M, 100 * M];
    expect(improvedEstimate(series, 3)).toBe(46 * M);
  });

  it("allows a larger predict-SHORTER correction (−25% of the base), the safe direction", () => {
    // base median 100m, median residual −60m → clamped to −100*0.25 = −25m → 75m.
    const series = [100 * M, 100 * M, 100 * M, 100 * M, 100 * M, 40 * M, 40 * M, 40 * M];
    expect(improvedEstimate(series, 3)).toBe(75 * M);
  });
});
