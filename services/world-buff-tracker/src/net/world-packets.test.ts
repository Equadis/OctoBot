import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PacketWriter } from "./byte-buffer.js";
import { VanillaHeaderCrypt } from "../crypto/header-crypt.js";
import { WorldOpcode } from "../protocol/opcodes.js";
import {
  buildAuthSessionBody,
  buildPingBody,
  buildPlayerLoginBody,
  buildWorldClientFrame,
  computeAuthSessionDigest,
  parseAuthChallenge,
  parseAuthResponse,
  parseCharEnum,
  readServerHeader,
  WORLD_CLIENT_HEADER_SIZE,
} from "./world-packets.js";

describe("computeAuthSessionDigest", () => {
  it("hashes account, zero, seeds and K in that order", () => {
    const account = "botchar";
    const clientSeed = 0x11223344;
    const serverSeed = 0xa1b2c3d4;
    const sessionKey = Buffer.alloc(40, 0x5a);

    const expected = createHash("sha1")
      .update(Buffer.from("BOTCHAR", "utf8"))
      .update(Buffer.from([0, 0, 0, 0]))
      .update(Buffer.from([0x44, 0x33, 0x22, 0x11])) // clientSeed LE
      .update(Buffer.from([0xd4, 0xc3, 0xb2, 0xa1])) // serverSeed LE
      .update(sessionKey)
      .digest();

    expect(computeAuthSessionDigest(account, clientSeed, serverSeed, sessionKey)).toEqual(expected);
  });
});

describe("buildAuthSessionBody", () => {
  it("lays out build, login-server id, account, seed and digest", () => {
    const body = buildAuthSessionBody("Bot", 0x01020304, 0x0a0b0c0d, Buffer.alloc(40, 1), 7272, Buffer.alloc(0));
    expect(body.readUInt32LE(0)).toBe(7272); // build (OctoWoW custom)
    expect(body.readUInt32LE(4)).toBe(0); // login server id
    // account CString "BOT\0" starts at offset 8
    expect(body.subarray(8, 12).toString("hex")).toBe("424f5400");
    expect(body.readUInt32LE(12)).toBe(0x01020304); // client seed
    expect(body.length).toBe(8 + 4 + 4 + 20); // build+id + account + seed + digest, no addon
  });

  it("appends the standard addon block by default", () => {
    const withAddon = buildAuthSessionBody("Bot", 1, 2, Buffer.alloc(40, 1));
    const withoutAddon = buildAuthSessionBody("Bot", 1, 2, Buffer.alloc(40, 1), 7272, Buffer.alloc(0));
    expect(withAddon.length).toBe(withoutAddon.length + 149);
    expect(withAddon.subarray(0, 4).toString("hex")).toBe("681c0000"); // build 7272 LE

    const customBuild = buildAuthSessionBody("Bot", 1, 2, Buffer.alloc(40, 1), 9999, Buffer.alloc(0));
    expect(customBuild.readUInt32LE(0)).toBe(9999);
  });
});

describe("SMSG parsers", () => {
  it("parseAuthChallenge reads the server seed", () => {
    const body = new PacketWriter().u32LE(0xdeadbeef).toBuffer();
    expect(parseAuthChallenge(body).serverSeed).toBe(0xdeadbeef);
  });

  it("parseAuthResponse reads the result byte", () => {
    expect(parseAuthResponse(Buffer.from([0x0c])).result).toBe(0x0c);
  });
});

describe("world framing", () => {
  it("frames a CMSG with a big-endian size and little-endian opcode", () => {
    const body = Buffer.from([0xaa, 0xbb]);
    const frame = buildWorldClientFrame(WorldOpcode.CMSG_WHO, body);

    expect(frame.readUInt16BE(0)).toBe(body.length + 4); // size = opcode(4) + body
    expect(frame.readUInt32LE(2)).toBe(WorldOpcode.CMSG_WHO);
    expect(frame.subarray(WORLD_CLIENT_HEADER_SIZE).equals(body)).toBe(true);
  });

  it("readServerHeader inverts a 4-byte SMSG header", () => {
    const header = new PacketWriter().u16BE(2 + 10).u16LE(WorldOpcode.SMSG_WHO).toBuffer();
    expect(readServerHeader(header)).toEqual({
      opcode: WorldOpcode.SMSG_WHO,
      bodyLength: 10,
    });
  });

  it("a framed header survives the cipher round-trip", () => {
    const key = Buffer.from(Array.from({ length: 40 }, (_, i) => (i * 3 + 7) & 0xff));
    const client = new VanillaHeaderCrypt(key);
    const server = new VanillaHeaderCrypt(key);

    const frame = buildWorldClientFrame(WorldOpcode.CMSG_PLAYER_LOGIN, Buffer.alloc(8, 0));
    const header = frame.subarray(0, WORLD_CLIENT_HEADER_SIZE);
    const plaintextHeader = Buffer.from(header);

    client.encryptSend(header);
    expect(header.equals(plaintextHeader)).toBe(false);
    server.decryptRecv(header);
    expect(header.equals(plaintextHeader)).toBe(true);
  });
});

/** Build a synthetic SMSG_CHAR_ENUM record: guid + name + 150 skipped bytes. */
function charRecord(guid: bigint, name: string): Buffer {
  return new PacketWriter().u64LE(guid).cString(name).bytes(Buffer.alloc(150, 0)).toBuffer();
}

describe("parseCharEnum", () => {
  it("reads a single character's guid and name", () => {
    const body = Buffer.concat([Buffer.from([1]), charRecord(0x1234n, "Botchar")]);
    expect(parseCharEnum(body)).toEqual([{ guid: 0x1234n, name: "Botchar" }]);
  });

  it("reads multiple characters", () => {
    const body = Buffer.concat([
      Buffer.from([2]),
      charRecord(1n, "Alpha"),
      charRecord(2n, "Beta"),
    ]);
    expect(parseCharEnum(body)).toEqual([
      { guid: 1n, name: "Alpha" },
      { guid: 2n, name: "Beta" },
    ]);
  });

  it("returns an empty list when the account has no characters", () => {
    expect(parseCharEnum(Buffer.from([0]))).toEqual([]);
  });

  it("still recovers the first character if a later record is truncated", () => {
    const body = Buffer.concat([
      Buffer.from([2]),
      charRecord(1n, "Alpha"),
      new PacketWriter().u64LE(2n).cString("Beta").bytes(Buffer.alloc(10)).toBuffer(),
    ]);
    expect(parseCharEnum(body)).toEqual([{ guid: 1n, name: "Alpha" }]);
  });
});

describe("body builders", () => {
  it("buildPlayerLoginBody writes the guid as u64 LE", () => {
    expect(buildPlayerLoginBody(0x0102030405060708n).toString("hex")).toBe("0807060504030201");
  });

  it("buildPingBody writes sequence and latency", () => {
    const body = buildPingBody(5, 120);
    expect(body.readUInt32LE(0)).toBe(5);
    expect(body.readUInt32LE(4)).toBe(120);
  });
});
