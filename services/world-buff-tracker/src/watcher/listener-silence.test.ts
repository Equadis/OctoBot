import { describe, expect, it } from "vitest";
import { SilenceWatch } from "./listener-silence.js";

const NOW = Date.parse("2026-09-19T12:00:00Z");
const HOUR = 3_600_000;

describe("SilenceWatch", () => {
  const options = { silenceMs: 6 * HOUR, graceMs: 10 * 60_000 };

  it("stays quiet while the listener keeps hearing the city", () => {
    const watch = new SilenceWatch(NOW, options);
    for (let h = 1; h <= 20; h += 1) {
      watch.heard(NOW + h * HOUR);
      expect(watch.shouldReport(NOW + h * HOUR + HOUR)).toBe(false);
    }
  });

  it("reports a listener that has heard nothing at all", () => {
    // The real case: connected, whispering, yelling on schedule — and stone deaf.
    const watch = new SilenceWatch(NOW, options);
    expect(watch.shouldReport(NOW + 5 * HOUR)).toBe(false);
    expect(watch.shouldReport(NOW + 7 * HOUR)).toBe(true);
  });

  it("gives a fresh login its grace before counting silence", () => {
    const watch = new SilenceWatch(NOW, { silenceMs: HOUR, graceMs: 30 * 60_000 });
    expect(watch.shouldReport(NOW + HOUR)).toBe(false);
    expect(watch.shouldReport(NOW + 90 * 60_000 + 1)).toBe(true);
  });

  it("reports once per stretch, not once per check", () => {
    const watch = new SilenceWatch(NOW, options);
    expect(watch.shouldReport(NOW + 7 * HOUR)).toBe(true);
    expect(watch.shouldReport(NOW + 8 * HOUR)).toBe(false);
    expect(watch.shouldReport(NOW + 30 * HOUR)).toBe(false);
  });

  it("re-arms once the listener recovers, so a later silence is reported again", () => {
    const watch = new SilenceWatch(NOW, options);
    expect(watch.shouldReport(NOW + 7 * HOUR)).toBe(true);
    watch.heard(NOW + 8 * HOUR); // moved somewhere it can hear
    expect(watch.shouldReport(NOW + 9 * HOUR)).toBe(false);
    expect(watch.shouldReport(NOW + 15 * HOUR)).toBe(true);
  });

  it("measures the silence for the alert to quote", () => {
    const watch = new SilenceWatch(NOW, { silenceMs: HOUR });
    expect(watch.silentFor(NOW + 3 * HOUR)).toBe(3 * HOUR);
    watch.heard(NOW + 3 * HOUR);
    expect(watch.silentFor(NOW + 4 * HOUR)).toBe(HOUR);
  });

  it("never reports a negative silence when clocks disagree", () => {
    const watch = new SilenceWatch(NOW, { silenceMs: HOUR });
    expect(watch.silentFor(NOW - HOUR)).toBe(0);
  });
});
