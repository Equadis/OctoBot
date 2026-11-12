import { describe, expect, it } from "vitest";
import { DownTracker } from "./down-tracker.js";

describe("DownTracker", () => {
  it("alerts once, only on the failure that crosses the threshold", () => {
    const d = new DownTracker(3);
    expect(d.fail()).toBe(false); // 1
    expect(d.fail()).toBe(false); // 2
    expect(d.fail()).toBe(true); //  3 — crosses
    expect(d.fail()).toBe(false); // 4 — latched, no repeat
    expect(d.failures).toBe(4);
  });

  it("recover() reports recovery only if it had alerted, and resets the count", () => {
    const d = new DownTracker(2);
    expect(d.recover()).toBe(false); // never failed → nothing to recover
    d.fail();
    expect(d.recover()).toBe(false); // one failure, below threshold → no alert was sent
    expect(d.failures).toBe(0);
  });

  it("announces recovery once after an alerted outage, then re-arms for the next", () => {
    const d = new DownTracker(2);
    d.fail();
    expect(d.fail()).toBe(true); // alerted
    expect(d.recover()).toBe(true); // recovered → announce once
    expect(d.recover()).toBe(false); // already recovered → quiet
    // A fresh outage alerts again.
    d.fail();
    expect(d.fail()).toBe(true);
  });

  it("treats a threshold below 1 as 1 (alerts on the first failure)", () => {
    const d = new DownTracker(0);
    expect(d.fail()).toBe(true);
  });
});
