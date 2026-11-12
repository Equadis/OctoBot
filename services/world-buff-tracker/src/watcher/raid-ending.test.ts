import { describe, expect, it } from "vitest";
import { raidEndingDue } from "./raid-ending.js";

const M = 60_000;

describe("raidEndingDue", () => {
  const predicted = 38 * M; // learned median
  const lead = 10 * M; // fire ~10m before the predicted clear -> threshold 28m in

  it("does not fire before the lead window opens", () => {
    expect(raidEndingDue(27 * M, predicted, lead)).toBe(false);
  });

  it("fires exactly at the threshold (predicted - lead)", () => {
    expect(raidEndingDue(28 * M, predicted, lead)).toBe(true);
  });

  it("keeps firing past the threshold (a raid running long is still 'about to clear')", () => {
    expect(raidEndingDue(50 * M, predicted, lead)).toBe(true);
  });

  it("a shorter lead pushes the threshold later", () => {
    // 5m lead -> threshold 33m; 30m in is not yet due
    expect(raidEndingDue(30 * M, predicted, 5 * M)).toBe(false);
    expect(raidEndingDue(33 * M, predicted, 5 * M)).toBe(true);
  });

  it("a raid already past its predicted clear is due regardless of lead", () => {
    expect(raidEndingDue(40 * M, predicted, 0)).toBe(true);
  });
});
