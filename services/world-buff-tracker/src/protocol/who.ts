import { PacketReader, PacketWriter } from "../net/byte-buffer.js";

/**
 * CMSG_WHO request body and SMSG_WHO response parsing for 1.12.
 *
 * The request filters server-side by level range, name/guild substrings, race and
 * class masks, a list of zone (area) ids, and free-text strings. To watch an
 * instance we send a single zone id (Onyxia's Lair = 2159) and an all-ones
 * race/class mask; the server returns up to 49 matching players.
 *
 * Faction: stock 1.12 `/who` returns only your own faction, but OctoWoW returns
 * ALL players in the zone regardless of faction (verified 2026-08-30). So the
 * roster mixes both factions and a watcher must split it by race — see
 * `watcher/faction.ts` — because the buff we time is faction-wide.
 */

export const RACE_MASK_ALL = 0xffffffff;
export const CLASS_MASK_ALL = 0xffffffff;

export interface WhoQuery {
  readonly minLevel?: number;
  readonly maxLevel?: number;
  readonly playerName?: string;
  readonly guildName?: string;
  readonly raceMask?: number;
  readonly classMask?: number;
  readonly zoneIds?: readonly number[];
  readonly searchStrings?: readonly string[];
}

export function buildWhoRequestBody(query: WhoQuery): Buffer {
  const writer = new PacketWriter();
  writer.u32LE(query.minLevel ?? 0);
  writer.u32LE(query.maxLevel ?? 100);
  writer.cString(query.playerName ?? "");
  writer.cString(query.guildName ?? "");
  writer.u32LE(query.raceMask ?? RACE_MASK_ALL);
  writer.u32LE(query.classMask ?? CLASS_MASK_ALL);

  const zoneIds = query.zoneIds ?? [];
  writer.u32LE(zoneIds.length);
  for (const zoneId of zoneIds) writer.u32LE(zoneId);

  const searchStrings = query.searchStrings ?? [];
  writer.u32LE(searchStrings.length);
  for (const text of searchStrings) writer.cString(text);

  return writer.toBuffer();
}

export interface WhoPlayer {
  readonly name: string;
  readonly guild: string;
  readonly level: number;
  readonly classId: number;
  readonly raceId: number;
  readonly areaId: number;
}

export interface WhoResult {
  /** Players returned in the list — capped at 49 by the server. */
  readonly players: readonly WhoPlayer[];
  /** Total online matches the server counted (can exceed players.length). */
  readonly onlineCount: number;
}

export function parseWhoResponseBody(body: Buffer): WhoResult {
  const reader = new PacketReader(body);
  const listed = reader.u32LE();
  const onlineCount = reader.u32LE();

  const players: WhoPlayer[] = [];
  for (let i = 0; i < listed; i += 1) {
    const name = reader.cString();
    const guild = reader.cString();
    const level = reader.u32LE();
    const classId = reader.u32LE();
    const raceId = reader.u32LE();
    const areaId = reader.u32LE();
    players.push({ name, guild, level, classId, raceId, areaId });
  }

  return { players, onlineCount };
}
