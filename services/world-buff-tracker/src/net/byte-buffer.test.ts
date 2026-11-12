import { describe, expect, it } from "vitest";
import { PacketReader, PacketWriter } from "./byte-buffer.js";

describe("PacketWriter", () => {
  it("writes each integer width at the right endianness", () => {
    const buf = new PacketWriter()
      .u8(0x12)
      .u16LE(0x3456)
      .u16BE(0x3456)
      .u32LE(0x89abcdef)
      .u32BE(0x89abcdef)
      .toBuffer();

    expect(buf).toEqual(
      Buffer.from([
        0x12,
        0x56, 0x34, // u16 LE
        0x34, 0x56, // u16 BE
        0xef, 0xcd, 0xab, 0x89, // u32 LE
        0x89, 0xab, 0xcd, 0xef, // u32 BE
      ]),
    );
  });

  it("writes a CString with a trailing null", () => {
    const buf = new PacketWriter().cString("WoW").toBuffer();
    expect(buf).toEqual(Buffer.from([0x57, 0x6f, 0x57, 0x00]));
  });

  it("writes a u8-length-prefixed string", () => {
    const buf = new PacketWriter().stringU8("AB").toBuffer();
    expect(buf).toEqual(Buffer.from([0x02, 0x41, 0x42]));
  });

  it("grows past its initial capacity without corrupting earlier bytes", () => {
    const writer = new PacketWriter(2);
    for (let i = 0; i < 100; i += 1) writer.u8(i);
    const buf = writer.toBuffer();
    expect(buf.length).toBe(100);
    expect([...buf]).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it("round-trips a u64", () => {
    const value = 0x0123456789abcdefn;
    const buf = new PacketWriter().u64LE(value).toBuffer();
    expect(new PacketReader(buf).u64LE()).toBe(value);
  });
});

describe("PacketReader", () => {
  it("reads fields back in order and tracks the offset", () => {
    const buf = new PacketWriter().u8(1).u16LE(2).u32LE(3).cString("hi").toBuffer();
    const reader = new PacketReader(buf);

    expect(reader.u8()).toBe(1);
    expect(reader.u16LE()).toBe(2);
    expect(reader.u32LE()).toBe(3);
    expect(reader.cString()).toBe("hi");
    expect(reader.remaining).toBe(0);
  });

  it("reads a big-endian world header the way a size field is framed", () => {
    // 2-byte BE size, 2-byte LE opcode — the SMSG framing.
    const buf = Buffer.from([0x00, 0x06, 0x63, 0x00]);
    const reader = new PacketReader(buf);
    expect(reader.u16BE()).toBe(6);
    expect(reader.u16LE()).toBe(0x63);
  });

  it("throws when reading past the end", () => {
    const reader = new PacketReader(Buffer.from([0x01]));
    reader.u8();
    expect(() => reader.u8()).toThrow(/past end/);
  });

  it("throws on an unterminated CString", () => {
    const reader = new PacketReader(Buffer.from([0x41, 0x42]));
    expect(() => reader.cString()).toThrow(/unterminated/);
  });

  it("round-trips a packed guid, writing only its non-zero bytes behind a mask", () => {
    const creature = 0xf130_0000_2a00_0507n;
    const buf = new PacketWriter().packedGuid(creature).packedGuid(0n).toBuffer();
    // mask 0b11001011 = bytes 0,1,3,6,7; then the empty guid is a lone zero mask.
    expect([...buf]).toEqual([0xcb, 0x07, 0x05, 0x2a, 0x30, 0xf1, 0x00]);
    const reader = new PacketReader(buf);
    expect(reader.packedGuid()).toBe(creature);
    expect(reader.packedGuid()).toBe(0n);
    expect(reader.remaining).toBe(0);
  });

  it("can start reading from a given offset", () => {
    const buf = Buffer.from([0xff, 0xff, 0x07]);
    expect(new PacketReader(buf, 2).u8()).toBe(7);
  });
});
