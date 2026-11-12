import { describe, expect, it } from "vitest";
import { PacketWriter } from "../net/byte-buffer.js";
import { parseSpellStart } from "./spell-cast.js";

const ZEZERVER = 0x2f1an;
const INFERNO = 1122;

/** A cast by Zezerver, with `targets` writing its target mask and fields. */
function spellStart(spellId: number, targets: (w: PacketWriter) => void): Buffer {
  const w = new PacketWriter().packedGuid(ZEZERVER).packedGuid(ZEZERVER).u32LE(spellId).u16LE(0x2).u32LE(2000);
  targets(w);
  return w.toBuffer();
}

describe("parseSpellStart", () => {
  it("reads who is casting a ground-targeted spell, and where it will land", () => {
    const cast = parseSpellStart(spellStart(INFERNO, (w) => w.u16LE(0x40).f32LE(1629.5).f32LE(-4373).f32LE(31.5)));
    expect(cast.caster).toBe(ZEZERVER);
    expect(cast.spellId).toBe(INFERNO);
    expect(cast.destination?.x).toBeCloseTo(1629.5, 1);
    expect(cast.destination?.y).toBeCloseTo(-4373, 1);
  });

  it("reads past a unit and a source point to the destination", () => {
    const cast = parseSpellStart(
      spellStart(INFERNO, (w) => w.u16LE(0x02 | 0x20 | 0x40).packedGuid(0x555n).f32LE(1).f32LE(2).f32LE(3).f32LE(10).f32LE(20).f32LE(30)),
    );
    expect(cast.destination).toEqual({ x: 10, y: 20, z: 30 });
  });

  it("has no destination for a spell aimed at a unit", () => {
    const cast = parseSpellStart(spellStart(686, (w) => w.u16LE(0x02).packedGuid(0x555n)));
    expect(cast.spellId).toBe(686);
    expect(cast.destination).toBeNull();
  });

  it("keeps who is casting what when the targets cannot be read", () => {
    const cast = parseSpellStart(spellStart(INFERNO, (w) => w.u16LE(0x40).f32LE(1)));
    expect(cast.caster).toBe(ZEZERVER);
    expect(cast.spellId).toBe(INFERNO);
    expect(cast.destination).toBeNull();
  });

  it("drops a destination that is no place in the world", () => {
    const cast = parseSpellStart(spellStart(INFERNO, (w) => w.u16LE(0x40).f32LE(1e9).f32LE(0).f32LE(0)));
    expect(cast.destination).toBeNull();
  });
});
