import { describe, expect, it } from "vitest";
import { PacketWriter } from "./byte-buffer.js";
import {
  buildLogonChallenge,
  buildLogonProof,
  parseLogonChallengeServer,
  parseLogonProofServer,
  parseRealmList,
} from "./auth-packets.js";
import { LogonResult } from "../protocol/opcodes.js";

describe("buildLogonChallenge", () => {
  it("emits the 1.12 client challenge with the account uppercased", () => {
    const packet = buildLogonChallenge("test");
    const hex = packet.toString("hex");

    expect(packet[0]).toBe(0x00); // opcode
    expect(packet[1]).toBe(0x03); // protocol version (matches the OctoWoW client)
    expect(packet.readUInt16LE(2)).toBe(packet.length - 4); // size covers the rest
    expect(hex).toContain("576f5700"); // "WoW\0"
    expect(hex).toContain("010c01"); // version 1.12.1
    expect(hex).toContain("681c"); // build 7272 LE (OctoWoW custom build)
    expect(hex).toContain("36387800"); // "x86" reversed
    expect(hex).toContain("6e695700"); // "Win" reversed
    expect(hex).toContain("42476e65"); // "enGB" reversed
    expect(hex).toContain("7f000001"); // client ip 127.0.0.1
    expect(hex.endsWith("54455354")).toBe(true); // "TEST"
    expect(packet[packet.length - 5]).toBe(4); // account name length
  });
});

describe("buildLogonProof", () => {
  it("is opcode 0x01 followed by A, M1, crc, and two zero bytes", () => {
    const a = Buffer.alloc(32, 0xab);
    const m1 = Buffer.alloc(20, 0xcd);
    const packet = buildLogonProof(a, m1);

    expect(packet.length).toBe(1 + 32 + 20 + 20 + 1 + 1);
    expect(packet[0]).toBe(0x01);
    expect(packet.subarray(1, 33).equals(a)).toBe(true);
    expect(packet.subarray(33, 53).equals(m1)).toBe(true);
    expect(packet.subarray(53, 73).equals(Buffer.alloc(20))).toBe(true); // crc defaults to zeros
  });

  it("carries the provided crc_hash for StrictVersionCheck servers", () => {
    const crc = Buffer.alloc(20, 0x5a);
    const packet = buildLogonProof(Buffer.alloc(32), Buffer.alloc(20), crc);
    expect(packet.subarray(53, 73).equals(crc)).toBe(true);
  });

  it("rejects a wrong-sized crc_hash", () => {
    expect(() => buildLogonProof(Buffer.alloc(32), Buffer.alloc(20), Buffer.alloc(19))).toThrow(
      /crc_hash must be 20/,
    );
  });

  it("rejects wrong-sized A or M1", () => {
    expect(() => buildLogonProof(Buffer.alloc(31), Buffer.alloc(20))).toThrow(/A must be 32/);
    expect(() => buildLogonProof(Buffer.alloc(32), Buffer.alloc(19))).toThrow(/M1 must be 20/);
  });
});

describe("parseLogonChallengeServer", () => {
  it("reads B, g, N and salt on success", () => {
    const packet = new PacketWriter()
      .u8(0x00) // opcode
      .u8(0x00) // unknown
      .u8(LogonResult.Success)
      .bytes(Buffer.alloc(32, 0xaa)) // B
      .u8(1)
      .bytes(Buffer.from([7])) // g
      .u8(32)
      .bytes(Buffer.alloc(32, 0xbb)) // N
      .bytes(Buffer.alloc(32, 0xcc)) // salt
      .bytes(Buffer.alloc(16, 0xdd)) // crc salt (ignored)
      .toBuffer();

    const parsed = parseLogonChallengeServer(packet);
    expect(parsed.result).toBe(LogonResult.Success);
    expect(parsed.serverPublicKey?.equals(Buffer.alloc(32, 0xaa))).toBe(true);
    expect(parsed.generator?.equals(Buffer.from([7]))).toBe(true);
    expect(parsed.largeSafePrime?.equals(Buffer.alloc(32, 0xbb))).toBe(true);
    expect(parsed.salt?.equals(Buffer.alloc(32, 0xcc))).toBe(true);
  });

  it("returns just the result code on failure", () => {
    const packet = Buffer.from([0x00, 0x00, LogonResult.UnknownAccount]);
    const parsed = parseLogonChallengeServer(packet);
    expect(parsed.result).toBe(LogonResult.UnknownAccount);
    expect(parsed.serverPublicKey).toBeUndefined();
  });
});

describe("parseLogonProofServer", () => {
  it("reads M2 on success", () => {
    const m2 = Buffer.alloc(20, 0x42);
    const packet = new PacketWriter().u8(0x01).u8(LogonResult.Success).bytes(m2).toBuffer();
    const parsed = parseLogonProofServer(packet);
    expect(parsed.serverProof?.equals(m2)).toBe(true);
  });

  it("returns the result code on failure", () => {
    const parsed = parseLogonProofServer(Buffer.from([0x01, LogonResult.IncorrectPassword]));
    expect(parsed.result).toBe(LogonResult.IncorrectPassword);
    expect(parsed.serverProof).toBeUndefined();
  });
});

describe("parseRealmList", () => {
  it("extracts realm names and addresses", () => {
    const payload = new PacketWriter()
      .u32LE(0) // unknown
      .u8(1) // realm count
      .u32LE(0) // icon
      .u8(0) // flags
      .cString("Turtle WoW")
      .cString("51.15.0.1:8085")
      .f32LE(2) // population (raw float — captured, meaning is core-specific)
      .u8(40) // characters
      .u8(1) // timezone
      .u8(1) // realm id
      .toBuffer();

    expect(parseRealmList(payload)).toEqual([
      { name: "Turtle WoW", address: "51.15.0.1:8085", population: 2, characters: 40 },
    ]);
  });
});
