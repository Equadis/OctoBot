import { describe, expect, it } from "vitest";
import type { WhoPlayer } from "../protocol/who.js";
import { clearedRaidEvent, dominantGuild } from "./raid-events.js";

const AREA = 2159;

/** `count` players of one `guild`, named `<prefix><i>` so rosters are distinguishable. */
function guildCrowd(guild: string, count: number, prefix = guild || "pug"): WhoPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}${i}`,
    guild,
    level: 60,
    classId: 1,
    raceId: 1,
    areaId: AREA,
  }));
}

describe("clearedRaidEvent", () => {
  it("builds a raid-left event carrying the clear's peak (the wording uses peak, not label)", () => {
    const event = clearedRaidEvent(28);
    expect(event.kind).toBe("raid-left");
    expect(event.cohort.peak).toBe(28);
    expect(event.cohort.count).toBe(0);
  });

  it("is not kill-confirmed by default, and is when asked (Chronicle early-confirm)", () => {
    expect(clearedRaidEvent(28)).toMatchObject({ kind: "raid-left", killConfirmed: false });
    expect(clearedRaidEvent(28, true)).toMatchObject({ kind: "raid-left", killConfirmed: true });
  });
});

describe("dominantGuild", () => {
  it("returns the most common non-empty guild", () => {
    const players = [...guildCrowd("Fortitude", 2), ...guildCrowd("Solo", 1)];
    expect(dominantGuild(players)).toEqual({ guild: "Fortitude", count: 2 });
  });

  it("returns null when nobody has a guild", () => {
    expect(dominantGuild(guildCrowd("", 2, "x"))).toBeNull();
  });
});
