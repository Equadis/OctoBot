import type { Faction } from "./buff-store.js";

/**
 * Parsers for the world-buff messages addons broadcast on Turtle's hidden "LFT" chat channel.
 *
 * The one we care about is the ADVANCE warning that a custom addon (by "Sir Circle") emits the
 * moment a player turns in the Onyxia head quest and is about to be sent to the faction leader —
 * i.e. BEFORE the capital NPC yell fires. That is a heads-up the bot can never get from /who or the
 * yell, and it covers saved-head turn-ins that have no lair signature at all.
 *
 *   OB_INC:1:A-O-Someplayer-14-32
 *   └ prefix (OB.incomingPrefix) — distinct from OB:1:... which is the real "head is down" timer
 *     └ version · faction A/H · boss O(nyxia)/N(ef) · witness · server HH · server MM
 *
 * Pure, so it is unit-tested off the wire. Deliberately strict: a shape it does not recognise
 * returns null (the observe hook logs the raw line regardless), so a malformed or spoofed message
 * never becomes an alert.
 */

const OB_INCOMING_PREFIX = "OB_INC:";

export interface HeadIncoming {
  readonly version: number;
  /** The faction turning in the head — maps to the capital the buff will drop in. */
  readonly faction: Faction;
  /** Boss code as sent: "O" = Onyxia, "N" = Nefarian. Kept raw; the caller decides what it acts on. */
  readonly boss: string;
  /** The player witnessed turning it in. Not surfaced to readers — kept for logging/debug. */
  readonly witness: string;
  readonly serverHour: number;
  readonly serverMinute: number;
}

function factionOf(code: string): Faction | null {
  if (code === "A") return "alliance";
  if (code === "H") return "horde";
  return null;
}

/** Parse an `OB_INC:` advance-warning line, or null if it is not one / is malformed. */
export function parseHeadIncoming(text: string): HeadIncoming | null {
  if (!text.startsWith(OB_INCOMING_PREFIX)) return null;
  const rest = text.slice(OB_INCOMING_PREFIX.length); // "1:A-O-Someplayer-14-32"
  const versionEnd = rest.indexOf(":");
  if (versionEnd === -1) return null;
  const version = Number(rest.slice(0, versionEnd));
  if (!Number.isInteger(version)) return null;

  const parts = rest.slice(versionEnd + 1).split("-"); // ["A","O","Someplayer","14","32"]
  if (parts.length !== 5) return null;
  const [factionCode, boss, witness, hh, mm] = parts as [string, string, string, string, string];

  const faction = factionOf(factionCode);
  if (faction === null) return null;
  if (boss.length === 0 || witness.length === 0) return null;

  const serverHour = Number(hh);
  const serverMinute = Number(mm);
  if (!Number.isInteger(serverHour) || serverHour < 0 || serverHour > 23) return null;
  if (!Number.isInteger(serverMinute) || serverMinute < 0 || serverMinute > 59) return null;

  return { version, faction, boss, witness, serverHour, serverMinute };
}

/** True if a boss code is Onyxia — the only head this bot acts on. */
export function isOnyxiaHead(boss: string): boolean {
  return boss.toUpperCase() === "O";
}
