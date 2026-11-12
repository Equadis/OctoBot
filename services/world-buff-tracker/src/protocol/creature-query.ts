import { PacketReader, PacketWriter } from "../net/byte-buffer.js";

/**
 * CMSG_CREATURE_QUERY / SMSG_CREATURE_QUERY_RESPONSE — what an NPC entry is called.
 *
 * Object updates identify a unit by entry and guid and never by name, so this is the only way to
 * put a name to something standing next to us. It is what the real client does the first time it
 * meets a creature, and it caches the answer per entry for the session, which is why asking is
 * cheap: one query per distinct NPC type, ever.
 *
 * Matching the Darkmoon Faire on NAMES rather than on a table of entry ids is deliberate. The
 * faire's roster is documented and stable (the same list PizzaWorldBuffs matches on), while entry
 * ids would be copied from a database, never verified against this realm, and a wrong one fails
 * SILENTLY — the detector would simply never fire and look like an absent faire. A name we can
 * check by reading the log.
 */

/** Ask the server what `entry` is called. `guid` is any live instance of it. */
export function buildCreatureQuery(entry: number, guid: bigint): Buffer {
  return new PacketWriter().u32LE(entry).u64LE(guid).toBuffer();
}

export interface CreatureName {
  readonly entry: number;
  /** The NPC's name, or null when the server does not know this entry. */
  readonly name: string | null;
}

/** The server sets this bit on the echoed entry to mean "no such creature". */
const NOT_FOUND_FLAG = 0x8000_0000;

/**
 * Read a creature-query reply. Only the entry and the first of its four name fields are taken —
 * the rest of the record (sub-name, family, rank, display id) is of no use here, and not reading
 * it keeps this immune to the trailing-field differences between cores.
 */
export function parseCreatureQueryResponse(body: Buffer): CreatureName {
  const reader = new PacketReader(body);
  const raw = reader.u32LE();
  if ((raw & NOT_FOUND_FLAG) !== 0) return { entry: raw & ~NOT_FOUND_FLAG, name: null };
  const name = reader.cString();
  return { entry: raw, name: name.length > 0 ? name : null };
}
