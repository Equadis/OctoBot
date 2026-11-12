import { describe, expect, it } from "vitest";
import { PacketWriter } from "../net/byte-buffer.js";
import {
  parseAttackerStateUpdate,
  parseAttackStart,
  parseEnvironmentalDamage,
  parsePeriodicAuraLog,
  parseSpellDamageLog,
} from "./combat-log.js";

const PLAYER = 0x0000_0000_0012_3456n;
const GRUNT = 0xf130_0000_0c93_0042n;

describe("parseAttackStart", () => {
  it("reads the attacker and its victim as full guids", () => {
    const body = new PacketWriter().u64LE(GRUNT).u64LE(PLAYER).toBuffer();
    expect(parseAttackStart(body)).toEqual({ kind: "attack-start", attacker: GRUNT, target: PLAYER });
  });
});

describe("parseAttackerStateUpdate", () => {
  it("reads who swung, at whom, for how much, ignoring the per-school breakdown after it", () => {
    const body = new PacketWriter()
      .u32LE(0x2) // hitInfo
      .packedGuid(GRUNT)
      .packedGuid(PLAYER)
      .u32LE(412)
      .u8(1) // one sub-damage
      .u32LE(0)
      .f32LE(412)
      .u32LE(412)
      .u32LE(0)
      .i32LE(0)
      .u32LE(1) // victim state
      .u32LE(0)
      .u32LE(0)
      .u32LE(0)
      .toBuffer();
    expect(parseAttackerStateUpdate(body)).toEqual({ kind: "melee", attacker: GRUNT, target: PLAYER, damage: 412 });
  });
});

describe("parseSpellDamageLog", () => {
  it("reads the target first, then the caster, spell and damage", () => {
    const body = new PacketWriter()
      .packedGuid(PLAYER)
      .packedGuid(GRUNT)
      .u32LE(12294) // Mortal Strike
      .u32LE(1240)
      .u8(1)
      .u32LE(0)
      .i32LE(0)
      .u8(0)
      .u8(0)
      .u32LE(0)
      .u32LE(0)
      .u8(0)
      .toBuffer();
    expect(parseSpellDamageLog(body)).toEqual({
      kind: "spell",
      attacker: GRUNT,
      target: PLAYER,
      spellId: 12294,
      damage: 1240,
    });
  });
});

describe("parsePeriodicAuraLog", () => {
  function tick(auraType: number, count = 1): Buffer {
    const writer = new PacketWriter().packedGuid(PLAYER).packedGuid(GRUNT).u32LE(11671).u32LE(count);
    if (count > 0) writer.u32LE(auraType).u32LE(137).u32LE(5).u32LE(0).i32LE(0);
    return writer.toBuffer();
  }

  it("reads a damage-over-time tick", () => {
    expect(parsePeriodicAuraLog(tick(3))).toEqual({
      kind: "periodic",
      attacker: GRUNT,
      target: PLAYER,
      spellId: 11671,
      damage: 137,
    });
  });

  it("reads a percent-damage tick the same way", () => {
    expect(parsePeriodicAuraLog(tick(89))).toMatchObject({ kind: "periodic", damage: 137 });
  });

  it("drops a periodic aura that deals no damage, like a heal over time", () => {
    expect(parsePeriodicAuraLog(tick(8))).toBeNull();
  });

  it("drops a log with no aura records", () => {
    expect(parsePeriodicAuraLog(tick(3, 0))).toBeNull();
  });
});

describe("parseEnvironmentalDamage", () => {
  it("names the cause of world damage", () => {
    const body = new PacketWriter().u64LE(PLAYER).u8(2).u32LE(3500).u32LE(0).u32LE(0).toBuffer();
    expect(parseEnvironmentalDamage(body)).toEqual({
      kind: "environmental",
      target: PLAYER,
      cause: "falling",
      damage: 3500,
    });
  });

  it("keeps an unrecognised cause rather than failing the whole event", () => {
    const body = new PacketWriter().u64LE(PLAYER).u8(42).u32LE(10).toBuffer();
    expect(parseEnvironmentalDamage(body)).toMatchObject({ cause: "unknown", damage: 10 });
  });
});
