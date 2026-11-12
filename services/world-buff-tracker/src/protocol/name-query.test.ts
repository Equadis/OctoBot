import { describe, expect, it } from "vitest";
import { PacketReader, PacketWriter } from "../net/byte-buffer.js";
import { buildNameQuery, parseNameQueryResponse } from "./name-query.js";

describe("buildNameQuery", () => {
  it("encodes the guid as a little-endian u64", () => {
    const frame = buildNameQuery(0xdeadbeefn);
    expect(new PacketReader(frame).u64LE()).toBe(0xdeadbeefn);
  });
});

describe("parseNameQueryResponse", () => {
  it("reads the guid and name, ignoring the trailing fields", () => {
    const body = new PacketWriter()
      .u64LE(0x99n)
      .cString("Raider")
      .cString("") // realm
      .u32LE(1) // race
      .u32LE(0) // gender
      .u32LE(1) // class
      .toBuffer();
    const result = parseNameQueryResponse(body);
    expect(result.guid).toBe(0x99n);
    expect(result.name).toBe("Raider");
  });
});
