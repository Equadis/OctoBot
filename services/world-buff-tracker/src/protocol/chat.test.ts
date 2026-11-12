import { describe, expect, it } from "vitest";
import { PacketReader, PacketWriter } from "../net/byte-buffer.js";
import { ChatType, GuildEvent, LANG_UNIVERSAL } from "./opcodes.js";
import {
  buildAddFriend,
  buildDelFriend,
  buildGuildChat,
  buildJoinChannel,
  buildWhisper,
  buildYell,
  escapeChatText,
  isMonsterChatType,
  parseChannelChat,
  parseFriendList,
  parseFriendResult,
  parseFriendStatus,
  parseGuildEvent,
  parseMonsterChat,
  parsePlayerNotFound,
  parseServerChat,
  printableAsciiRuns,
} from "./chat.js";

/** Assemble an SMSG_MESSAGECHAT CHANNEL body per the documented (unconfirmed) 1.12 layout. */
function channelChat(channelName: string, guid: bigint, text: string, language = 0): Buffer {
  const msg = Buffer.from(text, "utf8");
  return new PacketWriter()
    .u8(ChatType.Channel)
    .u32LE(language)
    .cString(channelName)
    .u32LE(0) // unused
    .u64LE(guid)
    .u32LE(msg.length + 1)
    .bytes(msg)
    .u8(0)
    .u8(0) // chat tag
    .toBuffer();
}

/** Assemble an SMSG_MESSAGECHAT player-message body the way the server would. */
function serverChat(type: number, guid: bigint, text: string, language = 7): Buffer {
  const msg = Buffer.from(text, "utf8");
  return new PacketWriter()
    .u8(type)
    .u32LE(language)
    .u64LE(guid)
    .u32LE(msg.length + 1) // length includes the null terminator
    .bytes(msg)
    .u8(0)
    .u8(0) // chat tag
    .toBuffer();
}

/** Assemble an SMSG_MESSAGECHAT monster-message body (name inline). */
function monsterChat(
  type: number,
  guid: bigint,
  senderName: string,
  text: string,
  targetGuid = 0n,
  language = 0,
): Buffer {
  const name = Buffer.from(senderName, "utf8");
  const msg = Buffer.from(text, "utf8");
  return new PacketWriter()
    .u8(type)
    .u32LE(language)
    .u64LE(guid)
    .u32LE(name.length + 1)
    .bytes(name)
    .u8(0)
    .u64LE(targetGuid)
    .u32LE(msg.length + 1)
    .bytes(msg)
    .u8(0)
    .u8(0) // chat tag
    .toBuffer();
}

describe("parseServerChat", () => {
  it("reads type, language, sender guid and text from a whisper", () => {
    const body = serverChat(ChatType.Whisper, 0x1122334455n, "subscribe");
    const chat = parseServerChat(body);
    expect(chat.type).toBe(ChatType.Whisper);
    expect(chat.language).toBe(7);
    expect(chat.senderGuid).toBe(0x1122334455n);
    expect(chat.text).toBe("subscribe");
  });

  it("stops the text at the null terminator", () => {
    const body = serverChat(ChatType.Whisper, 42n, "status");
    expect(parseServerChat(body).text).toBe("status");
  });

  it("handles UTF-8 text", () => {
    const body = serverChat(ChatType.Whisper, 1n, "héllo");
    expect(parseServerChat(body).text).toBe("héllo");
  });
});

describe("parseMonsterChat", () => {
  it("reads the sender name and text past the inline name field", () => {
    const body = monsterChat(
      ChatType.MonsterYell,
      0x9988n,
      "Major Mattingly",
      "The dread lady, Onyxia, hangs from the arches!",
    );
    const chat = parseMonsterChat(body);
    expect(chat.type).toBe(ChatType.MonsterYell);
    expect(chat.senderName).toBe("Major Mattingly");
    expect(chat.text).toBe("The dread lady, Onyxia, hangs from the arches!");
  });

  it("would misread if parsed as a player message (why the layout matters)", () => {
    const body = monsterChat(ChatType.MonsterYell, 1n, "Runthak", "For the Horde!");
    // The player parser reads the name-length u32 as the message length → not the text.
    expect(parseServerChat(body).text).not.toBe("For the Horde!");
  });
});

describe("isMonsterChatType", () => {
  it("recognises the monster chat types and rejects player ones", () => {
    expect(isMonsterChatType(ChatType.MonsterYell)).toBe(true);
    expect(isMonsterChatType(ChatType.MonsterSay)).toBe(true);
    expect(isMonsterChatType(ChatType.Whisper)).toBe(false);
    expect(isMonsterChatType(ChatType.Yell)).toBe(false);
  });

  it("takes every NPC line on 1.12's numbering: emotes, whispers and boss emotes too", () => {
    expect(isMonsterChatType(0x0d)).toBe(true); // MonsterEmote
    expect(isMonsterChatType(0x1a)).toBe(true); // MonsterWhisper
    expect(isMonsterChatType(0x5a)).toBe(true); // RaidBossEmote
    expect(isMonsterChatType(ChatType.Channel)).toBe(false);
  });

  it("reads an NPC emote line with the monster layout", () => {
    const chat = parseMonsterChat(monsterChat(ChatType.MonsterEmote, 1n, "Thrall", "Thrall grunts."));
    expect(chat).toMatchObject({ type: ChatType.MonsterEmote, senderName: "Thrall", text: "Thrall grunts." });
  });
});

describe("buildWhisper", () => {
  it("encodes a universal-language whisper to a named target", () => {
    const frame = buildWhisper("Raider", "A raid is forming!");
    const reader = new PacketReader(frame);
    expect(reader.u32LE()).toBe(ChatType.Whisper);
    expect(reader.u32LE()).toBe(LANG_UNIVERSAL);
    expect(reader.cString()).toBe("Raider");
    expect(reader.cString()).toBe("A raid is forming!");
    expect(reader.remaining).toBe(0);
  });

  it("accepts an explicit language", () => {
    const frame = buildWhisper("Raider", "hi", 7);
    const reader = new PacketReader(frame);
    reader.u32LE();
    expect(reader.u32LE()).toBe(7);
  });

  it("escapes '|' so a message with pipes isn't dropped as a bad escape sequence", () => {
    const frame = buildWhisper("Raider", "mode ingame|both|offline");
    const reader = new PacketReader(frame);
    reader.u32LE();
    reader.u32LE();
    reader.cString();
    expect(reader.cString()).toBe("mode ingame||both||offline");
  });
});

describe("buildYell", () => {
  it("encodes a universal-language yell with no target (heard by everyone nearby)", () => {
    const frame = buildYell("A raid just cleared - park in Stormwind!");
    const reader = new PacketReader(frame);
    expect(reader.u32LE()).toBe(ChatType.Yell);
    expect(reader.u32LE()).toBe(LANG_UNIVERSAL);
    expect(reader.cString()).toBe("A raid just cleared - park in Stormwind!");
    expect(reader.remaining).toBe(0);
  });

  it("accepts an explicit language", () => {
    const frame = buildYell("hi", 7);
    const reader = new PacketReader(frame);
    reader.u32LE();
    expect(reader.u32LE()).toBe(7);
  });

  it("escapes '|' so a pipe doesn't drop the yell as a bad escape sequence", () => {
    const frame = buildYell("a|b");
    const reader = new PacketReader(frame);
    reader.u32LE();
    reader.u32LE();
    expect(reader.cString()).toBe("a||b");
  });
});

describe("escapeChatText", () => {
  it("doubles every pipe and leaves other text untouched", () => {
    expect(escapeChatText("on|off")).toBe("on||off");
    expect(escapeChatText("a|b|c")).toBe("a||b||c");
    expect(escapeChatText("no pipes <here> [ok]")).toBe("no pipes <here> [ok]");
    expect(escapeChatText("")).toBe("");
  });
});

describe("parsePlayerNotFound", () => {
  it("reads the offline target's name", () => {
    const body = new PacketWriter().cString("OfflineGuy").toBuffer();
    expect(parsePlayerNotFound(body)).toBe("OfflineGuy");
  });
});

describe("buildGuildChat", () => {
  it("addresses guild chat, with pipes escaped and no target", () => {
    const reader = new PacketReader(buildGuildChat("welcome, Raider|X"));
    expect(reader.u32LE()).toBe(ChatType.Guild);
    expect(reader.u32LE()).toBe(LANG_UNIVERSAL);
    expect(reader.cString()).toBe("welcome, Raider||X");
  });
});

describe("parseGuildEvent", () => {
  it("reads a JOINED event with the new member's name", () => {
    const body = new PacketWriter().u8(GuildEvent.Joined).u8(1).cString("Raider").toBuffer();
    expect(parseGuildEvent(body)).toEqual({ type: GuildEvent.Joined, params: ["Raider"] });
  });

  it("reads a multi-string event and ignores a trailing guid (sign-on)", () => {
    const body = new PacketWriter().u8(GuildEvent.SignedOn).u8(1).cString("Raider").u64LE(0x1234n).toBuffer();
    const event = parseGuildEvent(body);
    expect(event.type).toBe(GuildEvent.SignedOn);
    expect(event.params).toEqual(["Raider"]); // trailing guid not read, doesn't corrupt the parse
  });
});

describe("buildJoinChannel", () => {
  it("writes the channel name then password as C-strings", () => {
    const reader = new PacketReader(buildJoinChannel("LFT"));
    expect(reader.cString()).toBe("LFT");
    expect(reader.cString()).toBe(""); // default empty password
  });
});

describe("buildAddFriend / parseFriendResult", () => {
  it("writes the friend name as a C-string", () => {
    expect(new PacketReader(buildAddFriend("Someplayer")).cString()).toBe("Someplayer");
  });

  it("reads the leading FriendsResult byte (e.g. list-full)", () => {
    expect(parseFriendResult(Buffer.from([0x01, 0xde, 0xad]))).toBe(0x01); // LIST_FULL
    expect(parseFriendResult(Buffer.from([0x06]))).toBe(0x06); // ADDED_ONLINE
    expect(parseFriendResult(Buffer.alloc(0))).toBe(-1); // empty body
  });
});

describe("parseFriendStatus (result + guid)", () => {
  const statusBody = (result: number, guid: bigint, extra: Buffer = Buffer.alloc(0)): Buffer =>
    Buffer.concat([new PacketWriter().u8(result).u64LE(guid).toBuffer(), extra]);

  it("reads the guid that follows the result byte", () => {
    const status = parseFriendStatus(statusBody(0x07, 0x12345n)); // ADDED_OFFLINE
    expect(status.result).toBe(0x07);
    expect(status.guid).toBe(0x12345n);
  });

  it("ignores the trailing online payload (status/area/level/class)", () => {
    const extra = new PacketWriter().u8(1).u32LE(1519).u32LE(60).u32LE(4).toBuffer();
    const status = parseFriendStatus(statusBody(0x06, 0xabcden, extra)); // ADDED_ONLINE
    expect(status.result).toBe(0x06);
    expect(status.guid).toBe(0xabcden);
  });

  it("yields 0n when the body is too short to carry a guid", () => {
    expect(parseFriendStatus(Buffer.from([0x01])).guid).toBe(0n); // LIST_FULL, no guid
    expect(parseFriendStatus(Buffer.alloc(0)).result).toBe(-1);
  });
});

describe("buildDelFriend", () => {
  it("writes the guid as a u64 (removal is by guid, not name)", () => {
    expect(new PacketReader(buildDelFriend(0xdeadbeefn)).u64LE()).toBe(0xdeadbeefn);
  });
});

describe("parseFriendList (documented layout — confirm against a live capture)", () => {
  const listBody = (entries: readonly { guid: bigint; online: boolean }[]): Buffer => {
    const w = new PacketWriter().u8(entries.length);
    for (const e of entries) {
      w.u64LE(e.guid).u8(e.online ? 1 : 0);
      if (e.online) w.u32LE(1519).u32LE(60).u32LE(4); // area, level, class only when online
    }
    return w.toBuffer();
  };

  it("extracts every guid, skipping the online entries' extra 12 bytes", () => {
    const { count, friends } = parseFriendList(
      listBody([
        { guid: 0x11n, online: false },
        { guid: 0x22n, online: true },
        { guid: 0x33n, online: false },
      ]),
    );
    expect(count).toBe(3);
    expect(friends.map((f) => f.guid)).toEqual([0x11n, 0x22n, 0x33n]);
    expect(friends.map((f) => f.online)).toEqual([false, true, false]);
  });

  it("stops cleanly on an empty or truncated body rather than throwing", () => {
    expect(parseFriendList(Buffer.alloc(0))).toEqual({ count: 0, friends: [] });
    // count says 2 but only one full entry is present — parse what fits, don't overrun.
    const truncated = Buffer.concat([Buffer.from([0x02]), new PacketWriter().u64LE(0x99n).u8(0).toBuffer()]);
    expect(parseFriendList(truncated).friends.map((f) => f.guid)).toEqual([0x99n]);
  });
});

describe("parseChannelChat (documented layout — confirm against a live capture)", () => {
  it("round-trips channel name, sender guid and text", () => {
    const body = channelChat("LFT", 0xabcdn, "OB_INC:1:A-O-Someplayer-14-32");
    const chat = parseChannelChat(body);
    expect(chat.channelName).toBe("LFT");
    expect(chat.senderGuid).toBe(0xabcdn);
    expect(chat.text).toBe("OB_INC:1:A-O-Someplayer-14-32");
  });
});

describe("printableAsciiRuns", () => {
  it("extracts the legible strings from a binary body regardless of exact offsets", () => {
    const body = channelChat("LFT", 0xabcdn, "OB_INC:1:A-O-Someplayer-14-32");
    const runs = printableAsciiRuns(body);
    expect(runs).toContain("LFT");
    expect(runs).toContain("OB_INC:1:A-O-Someplayer-14-32");
  });

  it("respects the minimum run length and splits on non-printable bytes", () => {
    const body = Buffer.from([0x41, 0x42, 0x00, 0x43, 0xff, 0x48, 0x49, 0x4a]); // "AB", "C", "HIJ"
    expect(printableAsciiRuns(body, 2)).toEqual(["AB", "HIJ"]); // "C" dropped (below min length)
  });
});
