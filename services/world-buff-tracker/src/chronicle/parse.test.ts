import { describe, expect, it } from "vitest";
import { cleanOnyxiaKills, hasCleanOnyxiaKill, parseChronicleResponse } from "./parse.js";
import type { ChronicleLog } from "./types.js";

/** A log shaped like Chronicle's /recent, overridable per test. */
function rawLog(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "log-1",
    realm_name: "N'Zoth",
    uploader_name: "Anaeri",
    guild_name: "Phoenix",
    first_encounter_time: "2026-09-01T02:05:13.331Z",
    player_count: 28,
    encounters: [
      { name: "Onyxian Warder", boss: false, kill_type: "clean" },
      { name: "Onyxia", boss: true, kill_type: "clean" },
    ],
    ...over,
  };
}

describe("parseChronicleResponse", () => {
  it("parses well-formed instances and keeps the fields we use", () => {
    const logs = parseChronicleResponse({ instances: [rawLog()] });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ id: "log-1", realm_name: "N'Zoth", uploader_name: "Anaeri", player_count: 28 });
    expect(logs[0]!.encounters).toHaveLength(2);
  });

  it("returns [] for non-objects and a missing/other-typed instances field", () => {
    expect(parseChronicleResponse(null)).toEqual([]);
    expect(parseChronicleResponse("nope")).toEqual([]);
    expect(parseChronicleResponse({})).toEqual([]);
    expect(parseChronicleResponse({ instances: "not-an-array" })).toEqual([]);
  });

  it("skips a malformed instance rather than throwing", () => {
    const logs = parseChronicleResponse({ instances: [rawLog(), { id: 5 /* wrong type */ }, rawLog({ id: "log-2" })] });
    expect(logs.map((l) => l.id)).toEqual(["log-1", "log-2"]);
  });

  it("drops a malformed encounter but keeps the log", () => {
    const logs = parseChronicleResponse({
      instances: [rawLog({ encounters: [{ name: "Onyxia", boss: true, kill_type: "clean" }, { name: 7 }] })],
    });
    expect(logs[0]!.encounters).toHaveLength(1);
  });
});

describe("hasCleanOnyxiaKill", () => {
  const log = (encounters: ChronicleLog["encounters"]): ChronicleLog => ({
    id: "x", realm_name: "N'Zoth", uploader_name: "U", guild_name: "", first_encounter_time: "", player_count: 0, encounters,
  });

  it("is true only for a clean Onyxia BOSS kill", () => {
    expect(hasCleanOnyxiaKill(log([{ name: "Onyxia", boss: true, kill_type: "clean" }]))).toBe(true);
  });
  it("is false for a wipe, a non-boss Onyxia mob, or Onyxia absent", () => {
    expect(hasCleanOnyxiaKill(log([{ name: "Onyxia", boss: true, kill_type: "wipe" }]))).toBe(false);
    expect(hasCleanOnyxiaKill(log([{ name: "Onyxia", boss: false, kill_type: "clean" }]))).toBe(false);
    expect(hasCleanOnyxiaKill(log([{ name: "Onyxian Warder", boss: false, kill_type: "clean" }]))).toBe(false);
  });
});

describe("cleanOnyxiaKills", () => {
  it("keeps only this realm's clean Onyxia kills and normalises them", () => {
    const logs = parseChronicleResponse({
      instances: [
        rawLog({ id: "a" }), // N'Zoth clean kill
        rawLog({ id: "b", realm_name: "Y'Shaarj" }), // other realm
        rawLog({ id: "c", encounters: [{ name: "Onyxia", boss: true, kill_type: "wipe" }] }), // wipe
      ],
    });
    const kills = cleanOnyxiaKills(logs, "N'Zoth");
    expect(kills).toHaveLength(1);
    expect(kills[0]).toMatchObject({ logId: "a", realm: "N'Zoth", uploader: "Anaeri", guild: "Phoenix", playerCount: 28 });
    expect(kills[0]!.at.toISOString()).toBe("2026-09-01T02:05:13.331Z");
  });

  it("turns a blank guild into null and drops a kill with an unparseable timestamp", () => {
    const logs = parseChronicleResponse({
      instances: [rawLog({ id: "a", guild_name: "  " }), rawLog({ id: "b", first_encounter_time: "not-a-date" })],
    });
    const kills = cleanOnyxiaKills(logs, "N'Zoth");
    expect(kills).toHaveLength(1);
    expect(kills[0]!.guild).toBeNull();
  });
});
