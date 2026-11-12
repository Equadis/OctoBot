import { PacketReader } from "../net/byte-buffer.js";
import type { WorldPoint } from "./update-object.js";

/**
 * A spell someone near us has started casting — who, which spell, and where it is aimed.
 *
 *   SMSG_SPELL_START: packedGuid caster (or the item cast from), packedGuid caster, u32 spell id,
 *     u16 cast flags, u32 cast time, then the targets: u16 mask, and per mask bit — a unit, object
 *     or corpse GUID; an item GUID; a source point x, y, z; a destination point x, y, z.
 *
 * The server sends it to everyone around the caster as the cast begins, before the spell lands — so
 * a ground-targeted spell's destination says where something is about to happen, and by whom.
 * Stock 1.12 layout; the neighbouring SMSG_SPELL_GO (0x132) has been seen arriving here, so the
 * numbering matches.
 */

export interface SpellCast {
  /** The unit casting — for a player's spell, the player. */
  readonly caster: bigint;
  readonly spellId: number;
  /** Where a ground-targeted spell is aimed; null for one aimed at a unit, or none. */
  readonly destination: WorldPoint | null;
}

// SpellCastTargets mask bits (1.12) that add a field, in the order the fields follow.
const TARGETS_WITH_GUID = 0x0002 | 0x0200 | 0x0800 | 0x8000; // unit, enemy corpse, object, ally corpse
const TARGETS_WITH_ITEM = 0x0010 | 0x1000; // item, trade item
const TARGET_SOURCE_LOCATION = 0x0020;
const TARGET_DEST_LOCATION = 0x0040;

/** Past this on any axis a coordinate is no place in the 1.12 world — a misread, not a position. */
const WORLD_EXTENT = 20_000;

/** A cast starting: who, what, and where it is aimed. A destination that cannot be read is null. */
export function parseSpellStart(body: Buffer): SpellCast {
  const reader = new PacketReader(body);
  reader.packedGuid(); // the item cast from, or the caster
  const caster = reader.packedGuid();
  const spellId = reader.u32LE();
  let destination: WorldPoint | null = null;
  try {
    reader.u16LE(); // cast flags
    reader.u32LE(); // cast time
    destination = readDestination(reader);
  } catch {
    // targets shorter than their mask says — keep who is casting what
  }
  return { caster, spellId, destination };
}

function readDestination(reader: PacketReader): WorldPoint | null {
  const mask = reader.u16LE();
  if (mask & TARGETS_WITH_GUID) reader.packedGuid();
  if (mask & TARGETS_WITH_ITEM) reader.packedGuid();
  if (mask & TARGET_SOURCE_LOCATION) {
    reader.f32LE();
    reader.f32LE();
    reader.f32LE();
  }
  if (!(mask & TARGET_DEST_LOCATION)) return null;
  const point = { x: reader.f32LE(), y: reader.f32LE(), z: reader.f32LE() };
  const plausible = [point.x, point.y, point.z].every((v) => Number.isFinite(v) && Math.abs(v) <= WORLD_EXTENT);
  return plausible ? point : null;
}
