import { describe, expect, it } from "vitest";
import { formatDeathAlert } from "./death-alert.js";
import type { DeathAccount } from "./death-report.js";

const burned: DeathAccount = {
  verdict: "killing blow: Infernal (npc) formerly controlled by Ganker (player) hits us for 28 with spell 20153",
  timeline: [
    "  -2.0s  Infernal (npc) formerly controlled by Ganker (player) hits us for 28 with spell 20153",
    "  -1.9s  health 1",
    "   0.0s  Infernal (npc) formerly controlled by Ganker (player) hits us for 28 with spell 20153",
    "   0.0s  health 0 — dead",
  ],
  culprit: { guid: 0x555n, name: "Ganker" },
};

describe("formatDeathAlert", () => {
  it("leads with the killer and its owner, then the lead-up in a code block", () => {
    expect(formatDeathAlert("Onyxiabuffog", burned, 2_000)).toBe(
      [
        "**Onyxiabuffog** died — killing blow: Infernal (npc) formerly controlled by Ganker (player) hits us for 28 with spell 20153.",
        "```",
        ...burned.timeline,
        "```",
      ].join("\n"),
    );
  });

  it("drops the oldest lines to fit, and says how many are left to the log", () => {
    const full = formatDeathAlert("Onyxiabuffog", burned, 2_000);
    const alert = formatDeathAlert("Onyxiabuffog", burned, full.length - 1);
    expect(alert.length).toBeLessThanOrEqual(full.length - 1);
    expect(alert).toContain("… 1 earlier line in the log");
    expect(alert).not.toContain("  -2.0s");
    expect(alert.endsWith("   0.0s  health 0 — dead\n```")).toBe(true);
  });

  it("keeps a long timeline within Discord's limit", () => {
    const busy: DeathAccount = {
      verdict: burned.verdict,
      timeline: Array.from({ length: 200 }, (_, i) => `${(-i / 10).toFixed(1).padStart(6)}s  some player says: "wts"`),
      culprit: burned.culprit,
    };
    const alert = formatDeathAlert("Onyxiabuffog", busy, 1_900);
    expect(alert.length).toBeLessThanOrEqual(1_900);
    expect(alert.startsWith("**Onyxiabuffog** died — killing blow:")).toBe(true);
    expect(alert).toMatch(/… \d+ earlier lines in the log/);
    expect(alert.endsWith("```")).toBe(true);
  });

  it("falls back to the headline alone when not even one line fits", () => {
    const alert = formatDeathAlert("Onyxiabuffog", burned, 140);
    expect(alert).toBe(
      "**Onyxiabuffog** died — killing blow: Infernal (npc) formerly controlled by Ganker (player) hits us for 28 with spell 20153.",
    );
  });

  it("stops quoted chat from closing the code block", () => {
    const taunted: DeathAccount = {
      verdict: burned.verdict,
      timeline: ['   0.0s  Ganker (player) says: "```@everyone```"'],
      culprit: burned.culprit,
    };
    expect(formatDeathAlert("Onyxiabuffog", taunted, 2_000)).toContain(`says: "'''@everyone'''"`);
  });
});
