import { createHash } from "node:crypto";
import { PacketReader, PacketWriter } from "./byte-buffer.js";
import { CLIENT_BUILD } from "../protocol/opcodes.js";

/**
 * World-server packet helpers: the auth-session proof, char enum, and the
 * client/server frame headers. Pure functions; the socket client sequences them
 * and owns the (stateful) header cipher.
 *
 * World framing:
 *   outbound (CMSG): [u16 size BE][u32 opcode LE][body]  — size = 4 + body
 *   inbound  (SMSG): [u16 size BE][u16 opcode LE][body]  — size = 2 + body
 * Only the header bytes are encrypted, and only after CMSG_AUTH_SESSION is sent.
 */

export const WORLD_CLIENT_HEADER_SIZE = 6;
export const WORLD_SERVER_HEADER_SIZE = 4;

/**
 * The addon-info block appended to CMSG_AUTH_SESSION: a 4-byte uncompressed length
 * followed by the zlib-compressed addon list. The world server parses this, so it
 * must be present. Captured verbatim from OctoWoW's real client world handshake.
 */
const ADDON_INFO = Buffer.from(
  "56010000789c75ce3d0ec2300c05e0b2730424ce423aa04a6469c38c4ce2228bc4a982cb4f4f4f18909012bc7e7ecf569e9605923bed662b14f9d835abf0d81c9a3cea6b0a443c8e84de69620a30d596881df125176c0b6b633883187c4a25d82618a57a77af8739ddf155c58e6f13da4fb02f4c834d31cbba901ec865080518f0c8f5374c0287c395bcffc7c4987eed0d09d26775",
  "hex",
);

function u32le(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value >>> 0, 0);
  return buf;
}

/** Build a CMSG frame: 6-byte plaintext header + body. Caller encrypts the header. */
export function buildWorldClientFrame(opcode: number, body: Buffer): Buffer {
  const header = new PacketWriter()
    .u16BE(body.length + 4)
    .u32LE(opcode)
    .toBuffer();
  return Buffer.concat([header, body]);
}

/** Read a decrypted 4-byte SMSG header into opcode + body length. */
export function readServerHeader(header: Buffer): { opcode: number; bodyLength: number } {
  const reader = new PacketReader(header);
  const size = reader.u16BE();
  const opcode = reader.u16LE();
  return { opcode, bodyLength: size - 2 };
}

/** SMSG_AUTH_CHALLENGE body is a single u32 server seed in 1.12. */
export function parseAuthChallenge(body: Buffer): { serverSeed: number } {
  return { serverSeed: new PacketReader(body).u32LE() };
}

/**
 * digest = SHA1( account || u32(0) || u32(clientSeed) || u32(serverSeed) || K )
 * This proves to the world server that we hold the session key from logon.
 */
export function computeAuthSessionDigest(
  account: string,
  clientSeed: number,
  serverSeed: number,
  sessionKey: Buffer,
): Buffer {
  return createHash("sha1")
    .update(Buffer.from(account.toUpperCase(), "utf8"))
    .update(u32le(0))
    .update(u32le(clientSeed))
    .update(u32le(serverSeed))
    .update(sessionKey)
    .digest();
}

/**
 * CMSG_AUTH_SESSION body. `addonInfo` defaults to the standard 1.12 addon block,
 * which the world server requires to parse the packet.
 */
export function buildAuthSessionBody(
  account: string,
  clientSeed: number,
  serverSeed: number,
  sessionKey: Buffer,
  build: number = CLIENT_BUILD,
  addonInfo: Buffer = ADDON_INFO,
): Buffer {
  const digest = computeAuthSessionDigest(account, clientSeed, serverSeed, sessionKey);
  return new PacketWriter()
    .u32LE(build)
    .u32LE(0) // login server id
    .cString(account.toUpperCase())
    .u32LE(clientSeed)
    .bytes(digest)
    .bytes(addonInfo)
    .toBuffer();
}

/** SMSG_AUTH_RESPONSE: the first body byte is the result (AUTH_OK = 0x0C). */
export function parseAuthResponse(body: Buffer): { result: number } {
  return { result: new PacketReader(body).u8() };
}

export function buildPlayerLoginBody(guid: bigint): Buffer {
  return new PacketWriter().u64LE(guid).toBuffer();
}

export function buildPingBody(sequence: number, latencyMs: number): Buffer {
  return new PacketWriter().u32LE(sequence).u32LE(latencyMs).toBuffer();
}

/** Unit stand states — SIT is the /sit emote, STAND undoes it. */
export const STAND_STATE_STAND = 0;
export const STAND_STATE_SIT = 1;

/** CMSG_STANDSTATECHANGE body: a single u32 stand state. */
export function buildStandStateBody(state: number): Buffer {
  return new PacketWriter().u32LE(state).toBuffer();
}

/** CMSG_GAMEOBJ_USE body: the target GameObject's u64 guid. */
export function buildGameObjUseBody(guid: bigint): Buffer {
  return new PacketWriter().u64LE(guid).toBuffer();
}

/** CMSG_GUILD_INVITE body: the invitee's character name as a cstring. */
export function buildGuildInviteBody(name: string): Buffer {
  return new PacketWriter().cString(name).toBuffer();
}

export interface CharacterListEntry {
  readonly guid: bigint;
  readonly name: string;
}

/**
 * Fixed bytes following a character's name in the 1.12 SMSG_CHAR_ENUM record:
 * race/class/gender, appearance, level, zone, map, position, guild, flags,
 * first-login, pet, and 20 equipment display slots (u32 + u8 each).
 */
const CHAR_ENUM_TAIL_BYTES = 3 + 5 + 1 + 4 + 4 + 12 + 4 + 4 + 1 + 12 + 20 * 5; // = 150

/**
 * Parse SMSG_CHAR_ENUM into guid+name entries. Only guid and name are needed to
 * log a character in; the rest of each record is skipped. Parsing stops early if
 * a record is truncated, so the first character (all a bot account needs) is
 * always recovered even if a later record's layout differs.
 */
export function parseCharEnum(body: Buffer): CharacterListEntry[] {
  const reader = new PacketReader(body);
  const count = reader.u8();
  const characters: CharacterListEntry[] = [];

  for (let i = 0; i < count; i += 1) {
    try {
      const guid = reader.u64LE();
      const name = reader.cString();
      reader.bytes(CHAR_ENUM_TAIL_BYTES); // consume the rest of the record before committing
      characters.push({ guid, name });
    } catch {
      break; // a truncated record ends the list rather than yielding a partial entry
    }
  }
  return characters;
}
