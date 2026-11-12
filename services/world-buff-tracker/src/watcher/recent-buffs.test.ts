import { describe, expect, it } from "vitest";
import { RecentBuffs } from "./recent-buffs.js";

describe("RecentBuffs", () => {
  it("treats the first report for a faction as fresh", () => {
    const recent = new RecentBuffs(300_000);
    expect(recent.fresh("horde", 1_000)).toBe(true);
  });

  it("drops a duplicate report within the window (a second city bot hearing the same yell)", () => {
    const recent = new RecentBuffs(300_000);
    expect(recent.fresh("horde", 1_000)).toBe(true);
    expect(recent.fresh("horde", 3_500)).toBe(false); // 2.5s later — same yell, ignore
    expect(recent.fresh("horde", 60_000)).toBe(false); // still inside the 5m window
  });

  it("accepts a genuine re-drop once the window has passed", () => {
    const recent = new RecentBuffs(300_000);
    expect(recent.fresh("horde", 1_000)).toBe(true);
    expect(recent.fresh("horde", 1_000 + 300_000)).toBe(true); // window elapsed -> a new drop
  });

  it("tracks each faction independently", () => {
    const recent = new RecentBuffs(300_000);
    expect(recent.fresh("horde", 1_000)).toBe(true);
    expect(recent.fresh("alliance", 1_500)).toBe(true); // different side, not a duplicate
    expect(recent.fresh("horde", 2_000)).toBe(false);
  });
});
