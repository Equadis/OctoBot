import { describe, expect, it } from "vitest";
import { PacketReader, PacketWriter } from "../net/byte-buffer.js";
import { buildCreatureQuery, parseCreatureQueryResponse } from "./creature-query.js";

/** A reply as a 1.12 core writes it: entry, four name fields, sub-name, then record data. */
function response(entry: number, name: string, subName = "Darkmoon Faire"): Buffer {
  return new PacketWriter()
    .u32LE(entry)
    .cString(name)
    .cString("")
    .cString("")
    .cString("")
    .cString(subName)
    .u32LE(0)
    .u32LE(0)
    .u32LE(0)
    .toBuffer();
}

describe("buildCreatureQuery", () => {
  it("asks by entry and a live guid", () => {
    const reader = new PacketReader(buildCreatureQuery(14823, 0xf130_0039_d7n));
    expect(reader.u32LE()).toBe(14823);
    expect(reader.u64LE()).toBe(0xf130_0039_d7n);
  });
});

describe("parseCreatureQueryResponse", () => {
  it("reads the entry and the first name", () => {
    expect(parseCreatureQueryResponse(response(14823, "Silas Darkmoon"))).toEqual({
      entry: 14823,
      name: "Silas Darkmoon",
    });
  });

  it("ignores everything after the first name, so trailing record differences cannot break it", () => {
    const short = new PacketWriter().u32LE(14843).cString("Kruban Darkblade").toBuffer();
    expect(parseCreatureQueryResponse(short)).toEqual({ entry: 14843, name: "Kruban Darkblade" });
  });

  it("reports an entry the server does not know, with the flag stripped", () => {
    const missing = new PacketWriter().u32LE(0x8000_0000 | 99999).toBuffer();
    expect(parseCreatureQueryResponse(missing)).toEqual({ entry: 99999, name: null });
  });

  it("treats an empty name as unknown rather than matching on it", () => {
    expect(parseCreatureQueryResponse(response(14823, ""))).toEqual({ entry: 14823, name: null });
  });
});
