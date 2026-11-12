import { describe, expect, it } from "vitest";
import { PacketWriter } from "../net/byte-buffer.js";
import {
  buildWhoRequestBody,
  CLASS_MASK_ALL,
  parseWhoResponseBody,
  RACE_MASK_ALL,
  type WhoPlayer,
} from "./who.js";

describe("buildWhoRequestBody", () => {
  it("encodes a single-zone query byte-for-byte", () => {
    const body = buildWhoRequestBody({
      minLevel: 0,
      maxLevel: 100,
      zoneIds: [2159],
    });

    expect(body.toString("hex")).toBe(
      [
        "00000000", // minLevel 0
        "64000000", // maxLevel 100
        "00", // playerName ""
        "00", // guildName ""
        "ffffffff", // raceMask all
        "ffffffff", // classMask all
        "01000000", // zone count 1
        "6f080000", // zone 2159
        "00000000", // string count 0
      ].join(""),
    );
  });

  it("defaults masks to all and levels to 0..100", () => {
    const body = buildWhoRequestBody({});
    // minLevel(4) maxLevel(4) name(1) guild(1) race(4) class(4) zones(4) strings(4)
    expect(body.length).toBe(26);
    expect(body.readUInt32LE(0)).toBe(0);
    expect(body.readUInt32LE(4)).toBe(100);
    expect(body.readUInt32LE(10)).toBe(RACE_MASK_ALL);
    expect(body.readUInt32LE(14)).toBe(CLASS_MASK_ALL);
  });

  it("encodes search strings after their count", () => {
    const body = buildWhoRequestBody({ searchStrings: ["ony"] });
    // last 5 bytes: count=1 then "ony\0"
    expect(body.subarray(body.length - 8).toString("hex")).toBe("010000006f6e7900");
  });
});

/** Build a synthetic SMSG_WHO body the way a server would, for parser tests. */
function encodeWhoResponse(onlineCount: number, players: readonly WhoPlayer[]): Buffer {
  const writer = new PacketWriter();
  writer.u32LE(players.length);
  writer.u32LE(onlineCount);
  for (const player of players) {
    writer.cString(player.name);
    writer.cString(player.guild);
    writer.u32LE(player.level);
    writer.u32LE(player.classId);
    writer.u32LE(player.raceId);
    writer.u32LE(player.areaId);
  }
  return writer.toBuffer();
}

describe("parseWhoResponseBody", () => {
  it("reads listed players and the online total", () => {
    const players: WhoPlayer[] = [
      { name: "Onytank", guild: "Dragonslayers", level: 60, classId: 1, raceId: 2, areaId: 2159 },
      { name: "Healbot", guild: "", level: 60, classId: 5, raceId: 5, areaId: 2159 },
    ];
    const result = parseWhoResponseBody(encodeWhoResponse(2, players));

    expect(result.onlineCount).toBe(2);
    expect(result.players).toEqual(players);
  });

  it("handles an empty result (nobody in the zone)", () => {
    const result = parseWhoResponseBody(encodeWhoResponse(0, []));
    expect(result.players).toEqual([]);
    expect(result.onlineCount).toBe(0);
  });

  it("round-trips a full 40-player raid", () => {
    const players: WhoPlayer[] = Array.from({ length: 40 }, (_, i) => ({
      name: `Raider${i}`,
      guild: "Fortitude",
      level: 60,
      classId: (i % 9) + 1,
      raceId: (i % 8) + 1,
      areaId: 2159,
    }));
    const result = parseWhoResponseBody(encodeWhoResponse(40, players));
    expect(result.players).toHaveLength(40);
    expect(result.players.every((p) => p.areaId === 2159)).toBe(true);
  });
});
