/**
 * The opcodes this bot uses. Values are the WoW 1.12 (build 5875) protocol.
 *
 * Auth-server commands are a single byte. World opcodes are 2 bytes on the wire
 * inbound (SMSG) and 4 bytes outbound (CMSG); the numeric value is the same.
 */

export enum AuthCommand {
  LogonChallenge = 0x00,
  LogonProof = 0x01,
  RealmList = 0x10,
}

/** Auth-server logon result codes (CMD_AUTH_LOGON_CHALLENGE_Server.result). */
export enum LogonResult {
  Success = 0x00,
  UnknownAccount = 0x04,
  IncorrectPassword = 0x05,
  Banned = 0x03,
  AlreadyOnline = 0x06,
  Suspended = 0x0c,
  VersionInvalid = 0x09,
}

export enum WorldOpcode {
  CMSG_CHAR_ENUM = 0x37,
  SMSG_CHAR_ENUM = 0x3b,
  CMSG_PLAYER_LOGIN = 0x3d,
  CMSG_LOGOUT_REQUEST = 0x4b,
  /** The answer to a logout request: u32 reason (0 = accepted), u8 instant. A refusal — in combat,
   *  say — has a non-zero reason. */
  SMSG_LOGOUT_RESPONSE = 0x4c,
  /** The character has left the world. */
  SMSG_LOGOUT_COMPLETE = 0x4d,
  CMSG_NAME_QUERY = 0x50,
  SMSG_NAME_QUERY_RESPONSE = 0x51,
  /** Ask what a CREATURE entry is called (u32 entry + u64 guid). The client's own way of
   *  labelling an NPC it has never seen, and the only way to put a name to a unit that arrives in
   *  an object update — which carries entries and guids, never names. */
  CMSG_CREATURE_QUERY = 0x60,
  SMSG_CREATURE_QUERY_RESPONSE = 0x61,
  CMSG_WHO = 0x62,
  SMSG_WHO = 0x63,
  /** Invite a player to the guild by name (cstring body). Needs the sender guilded. */
  CMSG_GUILD_INVITE = 0x82,
  /** Guild roster events broadcast to members — join/leave/promote/etc. (see GuildEvent). */
  SMSG_GUILD_EVENT = 0x92,
  CMSG_MESSAGECHAT = 0x95,
  SMSG_MESSAGECHAT = 0x96,
  /** Request the friends list (empty body). Reply SMSG_FRIEND_LIST starts with a u8 count. */
  CMSG_FRIEND_LIST = 0x66,
  /** The friends list. Body: u8 count, then per friend. Its count = how many friends are on file. */
  SMSG_FRIEND_LIST = 0x67,
  /** Add a player to the friends list (1.12 body: cstring name). Server replies SMSG_FRIEND_STATUS
   *  with a result byte + the resolved guid — a fresh add returns ADDED_ONLINE/ADDED_OFFLINE, which
   *  is the presence read the broadcast sweep is built on. */
  CMSG_ADD_FRIEND = 0x69,
  /** Remove a friend by GUID (1.12 body: u64 guid — NOT a name). The guid comes from the add reply
   *  (SMSG_FRIEND_STATUS) or the friend-list reply. Used to clear the list and to tear a sweep down. */
  CMSG_DEL_FRIEND = 0x6a,
  /** Result of a friend op / a friend's online-offline change. Body: u8 FriendsResult, u64 guid,
   *  then (only for ONLINE/ADDED_ONLINE) u8 status, u32 area, u32 level, u32 class. */
  SMSG_FRIEND_STATUS = 0x68,
  /** Join a global chat channel by name (1.12 body: cstring name, cstring password). Used to sit
   *  on Turtle's addon-comms "LFT" channel and read world-buff broadcasts. Confirm on a live join. */
  CMSG_JOIN_CHANNEL = 0x97,
  /** Nearby object create/update stream — where a GameObject's guid+entry arrive. */
  SMSG_UPDATE_OBJECT = 0xa9,
  /** An object left the world — a despawn, a dismissed pet (body: u64 guid). */
  SMSG_DESTROY_OBJECT = 0xaa,
  /** A creature near us set off on a path — where it is now, and where it is going (movement.ts). */
  SMSG_MONSTER_MOVE = 0xdd,
  /** Same, zlib-compressed (u32 uncompressed length + deflate); common on login. */
  SMSG_COMPRESSED_UPDATE_OBJECT = 0x1f6,
  /** Someone near us started casting — who, which spell, where it is aimed (spell-cast.ts). */
  SMSG_SPELL_START = 0x131,
  /** A player offers to resurrect us (resurrect.ts). */
  SMSG_RESURRECT_REQUEST = 0x15b,
  /** Our answer to that offer. */
  CMSG_RESURRECT_RESPONSE = 0x15c,
  // The combat log — every hit a nearby unit takes. Stock 1.12 values; layouts in combat-log.ts.
  /** A unit started swinging at another (u64 attacker, u64 victim). */
  SMSG_ATTACKSTART = 0x143,
  /** One melee swing landed (or missed). */
  SMSG_ATTACKERSTATEUPDATE = 0x14a,
  /** Damage from the world rather than a unit: falling, lava, drowning, fatigue. */
  SMSG_ENVIRONMENTALDAMAGELOG = 0x1fc,
  /** One tick of a damage-over-time aura. */
  SMSG_PERIODICAURALOG = 0x24e,
  /** A direct spell hit. */
  SMSG_SPELLNONMELEEDAMAGELOG = 0x250,
  /** Use/interact with a GameObject (e.g. sit on a bench); body is the u64 guid. */
  CMSG_GAMEOBJ_USE = 0xb1,
  /** Change stand state (the /sit, /stand emotes); body is a u32 state. */
  CMSG_STANDSTATECHANGE = 0x101,
  CMSG_PING = 0x1dc,
  SMSG_PONG = 0x1dd,
  SMSG_AUTH_CHALLENGE = 0x1ec,
  CMSG_AUTH_SESSION = 0x1ed,
  SMSG_AUTH_RESPONSE = 0x1ee,
  SMSG_LOGIN_VERIFY_WORLD = 0x236,
  /** Sent when a whisper target isn't online — our "character offline" signal. */
  SMSG_CHAT_PLAYER_NOT_FOUND = 0x2a9,
  SMSG_WARDEN_DATA = 0x2e6,
  CMSG_WARDEN_DATA = 0x2e7,
}

/** Chat message types (SMSG/CMSG_MESSAGECHAT `type` field), 1.12 values. */
export enum ChatType {
  Say = 0x00,
  Party = 0x01,
  Raid = 0x02,
  Guild = 0x03,
  Officer = 0x04,
  Yell = 0x05,
  Whisper = 0x06,
  WhisperInform = 0x07,
  Emote = 0x08,
  System = 0x0a,
  // Monster/NPC chat — the city buff yell arrives as MonsterYell. These carry the
  // sender's name inline, a different wire layout than player messages (see chat.ts).
  // Numbered as cmangos-classic's ChatMsg (SharedDefines.h).
  MonsterSay = 0x0b,
  MonsterYell = 0x0c,
  /** "<Thrall grunts.>" — an NPC's emote line. */
  MonsterEmote = 0x0d,
  // Global CHANNEL messages (e.g. the LFT addon-comms channel) arrive with chat type 0x0e — CONFIRMED
  // from a live capture (672 "PWB:" channel lines all came in as 0x0e), as stock 1.12 numbers it.
  Channel = 0x0e,
  // "<name> is ignoring you": the player named has us on their ignore list, and their client refused
  // something we said — a whisper, or a /say or /yell in their earshot. The text is their name, the
  // sender their GUID (cmangos-classic ChatMsg: CHAT_MSG_IGNORED = 0x16).
  Ignored = 0x16,
  MonsterWhisper = 0x1a,
  /** A boss's emote line, shown to everyone in range in raid-warning style. */
  RaidBossEmote = 0x5a,
}

/** SMSG_GUILD_EVENT `type` byte (1.12). We only act on JOINED; the rest are for logging. */
export enum GuildEvent {
  Promotion = 0,
  Demotion = 1,
  Motd = 2,
  Joined = 3,
  Left = 4,
  Removed = 5,
  LeaderIs = 6,
  LeaderChanged = 7,
  Disbanded = 8,
  SignedOn = 12,
  SignedOff = 13,
}

/**
 * FriendsResult — the leading byte of SMSG_FRIEND_STATUS (1.12 values). A fresh add resolves to
 * ADDED_ONLINE / ADDED_OFFLINE (the presence read); ALREADY carries NO online/offline field, which
 * is why the broadcast sweep clears the list first so every add is fresh. NOT_FOUND is the server's
 * reply for a name it could resolve but isn't a valid friend target; a name it CANNOT resolve
 * (renamed/deleted char) gets no reply at all — the sweep must treat that as unknown, not offline.
 */
export enum FriendsResult {
  ListFull = 0x01,
  Online = 0x02,
  Offline = 0x03,
  NotFound = 0x04,
  Removed = 0x05,
  AddedOnline = 0x06,
  AddedOffline = 0x07,
  Already = 0x08,
  Self = 0x09,
  Enemy = 0x0a,
}

/** Universal language — readable by everyone, so a whisper is never garbled. */
export const LANG_UNIVERSAL = 0;
/** The "language" addon messages travel in — an addon's data riding a chat type, never a person
 *  talking. OctoRadio's "SAIO" payload arrives this way as a whisper. */
export const LANG_ADDON = 0xffffffff;

/** SMSG_AUTH_RESPONSE result byte we treat as "you are in". */
export const AUTH_OK = 0x0c;

/**
 * Client build advertised at logon. OctoWoW's custom client reports 7272 (stock
 * 1.12.1 is 5875), and its server keys the integrity check on this build — the
 * challenge accepts 5875 but the version check does not.
 */
export const CLIENT_BUILD = 7272;
export const CLIENT_VERSION = { major: 1, minor: 12, patch: 1 } as const;
