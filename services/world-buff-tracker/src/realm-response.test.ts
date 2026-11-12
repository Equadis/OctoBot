import { describe, expect, it } from "vitest";
import {
  BASELINE_TAU_MS,
  DEFAULT_RESPONSE_THRESHOLDS,
  EMPTY_BASELINE,
  classifyResponse,
  foldBaseline,
  type ResponseBaseline,
} from "./realm-response.js";

describe("foldBaseline", () => {
  it("seeds from the first sample", () => {
    expect(foldBaseline(EMPTY_BASELINE, 180, 1_000)).toEqual({ emaMs: 180, samples: 1, updatedAt: 1_000 });
  });

  it("ignores a null median (no pongs) so an outage doesn't skew the line", () => {
    const base: ResponseBaseline = { emaMs: 180, samples: 3, updatedAt: 1_000 };
    expect(foldBaseline(base, null, 999_999)).toBe(base);
  });

  it("barely moves for a fold taken almost immediately (dt ≈ 0)", () => {
    const base: ResponseBaseline = { emaMs: 100, samples: 1, updatedAt: 0 };
    const next = foldBaseline(base, 500, 0, BASELINE_TAU_MS); // dt = 0 -> weight ≈ 0
    expect(next.emaMs).toBeCloseTo(100, 5);
    expect(next.samples).toBe(2);
  });

  it("moves ~63% of the way toward a new level over one tau", () => {
    const base: ResponseBaseline = { emaMs: 100, samples: 1, updatedAt: 0 };
    const next = foldBaseline(base, 200, BASELINE_TAU_MS, BASELINE_TAU_MS); // weight = 1 - e^-1 ≈ 0.632
    expect(next.emaMs).toBeCloseTo(163.2, 1);
  });
});

describe("classifyResponse", () => {
  const warm: ResponseBaseline = { emaMs: 180, samples: 20, updatedAt: 1_000 };

  it("is unknown with no current reading", () => {
    expect(classifyResponse(null, null, warm)).toBe("unknown");
    expect(classifyResponse(180, null, warm)).toBe("unknown");
  });

  it("is unknown until the baseline has warmed up", () => {
    const cold: ResponseBaseline = { emaMs: 180, samples: 2, updatedAt: 1_000 };
    expect(classifyResponse(180, 20, cold)).toBe("unknown");
  });

  it("is steady when the current median is near baseline with low spread", () => {
    expect(classifyResponse(185, 30, warm)).toBe("steady");
  });

  it("is elevated when the median runs well above baseline", () => {
    // 180 * 1.5 = 270; 300 > 270, spread still low
    expect(classifyResponse(300, 40, warm)).toBe("elevated");
  });

  it("is unstable when the spread is large, regardless of level", () => {
    // unstable floor 120; baseline*0.6 = 108, so threshold is 120; 200 > 120
    expect(classifyResponse(185, 200, warm)).toBe("unstable");
  });

  it("reports unstable ahead of elevated when both hold", () => {
    expect(classifyResponse(400, 300, warm)).toBe("unstable");
  });

  it("keeps ordinary jitter on a low baseline from reading as unstable (the floor)", () => {
    const low: ResponseBaseline = { emaMs: 40, samples: 20, updatedAt: 1_000 };
    // baseline*0.6 = 24, but the 120ms floor wins, so a 90ms spread is still steady
    expect(classifyResponse(45, 90, low)).toBe("steady");
  });

  it("uses the provided thresholds", () => {
    const strict = { ...DEFAULT_RESPONSE_THRESHOLDS, elevatedFactor: 1.1 };
    expect(classifyResponse(205, 20, warm, strict)).toBe("elevated"); // 180*1.1 = 198 < 205
  });
});
