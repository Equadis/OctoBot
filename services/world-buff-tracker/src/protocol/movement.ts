import { PacketReader } from "../net/byte-buffer.js";
import type { WorldPoint } from "./update-object.js";

/**
 * Where a unit near us is as it moves, from the packets the server relays while it does.
 *
 *   MSG_MOVE_* (a player's own movement, relayed): packedGuid, then MovementInfo — u32 flags,
 *     u32 time, f32 x, y, z, orientation, and more — of which only the position is read.
 *   SMSG_MONSTER_MOVE (a creature setting off on a path): packedGuid, f32 x, y, z — where it is
 *     now — u32 spline id, u8 move type (1 = stop; 2/3/4 add a facing spot, target or angle), then
 *     u32 flags, u32 duration, u32 point count and the path's end point, x, y, z. A creature walks
 *     the whole path on that one packet, so where it is going matters as much as where it starts.
 *
 * These are the stock 1.12 opcodes and layouts, which the rest of this protocol matches on OctoWoW,
 * but no capture of these packets has confirmed them here. So a position that is no plausible place
 * in the world is dropped rather than trusted; a unit that comes into view still arrives with its
 * position in its object create block, which is confirmed.
 */

/** The opcodes that relay a player's movement (stock 1.12). */
export const PLAYER_MOVEMENT_OPCODES: ReadonlySet<number> = new Set([
  0xb5, // MSG_MOVE_START_FORWARD
  0xb6, // MSG_MOVE_START_BACKWARD
  0xb7, // MSG_MOVE_STOP
  0xb8, // MSG_MOVE_START_STRAFE_LEFT
  0xb9, // MSG_MOVE_START_STRAFE_RIGHT
  0xba, // MSG_MOVE_STOP_STRAFE
  0xbb, // MSG_MOVE_JUMP
  0xbc, // MSG_MOVE_START_TURN_LEFT
  0xbd, // MSG_MOVE_START_TURN_RIGHT
  0xbe, // MSG_MOVE_STOP_TURN
  0xbf, // MSG_MOVE_START_PITCH_UP
  0xc0, // MSG_MOVE_START_PITCH_DOWN
  0xc1, // MSG_MOVE_STOP_PITCH
  0xc2, // MSG_MOVE_SET_RUN_MODE
  0xc3, // MSG_MOVE_SET_WALK_MODE
  0xc9, // MSG_MOVE_FALL_LAND
  0xca, // MSG_MOVE_START_SWIM
  0xcb, // MSG_MOVE_STOP_SWIM
  0xda, // MSG_MOVE_SET_FACING
  0xdb, // MSG_MOVE_SET_PITCH
  0xee, // MSG_MOVE_HEARTBEAT
]);

/** A unit, and where it is. */
export interface UnitPosition {
  readonly guid: bigint;
  readonly pos: WorldPoint;
  /** Where a creature's path ends — it will be walking there — or null when not on one. */
  readonly destination: WorldPoint | null;
}

/** A relayed player movement: who moved and where they are, or null for an implausible position. */
export function parsePlayerMovement(body: Buffer): UnitPosition | null {
  const reader = new PacketReader(body);
  const guid = reader.packedGuid();
  reader.u32LE(); // movement flags
  reader.u32LE(); // time
  const pos = readPoint(reader);
  return pos ? { guid, pos, destination: null } : null;
}

// SMSG_MONSTER_MOVE move types that carry extra facing data before the path.
const MONSTER_MOVE_STOP = 1;
const MONSTER_MOVE_FACING_SPOT = 2;
const MONSTER_MOVE_FACING_TARGET = 3;
const MONSTER_MOVE_FACING_ANGLE = 4;

/**
 * A creature setting off: which one, where it is now, and where its path ends — or null for an
 * implausible position. A path that cannot be read leaves the destination null rather than
 * losing the position.
 */
export function parseMonsterMove(body: Buffer): UnitPosition | null {
  const reader = new PacketReader(body);
  const guid = reader.packedGuid();
  const pos = readPoint(reader);
  if (!pos) return null;
  let destination: WorldPoint | null = null;
  try {
    destination = readDestination(reader);
  } catch {
    // a path shorter than its layout — keep where the creature is
  }
  return { guid, pos, destination };
}

function readDestination(reader: PacketReader): WorldPoint | null {
  reader.u32LE(); // spline id
  const type = reader.u8();
  if (type === MONSTER_MOVE_STOP) return null;
  if (type === MONSTER_MOVE_FACING_SPOT) {
    reader.f32LE();
    reader.f32LE();
    reader.f32LE();
  } else if (type === MONSTER_MOVE_FACING_TARGET) reader.u64LE();
  else if (type === MONSTER_MOVE_FACING_ANGLE) reader.f32LE();
  reader.u32LE(); // spline flags
  reader.u32LE(); // duration
  if (reader.u32LE() === 0) return null; // no points
  return readPoint(reader);
}

/** Past this on any axis a coordinate is no place in the 1.12 world — a misread, not a position. */
const WORLD_EXTENT = 20_000;

function readPoint(reader: PacketReader): WorldPoint | null {
  const point = { x: reader.f32LE(), y: reader.f32LE(), z: reader.f32LE() };
  const plausible = [point.x, point.y, point.z].every((v) => Number.isFinite(v) && Math.abs(v) <= WORLD_EXTENT);
  return plausible ? point : null;
}
