import { describe, expect, it } from "vitest";
import { formatHeartbeat, type HeartbeatStats } from "./heartbeat.js";

const base: HeartbeatStats = {
  subscribers: 0,
  samples: 0,
  learnedMedianMs: null,
  estimateMs: 45 * 60_000,
  minSamples: 15,
  buffs: [],
};

describe("formatHeartbeat", () => {
  it("shows the estimate and learn-progress before enough samples", () => {
    const line = formatHeartbeat({ ...base, subscribers: 3, samples: 7 });
    expect(line).toBe("monitor: 3 subs; raid timer 45m estimate (7/15 to learn); buffs none tracked");
  });

  it("switches to the learned median once it is available", () => {
    const line = formatHeartbeat({
      ...base,
      subscribers: 12,
      samples: 18,
      learnedMedianMs: 43 * 60_000,
    });
    expect(line).toContain("learned median 43m (18 samples)");
  });

  it("shows the bias-corrected estimate the timer uses when it differs from the median", () => {
    const line = formatHeartbeat({
      ...base,
      samples: 18,
      learnedMedianMs: 43 * 60_000,
      improvedMs: 46 * 60_000,
    });
    expect(line).toContain("learned median 43m -> uses 46m (18 samples)");
  });

  it("omits the '-> uses' clause when the correction changed nothing", () => {
    const line = formatHeartbeat({
      ...base,
      samples: 18,
      learnedMedianMs: 43 * 60_000,
      improvedMs: 43 * 60_000,
    });
    expect(line).toContain("learned median 43m (18 samples)");
    expect(line).not.toContain("-> uses");
  });

  it("shows the lifetime user total beside active subs when provided", () => {
    const line = formatHeartbeat({ ...base, subscribers: 177, totalUsers: 210 });
    expect(line).toContain("177 subs (210 all-time)");
  });

  it("shows the lifetime guild-invite total when provided", () => {
    const line = formatHeartbeat({ ...base, subscribers: 177, totalUsers: 210, totalInvites: 45 });
    expect(line).toContain("177 subs (210 all-time)");
    expect(line).toContain("45 invites all-time");
  });

  it("shows active guildies in parentheses beside the invite total", () => {
    const line = formatHeartbeat({ ...base, totalInvites: 45, activeGuildies: 12 });
    expect(line).toContain("45 invites all-time (12 in guild)");
  });

  it("reports each faction's last drop as minutes-ago or none-yet", () => {
    const line = formatHeartbeat({
      ...base,
      buffs: [
        { faction: "alliance", sinceLastDropMs: 74 * 60_000 },
        { faction: "horde", sinceLastDropMs: null },
      ],
    });
    expect(line).toContain("alliance last drop 74m ago, horde no drop yet");
  });

  it("rounds partial minutes rather than truncating", () => {
    const line = formatHeartbeat({ ...base, buffs: [{ faction: "horde", sinceLastDropMs: 89_000 }] });
    expect(line).toContain("horde last drop 1m ago");
  });

  it("appends the timer accuracy with a signed bias when clears have been scored", () => {
    const line = formatHeartbeat({
      ...base,
      samples: 20,
      learnedMedianMs: 45 * 60_000,
      accuracy: { evaluated: 15, maeMs: 6 * 60_000, biasMs: 2 * 60_000 },
    });
    expect(line).toContain("accuracy MAE 6m bias +2m over 15");
  });

  it("shows a negative bias with a minus sign", () => {
    const line = formatHeartbeat({
      ...base,
      accuracy: { evaluated: 9, maeMs: 4 * 60_000, biasMs: -3 * 60_000 },
    });
    expect(line).toContain("bias -3m");
  });

  it("omits the accuracy segment when nothing has been scored yet", () => {
    expect(formatHeartbeat({ ...base, accuracy: null })).not.toContain("accuracy");
    expect(formatHeartbeat({ ...base, accuracy: { evaluated: 0, maeMs: 0, biasMs: 0 } })).not.toContain("accuracy");
  });

  it("logs another lair's timer after Onyxia's, under its own name", () => {
    const line = formatHeartbeat({
      ...base,
      samples: 18,
      learnedMedianMs: 43 * 60_000,
      buffs: [{ faction: "horde", sinceLastDropMs: null }],
      otherTimers: [
        { name: "BWL", samples: 3, learnedMedianMs: null, estimateMs: 150 * 60_000, minSamples: 10 },
      ],
    });
    expect(line).toBe(
      "monitor: 0 subs; raid timer learned median 43m (18 samples); BWL timer 150m estimate (3/10 to learn); buffs horde no drop yet",
    );
  });

  it("gives each lair's timer its own accuracy", () => {
    const line = formatHeartbeat({
      ...base,
      otherTimers: [
        {
          name: "BWL",
          samples: 12,
          learnedMedianMs: 140 * 60_000,
          estimateMs: 150 * 60_000,
          minSamples: 10,
          accuracy: { evaluated: 4, maeMs: 12 * 60_000, biasMs: -5 * 60_000 },
        },
      ],
    });
    expect(line).toContain("BWL timer learned median 140m (12 samples); accuracy MAE 12m bias -5m over 4");
  });
});
