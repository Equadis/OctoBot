import { describe, expect, it, vi } from "vitest";
import type { WhoPlayer } from "../protocol/who.js";
import { WhoRosterSource } from "./roster-source.js";
import type { WhoFn } from "./roster.js";

const AREA = 2159; // Onyxia's Lair
const player = (name: string, areaId: number): WhoPlayer => ({ name, guild: "", level: 60, classId: 1, raceId: 1, areaId });

function source(who: WhoFn, logs: string[] = []) {
  return new WhoRosterSource({
    who,
    areaId: AREA,
    areaName: "Onyxia's Lair",
    logger: { info: (m) => logs.push(m) },
  });
}

describe("WhoRosterSource", () => {
  it("returns only the players in the watch area, marked complete, with a timestamp", async () => {
    const players = [player("Inlair1", AREA), player("Elsewhere", 1637), player("Inlair2", AREA)];
    const who = vi.fn<WhoFn>().mockResolvedValue({ players, onlineCount: 1000 });
    const view = await source(who).poll();
    expect(view.present.map((p) => p.name)).toEqual(["Inlair1", "Inlair2"]); // the off-area player is dropped
    expect(view.complete).toBe(true);
    expect(typeof view.at).toBe("number");
  });

  it("logs its own /who acquisition line (in-zone / returned / online)", async () => {
    const players = [player("A", AREA), player("Elsewhere", 1637)];
    const who = vi.fn<WhoFn>().mockResolvedValue({ players, onlineCount: 2000 });
    const logs: string[] = [];
    await source(who, logs).poll();
    expect(logs.some((l) => l.includes("who Onyxia's Lair: 1 in zone (2 returned, 2000 online)"))).toBe(true);
  });
});
