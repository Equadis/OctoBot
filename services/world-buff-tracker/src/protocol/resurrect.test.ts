import { describe, expect, it } from "vitest";
import { PacketReader, PacketWriter } from "../net/byte-buffer.js";
import { buildResurrectResponse, parseResurrectRequest } from "./resurrect.js";

const PRIEST = 0x4d2n;

describe("parseResurrectRequest", () => {
  it("reads who is offering the resurrection", () => {
    const body = new PacketWriter().u64LE(PRIEST).u32LE(1).cString("").u8(0).toBuffer();
    expect(parseResurrectRequest(body)).toBe(PRIEST);
  });
});

describe("buildResurrectResponse", () => {
  it("accepts with the resurrector's GUID and status 1", () => {
    const reader = new PacketReader(buildResurrectResponse(PRIEST, true));
    expect(reader.u64LE()).toBe(PRIEST);
    expect(reader.u8()).toBe(1);
    expect(reader.remaining).toBe(0);
  });

  it("declines with status 0", () => {
    const reader = new PacketReader(buildResurrectResponse(PRIEST, false));
    reader.u64LE();
    expect(reader.u8()).toBe(0);
  });
});
