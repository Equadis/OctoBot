import { PacketReader, PacketWriter } from "../net/byte-buffer.js";
import { ChatType, LANG_UNIVERSAL } from "./opcodes.js";

/**
 * Chat wire codecs for the whisper command interface.
 *
 * Outbound (CMSG_MESSAGECHAT) is well-defined; the inbound (SMSG_MESSAGECHAT)
 * player-message layout below is the documented 1.12 shape and MUST be confirmed
 * against a live capture (whisper the bot, dump the body) before it is trusted —
 * the same discipline used for the auth addon block and crc salt.
 *
 *   SMSG_MESSAGECHAT (player message):  u8 type, u32 language, u64 senderGuid,
 *                                       u32 msgLen (incl. null), msg, u8 chatTag
 *   SMSG_MESSAGECHAT (monster message): u8 type, u32 language, u64 senderGuid,
 *                                       u32 nameLen (incl. null), name, u64 targetGuid,
 *                                       u32 msgLen (incl. null), msg, u8 chatTag
 *   CMSG_MESSAGECHAT (whisper):         u32 type, u32 language, cstring to, cstring msg
 *
 * Monster messages (the city buff yell is one) carry the sender's name inline and a
 * target guid, so they have a DIFFERENT layout than player messages — feeding one to
 * `parseServerChat` would read the name length as the message length. This layout is
 * the documented 1.12 shape and MUST be confirmed against a live yell capture (the
 * world client debug-logs every monster message for exactly that).
 */

export interface IncomingChat {
  readonly type: number;
  readonly language: number;
  readonly senderGuid: bigint;
  readonly text: string;
}

/** Parse an SMSG_MESSAGECHAT player message. The caller gates on `type`. */
export function parseServerChat(body: Buffer): IncomingChat {
  const reader = new PacketReader(body);
  const type = reader.u8();
  const language = reader.u32LE();
  const senderGuid = reader.u64LE();
  const msgLen = reader.u32LE();
  const raw = reader.bytes(msgLen);
  const nul = raw.indexOf(0);
  const text = raw.toString("utf8", 0, nul === -1 ? raw.length : nul);
  return { type, language, senderGuid, text };
}

export interface MonsterChat {
  readonly type: number;
  readonly senderGuid: bigint;
  readonly senderName: string;
  readonly text: string;
}

const MONSTER_CHAT_TYPES: ReadonlySet<number> = new Set([
  ChatType.MonsterSay,
  ChatType.MonsterYell,
  ChatType.MonsterEmote,
  ChatType.MonsterWhisper,
  ChatType.RaidBossEmote,
]);

/** True if the chat type uses the monster layout (sender name inline). */
export function isMonsterChatType(type: number): boolean {
  return MONSTER_CHAT_TYPES.has(type);
}

/** Parse an SMSG_MESSAGECHAT monster message (name inline). Caller gates on `type`. */
export function parseMonsterChat(body: Buffer): MonsterChat {
  const reader = new PacketReader(body);
  const type = reader.u8();
  reader.u32LE(); // language
  const senderGuid = reader.u64LE();
  const nameRaw = reader.bytes(reader.u32LE());
  const nameNul = nameRaw.indexOf(0);
  const senderName = nameRaw.toString("utf8", 0, nameNul === -1 ? nameRaw.length : nameNul);
  reader.u64LE(); // target guid
  const msgRaw = reader.bytes(reader.u32LE());
  const msgNul = msgRaw.indexOf(0);
  const text = msgRaw.toString("utf8", 0, msgNul === -1 ? msgRaw.length : msgNul);
  return { type, senderGuid, senderName, text };
}

/**
 * WoW treats '|' as the chat escape/formatting prefix — colour codes (|cff...|r) and
 * hyperlinks (|Hitem:...|h) all begin with it. A bare '|' in outgoing text is a
 * malformed escape that the client drops or mangles, so the whole line silently fails
 * to display. (This is exactly how the "mode ingame|both|offline|discord" help reply
 * vanished while the pipe-free greeting arrived fine.) Doubling it is how vanilla emits
 * a literal pipe. We send only plain text, never real escapes, so escaping every '|'
 * is always correct.
 */
export function escapeChatText(message: string): string {
  return message.replace(/\|/g, "||");
}

/** Build a CMSG_MESSAGECHAT whisper to `target`. */
export function buildWhisper(target: string, message: string, language: number = LANG_UNIVERSAL): Buffer {
  return new PacketWriter()
    .u32LE(ChatType.Whisper)
    .u32LE(language)
    .cString(target)
    .cString(escapeChatText(message))
    .toBuffer();
}


/** Build a CMSG_MESSAGECHAT /yell — heard by everyone nearby in the zone, no target. */
export function buildYell(message: string, language: number = LANG_UNIVERSAL): Buffer {
  return new PacketWriter()
    .u32LE(ChatType.Yell)
    .u32LE(language)
    .cString(escapeChatText(message))
    .toBuffer();
}

/** Build a CMSG_MESSAGECHAT to guild chat (/g) — no target, like a yell. */
export function buildGuildChat(message: string, language: number = LANG_UNIVERSAL): Buffer {
  return new PacketWriter()
    .u32LE(ChatType.Guild)
    .u32LE(language)
    .cString(escapeChatText(message))
    .toBuffer();
}

/** Build a CMSG_JOIN_CHANNEL to sit on a global chat channel (1.12: name then password). */
export function buildJoinChannel(name: string, password = ""): Buffer {
  return new PacketWriter().cString(name).cString(password).toBuffer();
}

/** Build a CMSG_ADD_FRIEND (1.12 body: just the friend's name as a C-string). */
export function buildAddFriend(name: string): Buffer {
  return new PacketWriter().cString(name).toBuffer();
}

/** Build a CMSG_DEL_FRIEND (1.12 body: the friend's u64 guid — removal is by guid, never by name). */
export function buildDelFriend(guid: bigint): Buffer {
  return new PacketWriter().u64LE(guid).toBuffer();
}

/** Parse the leading FriendsResult byte of SMSG_FRIEND_STATUS (0x01 = list full, 0x06/0x07 = added
 *  online/offline, 0x08 = already, 0x0a = enemy/opposite-faction, 0x04 = not found). */
export function parseFriendResult(body: Buffer): number {
  return body.length > 0 ? body.readUInt8(0) : -1;
}

export interface FriendStatus {
  /** FriendsResult byte — a fresh add is ADDED_ONLINE (0x06) / ADDED_OFFLINE (0x07). */
  readonly result: number;
  /** The resolved player guid; needed to remove this friend (CMSG_DEL_FRIEND takes a guid). 0n if
   *  the body was too short to carry one (the result was an error with no guid, or a malformed body). */
  readonly guid: bigint;
}

/**
 * Parse SMSG_FRIEND_STATUS: u8 result, u64 guid, then (only for ONLINE/ADDED_ONLINE) u8 status,
 * u32 area, u32 level, u32 class. The sweep needs the guid to remove the friend afterwards, so we
 * read past the bare result byte `parseFriendResult` returns. Bounds-guarded: a short body yields 0n.
 */
export function parseFriendStatus(body: Buffer): FriendStatus {
  const reader = new PacketReader(body);
  const result = reader.remaining >= 1 ? reader.u8() : -1;
  const guid = reader.remaining >= 8 ? reader.u64LE() : 0n;
  return { result, guid };
}

/** The number of friends in an SMSG_FRIEND_LIST — the count is its first byte. */
export function parseFriendListCount(body: Buffer): number {
  return body.length > 0 ? body.readUInt8(0) : 0;
}

export interface FriendListEntry {
  readonly guid: bigint;
  readonly online: boolean;
}

/**
 * Parse the full SMSG_FRIEND_LIST so the sweep can clear the list (it deletes by guid, which this
 * yields) and read who is online. Layout: u8 count, then per friend u64 guid, u8 status, and — only
 * when status is non-zero (any online-ish state) — u32 area, u32 level, u32 class. Every read is
 * bounds-checked against `remaining` so a truncated or mis-shaped body stops cleanly rather than
 * throwing. This is the DOCUMENTED 1.12 layout and MUST be confirmed against a live capture (the
 * sweep logs the raw bytes on its first list read) before the per-entry offsets are trusted.
 */
export function parseFriendList(body: Buffer): { count: number; friends: FriendListEntry[] } {
  const reader = new PacketReader(body);
  if (reader.remaining < 1) return { count: 0, friends: [] };
  const count = reader.u8();
  const friends: FriendListEntry[] = [];
  for (let i = 0; i < count && reader.remaining >= 9; i += 1) {
    const guid = reader.u64LE();
    const online = reader.u8() !== 0;
    if (online) {
      if (reader.remaining < 12) {
        friends.push({ guid, online });
        break;
      }
      reader.u32LE(); // area
      reader.u32LE(); // level
      reader.u32LE(); // class
    }
    friends.push({ guid, online });
  }
  return { count, friends };
}

export interface ChannelChat {
  readonly channelName: string;
  readonly senderGuid: bigint;
  readonly text: string;
}

/**
 * Parse an SMSG_MESSAGECHAT CHANNEL message. The 1.12 channel layout inserts the channel name
 * (and an unused u32) before the sender guid, unlike the player/monster layouts:
 *   u8 type, u32 language, cstring channelName, u32 unused, u64 senderGuid, u32 msgLen, msg, u8 tag
 * This is the DOCUMENTED shape and MUST be confirmed against a live capture before it is trusted —
 * the observe hook logs the raw bytes and `printableAsciiRuns` alongside it for exactly that, so the
 * channel name and message text stay legible even if these offsets are wrong.
 */
export function parseChannelChat(body: Buffer): ChannelChat {
  const reader = new PacketReader(body);
  reader.u8(); // type
  reader.u32LE(); // language
  const channelName = reader.cString();
  reader.u32LE(); // unused (player rank / flag)
  const senderGuid = reader.u64LE();
  const raw = reader.bytes(reader.u32LE());
  const nul = raw.indexOf(0);
  const text = raw.toString("utf8", 0, nul === -1 ? raw.length : nul);
  return { channelName, senderGuid, text };
}

/** Printable ASCII runs (>= `minLen` chars) in a packet body — for logging an unconfirmed layout
 *  so the real channel name and message text are legible before the exact offsets are pinned. */
export function printableAsciiRuns(body: Buffer, minLen = 2): string[] {
  const runs: string[] = [];
  let cur = "";
  for (const byte of body) {
    if (byte >= 0x20 && byte < 0x7f) {
      cur += String.fromCharCode(byte);
    } else {
      if (cur.length >= minLen) runs.push(cur);
      cur = "";
    }
  }
  if (cur.length >= minLen) runs.push(cur);
  return runs;
}

/** SMSG_CHAT_PLAYER_NOT_FOUND body is the offline target's name as a CString. */
export function parsePlayerNotFound(body: Buffer): string {
  return new PacketReader(body).cString();
}

export interface GuildEventMessage {
  /** The event type (see GuildEvent) — Joined is the one we act on. */
  readonly type: number;
  /** String params: for a JOIN/LEAVE/SIGN-ON, params[0] is the character name. */
  readonly params: string[];
}

/**
 * Parse SMSG_GUILD_EVENT: u8 type, u8 count, then `count` CStrings. Some events (sign on/off)
 * append a u64 guid after the strings, which we don't read — we only need the type and names.
 * The documented 1.12 layout; confirm against a real join (every event is logged) before trusting.
 */
export function parseGuildEvent(body: Buffer): GuildEventMessage {
  const reader = new PacketReader(body);
  const type = reader.u8();
  const count = reader.u8();
  const params: string[] = [];
  for (let i = 0; i < count; i += 1) params.push(reader.cString());
  return { type, params };
}
