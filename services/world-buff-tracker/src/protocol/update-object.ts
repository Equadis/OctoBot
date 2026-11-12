import { PacketReader } from "../net/byte-buffer.js";
import { unitRef } from "./guid.js";
import type { UnitPosition } from "./movement.js";

/**
 * Parse an SMSG_UPDATE_OBJECT block (already decompressed) far enough to pull out
 * nearby GameObjects (guid + entry + position) and our own player position — enough
 * to interact with the closest object (e.g. sit on the bench a character is parked on).
 *
 * Confirmed against live OctoWoW captures — stock 1.12 layout:
 *   u32 count, u8 hasTransport, then `count` blocks:
 *     u8 updateType; packedGuid; then per type:
 *       CREATE(2)/CREATE2(3): u8 objectType, u8 updateFlags, movementBlock, valuesBlock
 *       VALUES(0): valuesBlock ;  MOVEMENT(1): movementBlock
 *       OUT_OF_RANGE(4)/NEAR(5): u32 n, n packedGuids
 *
 * Units also report who they answer to (see unit-owner.ts), and which of them left view.
 *
 * We decode only what we need. A MOVING unit (LIVING with non-zero movement flags) has
 * a variable-length block we don't decode, so hitting one throws — and the caller keeps
 * whatever it read from the earlier, cleanly-parsed packets.
 */
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WorldGameObject {
  readonly guid: bigint;
  readonly entry: number;
  readonly pos: WorldPoint;
}

/** A creature seen nearby. Positionless when the block carried no movement — an update can name
 *  a unit without moving it, and for "is it standing here" the entry is the part that matters. */
export interface WorldUnit {
  readonly guid: bigint;
  readonly entry: number;
}

export interface WorldObjects {
  readonly gameObjects: WorldGameObject[];
  /** Creatures in the block — entry + guid only, which is all a creature query needs. */
  readonly units: WorldUnit[];
  /** Our own player's position, when this block created it. */
  readonly self: WorldPoint | null;
  /** Our own current health, when this block carried it (a create, or a values update after a
   *  hit). Only reported when the caller names our GUID. Zero means we just died. */
  readonly selfHealth: number | null;
  /** What each unit block said about the unit's owner, and which units left view — in block order,
   *  for a `UnitOwnerTable` to apply. */
  readonly ownerChanges: UnitOwnerChange[];
  /** Where each other unit or player the block placed is — those coming into view, and those whose
   *  movement it updated. Never our own. */
  readonly positions: UnitPosition[];
  /** The other players coming into view, and their race and class. Never us. */
  readonly players: WorldPlayer[];
  /** Where the packet stopped being readable, when it did — every block after it is lost. Null when
   *  the whole packet was read. */
  readonly incomplete: UpdateParseStop | null;
}

/** Another player coming into view: their race and class, and their health — 0 when dead. */
export interface WorldPlayer {
  readonly guid: bigint;
  readonly raceId: number;
  readonly classId: number;
  readonly health: number;
}

/** A packet the parser could not read to the end: at which block, of how many, and what that was. */
export interface UpdateParseStop {
  /** The 0-based block the parser stopped in. */
  readonly block: number;
  readonly of: number;
  /** What the block in hand was, as far as it got: its update type, object type, flags, GUID. */
  readonly what: string;
  readonly reason: string;
}

/** A unit block's word on who the unit answers to, or a unit leaving view. */
export type UnitOwnerChange =
  | {
      /** A create block carries every non-zero field, so an owner field it lacks is zero; a values
       *  block carries only what changed. */
      readonly kind: "create" | "values";
      readonly guid: bigint;
      /** The owner-field words the block carried, by field index. */
      readonly words: ReadonlyMap<number, number>;
    }
  | { readonly kind: "out-of-range"; readonly guid: bigint };

// Values-block field indices (1.12).
const OBJECT_FIELD_ENTRY = 3;
const UNIT_FIELD_HEALTH = 22;
/** A unit's race, class, gender and power type, one byte each, lowest first. */
const UNIT_FIELD_BYTES_0 = 36;
// A unit's owners — each a 64-bit GUID over two words, low word first.
/** Who holds it by a charm: Mind Control, Enslave Demon, a warlock's hold on its Inferno. */
export const UNIT_FIELD_CHARMEDBY = 10;
/** Whose pet or totem it is. */
export const UNIT_FIELD_SUMMONEDBY = 12;
/** Who made it: a guardian's caster. */
export const UNIT_FIELD_CREATEDBY = 14;
const OWNER_FIELDS_END = UNIT_FIELD_CREATEDBY + 2;

const OBJTYPE_UNIT = 3;
const OBJTYPE_PLAYER = 4;
const OBJTYPE_GAMEOBJECT = 5;

const UPDATEFLAG_TRANSPORT = 0x02;
/** The unit is attacking something: whom follows, as a packed GUID (0 when no one). */
const UPDATEFLAG_HAS_ATTACKING_TARGET = 0x04;
const UPDATEFLAG_HIGHGUID = 0x08;
const UPDATEFLAG_ALL = 0x10;
const UPDATEFLAG_LIVING = 0x20;
const UPDATEFLAG_HAS_POSITION = 0x40;

const UPDATETYPE_VALUES = 0;
const UPDATETYPE_MOVEMENT = 1;
const UPDATETYPE_CREATE = 2;
const UPDATETYPE_CREATE2 = 3;
const UPDATETYPE_OUT_OF_RANGE = 4;
const UPDATETYPE_NEAR = 5;

// Movement flags whose presence adds fields to a LIVING block (1.12, confirmed live).
const MOVEFLAG_ONTRANSPORT = 0x00000200;
const MOVEFLAG_FALLING = 0x00002000;
const MOVEFLAG_SWIMMING = 0x00200000;
const MOVEFLAG_SPLINE_ENABLED = 0x00400000;
const MOVEFLAG_SPLINE_ELEVATION = 0x02000000;

// Spline "final facing" bits — which single final field follows the spline flags. The 1.12 values
// (cmangos-classic MoveSplineFlag); TBC moved them down a bit, to 0x8000/0x10000/0x20000.
const SPLINE_FINAL_POINT = 0x00010000;
const SPLINE_FINAL_TARGET = 0x00020000;
const SPLINE_FINAL_ANGLE = 0x00040000;

/**
 * Parse a nearby-objects update. `selfGuid`, when given, is our own character's GUID: only
 * the block for THAT player sets `self`, so a bystander in the same packet (common in a city)
 * can't overwrite our position. Without it, any player's position is taken (legacy/test use).
 */
export function parseUpdateObject(body: Buffer, selfGuid?: bigint): WorldObjects {
  const reader = new PacketReader(body);
  const count = reader.u32LE();
  reader.u8(); // hasTransport
  const gameObjects: WorldGameObject[] = [];
  const units: WorldUnit[] = [];
  let self: WorldPoint | null = null;
  let selfHealth: number | null = null;
  const ownerChanges: UnitOwnerChange[] = [];
  const positions: UnitPosition[] = [];
  const players: WorldPlayer[] = [];
  const isSelf = (guid: bigint): boolean => selfGuid !== undefined && guid === selfGuid;
  let incomplete: UpdateParseStop | null = null;
  // The block in hand, described as it is read — for saying where a packet broke.
  let block = 0;
  let what = "";

  // If a block turns out to be a shape we don't decode (or the packet is truncated),
  // keep the GameObjects read so far rather than losing the whole packet.
  try {
    for (; block < count; block += 1) {
      const updateType = reader.u8();
      what = `update type ${updateType}`;
      if (updateType === UPDATETYPE_OUT_OF_RANGE || updateType === UPDATETYPE_NEAR) {
        const n = reader.u32LE();
        for (let j = 0; j < n; j += 1) {
          const guid = reader.packedGuid();
          if (updateType === UPDATETYPE_OUT_OF_RANGE && isUnitGuid(guid)) {
            ownerChanges.push({ kind: "out-of-range", guid });
          }
        }
        continue;
      }
      const guid = reader.packedGuid();
      what += `, guid 0x${guid.toString(16)}`;
      if (updateType === UPDATETYPE_CREATE || updateType === UPDATETYPE_CREATE2) {
        const objType = reader.u8();
        const flags = reader.u8();
        what += `, object type ${objType}, update flags 0x${flags.toString(16)}`;
        const { pos, destination } = readMovement(reader, flags);
        const { entry, health, ownerWords, bytes0 } = readValues(reader);
        if (isSelf(guid) && health !== null) selfHealth = health;
        // Another player: who they are — what they can do for us — read from their race and class.
        if (objType === OBJTYPE_PLAYER && !isSelf(guid) && bytes0 !== null) {
          players.push({ guid, raceId: bytes0 & 0xff, classId: (bytes0 >>> 8) & 0xff, health: health ?? 0 });
        }
        if (objType === OBJTYPE_GAMEOBJECT && pos) gameObjects.push({ guid, entry, pos });
        if (objType === OBJTYPE_UNIT && entry > 0) units.push({ guid, entry });
        if (objType === OBJTYPE_PLAYER && pos && (selfGuid === undefined || guid === selfGuid)) self = pos;
        if ((objType === OBJTYPE_UNIT || objType === OBJTYPE_PLAYER) && pos && !isSelf(guid)) positions.push({ guid, pos, destination });
        // Every unit's create goes through, owner or not: it also clears whatever an earlier sighting left.
        if (objType === OBJTYPE_UNIT || objType === OBJTYPE_PLAYER) {
          ownerChanges.push({ kind: "create", guid, words: ownerWords });
        }
      } else if (updateType === UPDATETYPE_VALUES) {
        const { health, ownerWords } = readValues(reader);
        if (isSelf(guid) && health !== null) selfHealth = health;
        // A values block does not say what it updates, and a GameObject's same indices hold its
        // rotation — so only a unit's GUID makes these words owners.
        if (ownerWords.size > 0 && isUnitGuid(guid)) ownerChanges.push({ kind: "values", guid, words: ownerWords });
      } else if (updateType === UPDATETYPE_MOVEMENT) {
        const { pos, destination } = readMovement(reader, reader.u8());
        if (pos && isUnitGuid(guid) && !isSelf(guid)) positions.push({ guid, pos, destination });
      } else {
        // An unknown block type — stop, keep what we have.
        incomplete = { block, of: count, what, reason: "unknown update type" };
        break;
      }
    }
  } catch (error) {
    // The reader ran off the end of a block we mis-sized — keep the objects read so far.
    incomplete = { block, of: count, what, reason: error instanceof Error ? error.message : String(error) };
  }
  // Every block read, yet bytes left: one was read at the wrong size without running off the end.
  if (!incomplete && reader.remaining > 0) {
    incomplete = { block: count, of: count, what: "after the last block", reason: `${reader.remaining} bytes left over` };
  }
  return { gameObjects, units, self, selfHealth, ownerChanges, positions, players, incomplete };
}

/** Whether a GUID names a unit — a player, creature or pet — rather than a GameObject or item. */
function isUnitGuid(guid: bigint): boolean {
  return unitRef(guid).kind !== "other";
}

/** The GUID an SMSG_DESTROY_OBJECT removes from view (body: u64 guid, not packed). */
export function parseDestroyObject(body: Buffer): bigint {
  return new PacketReader(body).u64LE();
}

/** Where a movement block puts its object, and — for one walking a path — where the path ends. */
interface Movement {
  readonly pos: WorldPoint | null;
  readonly destination: WorldPoint | null;
}

function readMovement(reader: PacketReader, flags: number): Movement {
  let pos: WorldPoint | null = null;
  let destination: WorldPoint | null = null;
  if (flags & UPDATEFLAG_LIVING) {
    const moveFlags = reader.u32LE();
    try {
      ({ pos, destination } = readLiving(reader, moveFlags));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${reason} (movement flags 0x${moveFlags.toString(16)})`);
    }
  } else if (flags & UPDATEFLAG_HAS_POSITION) {
    pos = { x: reader.f32LE(), y: reader.f32LE(), z: reader.f32LE() };
    reader.f32LE(); // orientation
  }
  // In the server's own order (cmangos-classic Object::BuildMovementUpdate).
  if (flags & UPDATEFLAG_HIGHGUID) reader.u32LE();
  if (flags & UPDATEFLAG_ALL) reader.u32LE();
  if (flags & UPDATEFLAG_HAS_ATTACKING_TARGET) reader.packedGuid();
  if (flags & UPDATEFLAG_TRANSPORT) reader.u32LE();
  return { pos, destination };
}

/** The LIVING part of a movement block, after its movement flags. */
function readLiving(reader: PacketReader, moveFlags: number): Movement {
  reader.u32LE(); // time
  const pos = { x: reader.f32LE(), y: reader.f32LE(), z: reader.f32LE() };
  reader.f32LE(); // orientation
  if (moveFlags & MOVEFLAG_ONTRANSPORT) {
    reader.packedGuid();
    reader.f32LE(); reader.f32LE(); reader.f32LE(); reader.f32LE(); // transport x,y,z,o
    reader.u32LE(); // transport time
  }
  if (moveFlags & MOVEFLAG_SWIMMING) reader.f32LE(); // pitch
  reader.u32LE(); // fall time
  if (moveFlags & MOVEFLAG_FALLING) {
    reader.f32LE(); reader.f32LE(); reader.f32LE(); reader.f32LE(); // jump velocity/angles/speed
  }
  if (moveFlags & MOVEFLAG_SPLINE_ELEVATION) reader.f32LE();
  for (let i = 0; i < 6; i += 1) reader.f32LE(); // walk/run/... speeds
  const destination = moveFlags & MOVEFLAG_SPLINE_ENABLED ? readSpline(reader) : null;
  return { pos, destination };
}

/**
 * Read a monster/spline movement block (a pathing NPC), keeping where its path ends. Layout
 * confirmed live. A creature that comes into view already running carries its whole path here, and
 * may send nothing more until it arrives — so the end is what says it is running at us.
 */
function readSpline(reader: PacketReader): WorldPoint | null {
  const splineFlags = reader.u32LE();
  // In the server's own order (PacketBuilder::WriteCreate): a point, else a target, else an angle.
  if (splineFlags & SPLINE_FINAL_POINT) {
    reader.f32LE(); reader.f32LE(); reader.f32LE();
  } else if (splineFlags & SPLINE_FINAL_TARGET) reader.u64LE();
  else if (splineFlags & SPLINE_FINAL_ANGLE) reader.f32LE();
  reader.u32LE(); // time passed
  reader.u32LE(); // duration
  reader.u32LE(); // spline id
  const pointCount = reader.u32LE();
  for (let i = 0; i < pointCount * 3; i += 1) reader.f32LE();
  const end = { x: reader.f32LE(), y: reader.f32LE(), z: reader.f32LE() };
  // A cyclic path sends no end (zero); a misread one is no place in the world.
  const nowhere = end.x === 0 && end.y === 0 && end.z === 0;
  const plausible = [end.x, end.y, end.z].every((v) => Number.isFinite(v) && Math.abs(v) <= WORLD_EXTENT);
  return !nowhere && plausible ? end : null;
}

/** Past this on any axis a coordinate is no place in the 1.12 world — a misread, not a position. */
const WORLD_EXTENT = 20_000;

interface ValueFields {
  /** OBJECT_FIELD_ENTRY, or 0 when the block did not carry it. */
  readonly entry: number;
  /** UNIT_FIELD_HEALTH, or null when the block did not carry it. */
  readonly health: number | null;
  /** The words at the unit owner indices, by index — meaningful only when the block is a unit's. */
  readonly ownerWords: Map<number, number>;
  /** UNIT_FIELD_BYTES_0 — race, class, gender, power type — or null when the block did not carry it. */
  readonly bytes0: number | null;
}

/** Read a values block, keeping the few fields we act on. */
function readValues(reader: PacketReader): ValueFields {
  const blockCount = reader.u8();
  const mask: number[] = [];
  for (let i = 0; i < blockCount; i += 1) mask.push(reader.u32LE());
  let entry = 0;
  let health: number | null = null;
  let bytes0: number | null = null;
  const ownerWords = new Map<number, number>();
  for (let idx = 0; idx < blockCount * 32; idx += 1) {
    if (((mask[idx >>> 5] ?? 0) >>> (idx & 31)) & 1) {
      const value = reader.u32LE();
      if (idx === OBJECT_FIELD_ENTRY) entry = value;
      else if (idx === UNIT_FIELD_HEALTH) health = value;
      else if (idx === UNIT_FIELD_BYTES_0) bytes0 = value;
      else if (idx >= UNIT_FIELD_CHARMEDBY && idx < OWNER_FIELDS_END) ownerWords.set(idx, value);
    }
  }
  return { entry, health, ownerWords, bytes0 };
}

/** The GameObject nearest a point (by squared distance), or null if there are none. */
export function nearestGameObject(
  objects: readonly WorldGameObject[],
  to: WorldPoint,
): WorldGameObject | null {
  let best: WorldGameObject | null = null;
  let bestDistSq = Infinity;
  for (const go of objects) {
    const dx = go.pos.x - to.x;
    const dy = go.pos.y - to.y;
    const dz = go.pos.z - to.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = go;
    }
  }
  return best;
}
