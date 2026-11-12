import { describe, expect, it } from "vitest";
import { PacketWriter } from "../net/byte-buffer.js";
import { parseMonsterMove, parsePlayerMovement, PLAYER_MOVEMENT_OPCODES } from "./movement.js";

const WARLOCK = 0x1234n;
const INFERNAL = 0xf130_0000_5900_0abcn;

describe("parsePlayerMovement", () => {
  it("reads who moved and where they are, past the flags and time", () => {
    const body = new PacketWriter()
      .packedGuid(WARLOCK)
      .u32LE(0x1) // moving forward
      .u32LE(123456) // time
      .f32LE(1629.5)
      .f32LE(-4373.25)
      .f32LE(31.5)
      .f32LE(3.1) // orientation
      .u32LE(0) // fall time
      .toBuffer();
    const move = parsePlayerMovement(body);
    expect(move?.guid).toBe(WARLOCK);
    expect(move?.pos.x).toBeCloseTo(1629.5, 1);
    expect(move?.pos.y).toBeCloseTo(-4373.25, 1);
    expect(move?.pos.z).toBeCloseTo(31.5, 1);
  });

  it("drops a position that is no place in the world", () => {
    const body = new PacketWriter().packedGuid(WARLOCK).u32LE(0).u32LE(0).f32LE(1e9).f32LE(0).f32LE(0).toBuffer();
    expect(parsePlayerMovement(body)).toBeNull();
    const nan = new PacketWriter().packedGuid(WARLOCK).u32LE(0).u32LE(0).f32LE(Number.NaN).f32LE(0).f32LE(0).toBuffer();
    expect(parsePlayerMovement(nan)).toBeNull();
  });
});

describe("parseMonsterMove", () => {
  /** A creature at (1630, -4370, 32) setting off: `facing` writes the move type and its extra data. */
  function path(facing: (w: PacketWriter) => void, points: readonly (readonly [number, number, number])[]): Buffer {
    const w = new PacketWriter().packedGuid(INFERNAL).f32LE(1630).f32LE(-4370).f32LE(32).u32LE(77);
    facing(w);
    w.u32LE(0).u32LE(4000).u32LE(points.length); // flags, duration, point count
    for (const [x, y, z] of points) w.f32LE(x).f32LE(y).f32LE(z);
    return w.toBuffer();
  }

  it("reads which creature set off, where it is now, and where its path ends", () => {
    const move = parseMonsterMove(path((w) => w.u8(0), [[1600, -4380, 31]]));
    expect(move?.guid).toBe(INFERNAL);
    expect(move?.pos.x).toBeCloseTo(1630, 1);
    expect(move?.destination?.x).toBeCloseTo(1600, 1);
    expect(move?.destination?.y).toBeCloseTo(-4380, 1);
  });

  it("reads past the facing a path can carry", () => {
    const spot = parseMonsterMove(path((w) => w.u8(2).f32LE(1).f32LE(2).f32LE(3), [[1600, -4380, 31]]));
    const target = parseMonsterMove(path((w) => w.u8(3).u64LE(0x555n), [[1600, -4380, 31]]));
    const angle = parseMonsterMove(path((w) => w.u8(4).f32LE(1.5), [[1600, -4380, 31]]));
    for (const move of [spot, target, angle]) expect(move?.destination?.x).toBeCloseTo(1600, 1);
  });

  it("has no destination when the creature stops", () => {
    const body = new PacketWriter().packedGuid(INFERNAL).f32LE(1630).f32LE(-4370).f32LE(32).u32LE(77).u8(1).toBuffer();
    const move = parseMonsterMove(body);
    expect(move?.pos.x).toBeCloseTo(1630, 1);
    expect(move?.destination).toBeNull();
  });

  it("keeps where the creature is when its path cannot be read", () => {
    const body = new PacketWriter().packedGuid(INFERNAL).f32LE(1630).f32LE(-4370).f32LE(32).u32LE(77).toBuffer();
    const move = parseMonsterMove(body);
    expect(move?.pos.x).toBeCloseTo(1630, 1);
    expect(move?.destination).toBeNull();
  });
});

describe("PLAYER_MOVEMENT_OPCODES", () => {
  it("covers the heartbeat and the start/stop of running", () => {
    for (const opcode of [0xee, 0xb5, 0xb7]) expect(PLAYER_MOVEMENT_OPCODES.has(opcode)).toBe(true);
  });
});
