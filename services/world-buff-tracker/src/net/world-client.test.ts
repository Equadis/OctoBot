import { EventEmitter } from "node:events";
import { deflateSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { VanillaHeaderCrypt } from "../crypto/header-crypt.js";
import { AUTH_OK, ChatType, GuildEvent, LANG_ADDON, WorldOpcode } from "../protocol/opcodes.js";
import type { WhoResult } from "../protocol/who.js";
import type { IncomingChat, MonsterChat } from "../protocol/chat.js";
import type { CombatEvent } from "../protocol/combat-log.js";
import type { UnitPosition } from "../protocol/movement.js";
import type { SpellCast } from "../protocol/spell-cast.js";
import { PacketReader, PacketWriter } from "./byte-buffer.js";
import type { NodeSocketLike } from "./socket.js";
import { WorldClient, type WorldClientHandlers } from "./world-client.js";

const SESSION_KEY = Buffer.from(Array.from({ length: 40 }, (_, i) => (i * 7 + 1) & 0xff));

/** One character record: guid + name + 150 skipped bytes. */
function charRecord(guid: bigint, name: string): Buffer {
  return new PacketWriter().u64LE(guid).cString(name).bytes(Buffer.alloc(150)).toBuffer();
}

function whoResponseBody(players: { name: string; area: number }[]): Buffer {
  const writer = new PacketWriter().u32LE(players.length).u32LE(players.length);
  for (const p of players) {
    writer.cString(p.name).cString("Guild").u32LE(60).u32LE(1).u32LE(2).u32LE(p.area);
  }
  return writer.toBuffer();
}

/**
 * A mock server socket that speaks the real world protocol: it decrypts the
 * client's CMSG headers (enabling its cipher right after CMSG_AUTH_SESSION, as a
 * real server does) and encrypts its SMSG replies. The client writes one full
 * frame per call, so each write carries exactly one frame.
 */
class MockServerSocket extends EventEmitter implements NodeSocketLike {
  #serverCrypt: VanillaHeaderCrypt | null = null;
  readonly #characters: { guid: bigint; name: string }[];
  readonly #names = new Map<bigint, string>();
  readonly sentWhispers: { target: string; message: string }[] = [];
  readonly standStates: number[] = [];
  readonly gameObjUses: bigint[] = [];
  readonly guildInvites: string[] = [];
  readonly nameQueries: bigint[] = [];
  readonly resurrectAnswers: { resurrector: bigint; status: number }[] = [];

  constructor(characters: { guid: bigint; name: string }[]) {
    super();
    this.#characters = characters;
  }

  #namesSilenced = false;
  #whoHeld = false;
  /** How many /who queries the client has sent. */
  whoAsked = 0;

  /** Stop answering /who on its own: replies go out only through replyWho, as a slow server's would. */
  holdWhoReplies(): void {
    this.#whoHeld = true;
  }

  /** Send a /who reply now — to whichever query the client takes it for. */
  replyWho(players: { name: string; area: number }[]): void {
    this.#sendServer(WorldOpcode.SMSG_WHO, whoResponseBody(players));
  }

  /** Stop answering name queries, as a server that never replies would. */
  silenceNameQueries(): void {
    this.#namesSilenced = true;
  }

  /** Teach the mock a guid→name mapping for name-query replies. */
  setName(guid: bigint, name: string): void {
    this.#names.set(guid, name);
  }

  /** Deliver an incoming whisper from `senderGuid` to the client, in `language` (Common by default). */
  pushWhisper(senderGuid: bigint, text: string, language: number = 7): void {
    const msg = Buffer.from(text, "utf8");
    const body = new PacketWriter()
      .u8(ChatType.Whisper)
      .u32LE(language)
      .u64LE(senderGuid)
      .u32LE(msg.length + 1)
      .bytes(msg)
      .u8(0)
      .u8(0)
      .toBuffer();
    this.#sendServer(WorldOpcode.SMSG_MESSAGECHAT, body);
  }

  /** Deliver chat from a nearby player (say/yell/emote share the whisper layout). */
  pushPlayerChat(type: number, senderGuid: bigint, text: string): void {
    const msg = Buffer.from(text, "utf8");
    const body = new PacketWriter()
      .u8(type)
      .u32LE(1)
      .u64LE(senderGuid)
      .u32LE(msg.length + 1)
      .bytes(msg)
      .u8(0)
      .u8(0)
      .toBuffer();
    this.#sendServer(WorldOpcode.SMSG_MESSAGECHAT, body);
  }

  /** Deliver any server packet as-is. */
  pushPacket(opcode: number, body: Buffer): void {
    this.#sendServer(opcode, body);
  }

  /** Deliver an SMSG_GUILD_EVENT (u8 type, u8 count, `count` cstrings). */
  pushGuildEvent(type: number, params: string[]): void {
    const writer = new PacketWriter().u8(type).u8(params.length);
    for (const p of params) writer.cString(p);
    this.#sendServer(WorldOpcode.SMSG_GUILD_EVENT, writer.toBuffer());
  }

  /** Deliver "<name> is ignoring you": CHAT_MSG_IGNORED, the ignoring player's name as its text. */
  pushIgnored(guid: bigint, name: string): void {
    const msg = Buffer.from(name, "utf8");
    const body = new PacketWriter()
      .u8(ChatType.Ignored)
      .u32LE(0)
      .u64LE(guid)
      .u32LE(msg.length + 1)
      .bytes(msg)
      .u8(0)
      .u8(0)
      .toBuffer();
    this.#sendServer(WorldOpcode.SMSG_MESSAGECHAT, body);
  }

  /** Deliver a server SYSTEM message (how command results/errors arrive) to the client. */
  pushSystem(text: string): void {
    const msg = Buffer.from(text, "utf8");
    const body = new PacketWriter()
      .u8(ChatType.System)
      .u32LE(0)
      .u64LE(0n) // system messages carry no sender
      .u32LE(msg.length + 1)
      .bytes(msg)
      .u8(0)
      .u8(0)
      .toBuffer();
    this.#sendServer(WorldOpcode.SMSG_MESSAGECHAT, body);
  }

  /** Deliver monster chat to the client — a yell by default (how the buff yell arrives), or any
   *  other monster chat type, which is how the Darkmoon heralds may speak. */
  pushMonsterYell(senderGuid: bigint, senderName: string, text: string, type: number = ChatType.MonsterYell): void {
    const name = Buffer.from(senderName, "utf8");
    const msg = Buffer.from(text, "utf8");
    const body = new PacketWriter()
      .u8(type)
      .u32LE(0)
      .u64LE(senderGuid)
      .u32LE(name.length + 1)
      .bytes(name)
      .u8(0)
      .u64LE(0n) // target guid
      .u32LE(msg.length + 1)
      .bytes(msg)
      .u8(0)
      .u8(0) // chat tag
      .toBuffer();
    this.#sendServer(WorldOpcode.SMSG_MESSAGECHAT, body);
  }

  /** Deliver a zlib-compressed object update (the login form) to the client. */
  pushCompressedObjects(raw: Buffer): void {
    const deflated = deflateSync(raw);
    const body = new PacketWriter().u32LE(raw.length).bytes(deflated).toBuffer();
    this.#sendServer(WorldOpcode.SMSG_COMPRESSED_UPDATE_OBJECT, body);
  }

  /** Tell the client a whisper target is offline. */
  pushPlayerNotFound(name: string): void {
    this.#sendServer(
      WorldOpcode.SMSG_CHAT_PLAYER_NOT_FOUND,
      new PacketWriter().cString(name).toBuffer(),
    );
  }

  /** Kick off the session the way a real server does: it speaks first. */
  begin(serverSeed: number): void {
    this.#sendServer(
      WorldOpcode.SMSG_AUTH_CHALLENGE,
      new PacketWriter().u32LE(serverSeed).toBuffer(),
    );
  }

  write(data: Buffer): boolean {
    const header = Buffer.from(data.subarray(0, 6));
    if (this.#serverCrypt) this.#serverCrypt.decryptRecv(header);
    const size = header.readUInt16BE(0);
    const opcode = header.readUInt32LE(2);
    const body = Buffer.from(data.subarray(6, 6 + (size - 4)));

    // The server enables its cipher immediately after the (plaintext) auth session.
    if (opcode === WorldOpcode.CMSG_AUTH_SESSION) {
      this.#serverCrypt = new VanillaHeaderCrypt(SESSION_KEY);
    }
    if (opcode === WorldOpcode.CMSG_MESSAGECHAT) {
      const reader = new PacketReader(body);
      reader.u32LE(); // type
      reader.u32LE(); // language
      this.sentWhispers.push({ target: reader.cString(), message: reader.cString() });
    }
    if (opcode === WorldOpcode.CMSG_STANDSTATECHANGE) {
      this.standStates.push(new PacketReader(body).u32LE());
    }
    if (opcode === WorldOpcode.CMSG_GAMEOBJ_USE) {
      this.gameObjUses.push(new PacketReader(body).u64LE());
    }
    if (opcode === WorldOpcode.CMSG_RESURRECT_RESPONSE) {
      const reader = new PacketReader(body);
      this.resurrectAnswers.push({ resurrector: reader.u64LE(), status: reader.u8() });
    }
    if (opcode === WorldOpcode.CMSG_GUILD_INVITE) {
      this.guildInvites.push(new PacketReader(body).cString());
    }
    this.#respond(opcode, body);
    return true;
  }

  destroy(): void {
    queueMicrotask(() => this.emit("close"));
  }

  #respond(opcode: number, body: Buffer): void {
    switch (opcode) {
      case WorldOpcode.CMSG_AUTH_SESSION:
        this.#sendServer(WorldOpcode.SMSG_AUTH_RESPONSE, Buffer.from([AUTH_OK]));
        break;
      case WorldOpcode.CMSG_NAME_QUERY: {
        const guid = new PacketReader(body).u64LE();
        this.nameQueries.push(guid);
        if (this.#namesSilenced) break;
        const name = this.#names.get(guid) ?? "Unknown";
        this.#sendServer(
          WorldOpcode.SMSG_NAME_QUERY_RESPONSE,
          new PacketWriter().u64LE(guid).cString(name).cString("").u32LE(1).u32LE(0).u32LE(1).toBuffer(),
        );
        break;
      }
      case WorldOpcode.CMSG_CHAR_ENUM: {
        const writer = new PacketWriter().u8(this.#characters.length);
        for (const character of this.#characters) {
          writer.bytes(charRecord(character.guid, character.name));
        }
        this.#sendServer(WorldOpcode.SMSG_CHAR_ENUM, writer.toBuffer());
        break;
      }
      case WorldOpcode.CMSG_PLAYER_LOGIN:
        this.#sendServer(WorldOpcode.SMSG_LOGIN_VERIFY_WORLD, Buffer.alloc(20));
        break;
      case WorldOpcode.CMSG_WHO:
        this.whoAsked += 1;
        if (this.#whoHeld) break;
        this.#sendServer(
          WorldOpcode.SMSG_WHO,
          whoResponseBody([
            { name: "Onytank", area: 2159 },
            { name: "Healbot", area: 2159 },
          ]),
        );
        break;
      case WorldOpcode.CMSG_PING:
        // Echo the ping sequence back as SMSG_PONG, the way the realm answers a keepalive.
        this.#sendServer(WorldOpcode.SMSG_PONG, new PacketWriter().u32LE(new PacketReader(body).u32LE()).toBuffer());
        break;
      default:
        break;
    }
  }

  #sendServer(opcode: number, body: Buffer): void {
    const header = new PacketWriter().u16BE(body.length + 2).u16LE(opcode).toBuffer();
    if (this.#serverCrypt) this.#serverCrypt.encryptSend(header);
    const frame = Buffer.concat([header, body]);
    queueMicrotask(() => this.emit("data", frame));
  }
}

function withTimeout<T>(promise: Promise<T>, ms = 1000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

describe("WorldClient (against a scripted mock server)", () => {
  it("completes the handshake, reaches the world, and parses a /who reply", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);

    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    let deliverWho: (result: WhoResult) => void = () => {};
    const whoResult = new Promise<WhoResult>((resolve) => {
      deliverWho = resolve;
    });
    const errors: Error[] = [];

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "botchar", // case-insensitive match
      clientSeed: 0x11223344,
      pingIntervalMs: 0,
      handlers: {
        onReady: () => markReady(),
        onWho: (result) => deliverWho(result),
        onError: (error) => errors.push(error),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);
    expect(client.isReady).toBe(true);

    client.requestWho({ zoneIds: [2159] });
    const result = await withTimeout(whoResult);

    expect(result.onlineCount).toBe(2);
    expect(result.players.map((p) => p.name)).toEqual(["Onytank", "Healbot"]);
    expect(result.players.every((p) => p.areaId === 2159)).toBe(true);
    expect(errors).toEqual([]);

    client.close();
  });

  it("errors clearly when the configured character is not on the account", async () => {
    const socket = new MockServerSocket([{ guid: 1n, name: "SomeoneElse" }]);

    let deliverError: (error: Error) => void = () => {};
    const errored = new Promise<Error>((resolve) => {
      deliverError = resolve;
    });

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 1,
      pingIntervalMs: 0,
      handlers: { onError: (error) => deliverError(error) },
    });

    client.start();
    socket.begin(1);

    const error = await withTimeout(errored);
    expect(error.message).toContain('character "Botchar" not found');
    expect(error.message).toContain("SomeoneElse");
    expect(client.isReady).toBe(false);

    client.close();
  });

  it("resolves a whisper sender via name query and can whisper back", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    socket.setName(0x555n, "Raider");

    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    let deliverWhisper: (v: { sender: string; text: string }) => void = () => {};
    const whispered = new Promise<{ sender: string; text: string }>((resolve) => {
      deliverWhisper = resolve;
    });

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x22,
      pingIntervalMs: 0,
      handlers: {
        onReady: () => markReady(),
        onWhisper: (sender, text) => deliverWhisper({ sender, text }),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    // The whisper carries only a guid; the client name-queries and then reports it.
    socket.pushWhisper(0x555n, "subscribe");
    expect(await withTimeout(whispered)).toEqual({ sender: "Raider", text: "subscribe" });

    client.whisper("Raider", "Subscribed!");
    expect(socket.sentWhispers).toContainEqual({ target: "Raider", message: "Subscribed!" });

    client.close();
  });

  it("surfaces a server SYSTEM message via onSystemMessage (trimmed), never as a whisper", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const system: string[] = [];
    const whispers: string[] = [];
    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x22,
      pingIntervalMs: 0,
      handlers: {
        onReady: () => markReady(),
        onSystemMessage: (text) => system.push(text),
        onWhisper: (_sender, text) => whispers.push(text),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    socket.pushSystem("  Raider is already in a guild.  ");
    await new Promise((resolve) => setImmediate(resolve));
    expect(system).toEqual(["Raider is already in a guild."]); // trimmed
    expect(whispers).toEqual([]); // a system message is never a command

    client.close();
  });

  it("tells who is ignoring us, never as a whisper or a system message", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const ignoredBy: { guid: bigint; name: string }[] = [];
    const heard: string[] = [];
    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x22,
      pingIntervalMs: 0,
      handlers: {
        onReady: () => markReady(),
        onIgnoredBy: (player) => ignoredBy.push(player),
        onSystemMessage: (text) => heard.push(text),
        onWhisper: (_sender, text) => heard.push(text),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    socket.pushIgnored(0x3b9e9f4cn, "Grumpy");
    await new Promise((resolve) => setImmediate(resolve));
    expect(ignoredBy).toEqual([{ guid: 0x3b9e9f4cn, name: "Grumpy" }]);
    expect(heard).toEqual([]);

    client.close();
  });

  it("fires onGuildJoin for a JOINED guild event, and ignores other guild events", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const joined: string[] = [];
    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x22,
      pingIntervalMs: 0,
      handlers: { onReady: () => markReady(), onGuildJoin: (name) => joined.push(name) },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    socket.pushGuildEvent(GuildEvent.Left, ["Quitter"]); // not a join → ignored
    socket.pushGuildEvent(GuildEvent.Joined, ["Raider"]); // a join → fires
    await new Promise((resolve) => setImmediate(resolve));
    expect(joined).toEqual(["Raider"]);

    client.close();
  });

  it("sends a stand-state change (sit) once in world", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);

    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x55,
      pingIntervalMs: 0,
      handlers: { onReady: () => markReady() },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    client.sit();
    expect(socket.standStates).toContain(1); // STAND_STATE_SIT

    client.close();
  });

  it("sends CMSG_GUILD_INVITE with the invitee name", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x88,
      pingIntervalMs: 0,
      handlers: { onReady: () => markReady() },
    });
    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    client.guildInvite("Raider");
    expect(socket.guildInvites).toContain("Raider");
    client.close();
  });

  it("sends CMSG_GAMEOBJ_USE with the target guid", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x66,
      pingIntervalMs: 0,
      handlers: { onReady: () => markReady() },
    });
    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    client.useGameObject(0x123456789an);
    expect(socket.gameObjUses).toContain(0x123456789an);
    client.close();
  });

  it("decompresses a compressed object update and hands over the raw block", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    let deliverObjects: (body: Buffer) => void = () => {};
    const objects = new Promise<Buffer>((resolve) => {
      deliverObjects = resolve;
    });
    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x77,
      pingIntervalMs: 0,
      handlers: { onReady: () => markReady(), onWorldObjects: (body) => deliverObjects(body) },
    });
    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    const payload = Buffer.from([1, 0, 0, 0, 5, 0xaa, 0xbb]); // arbitrary block bytes
    socket.pushCompressedObjects(payload);
    expect(await withTimeout(objects)).toEqual(payload);
    client.close();
  });

  it("routes a zone monster yell to onMonsterYell with name and text intact", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);

    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    let deliverYell: (v: { name: string; text: string }) => void = () => {};
    const yelled = new Promise<{ name: string; text: string }>((resolve) => {
      deliverYell = resolve;
    });

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x44,
      pingIntervalMs: 0,
      handlers: {
        onReady: () => markReady(),
        onMonsterYell: (name, text) => deliverYell({ name, text }),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    const yell = "The dread lady, Onyxia, hangs from the arches!";
    socket.pushMonsterYell(0n, "Major Mattingly", yell);
    expect(await withTimeout(yelled)).toEqual({ name: "Major Mattingly", text: yell });

    client.close();
  });

  it("routes an NPC SAY to onMonsterChat but not to the yell-only hook", async () => {
    // The Darkmoon heralds' chat type is unconfirmed on this realm, so the wider feed has to carry
    // says as well as yells — a yell-only hook would silently never hear them.
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);

    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    let deliverChat: (v: MonsterChat) => void = () => {};
    const chatted = new Promise<MonsterChat>((resolve) => {
      deliverChat = resolve;
    });
    const yells: string[] = [];

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x44,
      pingIntervalMs: 0,
      handlers: {
        onReady: () => markReady(),
        onMonsterChat: (chat) => deliverChat(chat),
        onMonsterYell: (_name, text) => yells.push(text),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    const announcement = "The Darkmoon Faire is coming! Come one, come all!";
    socket.pushMonsterYell(0n, "Kruban Darkblade", announcement, ChatType.MonsterSay);
    const chat = await withTimeout(chatted);
    expect(chat.senderName).toBe("Kruban Darkblade");
    expect(chat.text).toBe(announcement);
    expect(chat.type).toBe(ChatType.MonsterSay);
    expect(yells).toEqual([]);

    client.close();
  });

  it("reports an undelivered whisper when the target is offline", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);

    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    let deliverUndelivered: (target: string) => void = () => {};
    const undelivered = new Promise<string>((resolve) => {
      deliverUndelivered = resolve;
    });

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x33,
      pingIntervalMs: 0,
      handlers: {
        onReady: () => markReady(),
        onWhisperUndelivered: (target) => deliverUndelivered(target),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    socket.pushPlayerNotFound("OfflineGuy");
    expect(await withTimeout(undelivered)).toBe("OfflineGuy");

    client.close();
  });

  it("measures realm latency from the keepalive ping/pong and reports it via onLatency", async () => {
    const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
    let markReady: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    let deliverLatency: (ms: number) => void = () => {};
    const measured = new Promise<number>((resolve) => {
      deliverLatency = resolve;
    });

    const client = new WorldClient({
      socket,
      account: "BOTACCOUNT",
      sessionKey: SESSION_KEY,
      characterName: "Botchar",
      clientSeed: 0x55,
      pingIntervalMs: 5, // fire a keepalive shortly after login so the test needn't wait 30s
      handlers: {
        onReady: () => markReady(),
        onLatency: (ms) => deliverLatency(ms),
      },
    });

    client.start();
    socket.begin(0xdeadbeef);
    await withTimeout(ready);

    // The keepalive ping fires, the server echoes SMSG_PONG with the same sequence, and the
    // round-trip is measured and reported.
    expect(await withTimeout(measured)).toBeGreaterThanOrEqual(0);

    client.close();
  });
  describe("combat, nearby chat and names", () => {
    async function connect(handlers: WorldClientHandlers): Promise<{ socket: MockServerSocket; client: WorldClient }> {
      const socket = new MockServerSocket([{ guid: 0xabcdn, name: "Botchar" }]);
      let markReady: () => void = () => {};
      const ready = new Promise<void>((resolve) => {
        markReady = resolve;
      });
      const client = new WorldClient({
        socket,
        account: "BOTACCOUNT",
        sessionKey: SESSION_KEY,
        characterName: "Botchar",
        clientSeed: 0x66,
        pingIntervalMs: 0,
        handlers: { ...handlers, onReady: () => markReady() },
      });
      client.start();
      socket.begin(0xdeadbeef);
      await withTimeout(ready);
      return { socket, client };
    }

    const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

    it("routes a combat log line to onCombat", async () => {
      const events: CombatEvent[] = [];
      const { socket, client } = await connect({ onCombat: (event) => events.push(event) });

      const hit = new PacketWriter().packedGuid(0xabcdn).packedGuid(0x555n).u32LE(12294).u32LE(1240).toBuffer();
      socket.pushPacket(WorldOpcode.SMSG_SPELLNONMELEEDAMAGELOG, hit);
      await settle();
      expect(events).toEqual([{ kind: "spell", attacker: 0x555n, target: 0xabcdn, spellId: 12294, damage: 1240 }]);

      client.close();
    });

    it("routes a destroyed object's guid to onObjectDestroyed", async () => {
      const destroyed: bigint[] = [];
      const { socket, client } = await connect({ onObjectDestroyed: (guid) => destroyed.push(guid) });

      socket.pushPacket(WorldOpcode.SMSG_DESTROY_OBJECT, new PacketWriter().u64LE(0xf130_0000_5900_0abcn).toBuffer());
      await settle();
      expect(destroyed).toEqual([0xf130_0000_5900_0abcn]);

      client.close();
    });

    it("drops a destroy it cannot read without ending the session", async () => {
      const destroyed: bigint[] = [];
      const errors: Error[] = [];
      const { socket, client } = await connect({
        onObjectDestroyed: (guid) => destroyed.push(guid),
        onError: (error) => errors.push(error),
      });

      socket.pushPacket(WorldOpcode.SMSG_DESTROY_OBJECT, Buffer.from([0x01, 0x02]));
      await settle();
      expect(destroyed).toEqual([]);
      expect(errors).toEqual([]);
      expect(client.isReady).toBe(true);

      client.close();
    });

    it("never takes an addon's data, or a whisper from ourselves, for someone talking to us", async () => {
      const whispers: string[] = [];
      const chat: IncomingChat[] = [];
      const { socket, client } = await connect({
        onWhisper: (_sender, text) => whispers.push(text),
        onPlayerChat: (line) => chat.push(line),
      });
      socket.setName(0x555n, "Raider");

      socket.pushWhisper(0x555n, 'SAIO\t\u0001\u0001{{2,"OctoRadio","NowPlaying"}}', LANG_ADDON);
      socket.pushWhisper(0xabcdn, "No raid in Onyxia's Lair right now."); // our own echo
      socket.pushWhisper(0x555n, "status"); // a player — still answered
      await settle();
      await settle();
      expect(whispers).toEqual(["status"]);
      expect(chat).toEqual([]);

      client.close();
    });

    it("routes a player's movement and a creature's path to onMovement", async () => {
      const moves: UnitPosition[] = [];
      const { socket, client } = await connect({ onMovement: (move) => moves.push(move) });

      const heartbeat = new PacketWriter().packedGuid(0x555n).u32LE(1).u32LE(99).f32LE(10).f32LE(20).f32LE(30).f32LE(0).toBuffer();
      socket.pushPacket(0xee, heartbeat); // MSG_MOVE_HEARTBEAT
      const path = new PacketWriter().packedGuid(0xf130_0000_5900_0abcn).f32LE(11).f32LE(21).f32LE(31).u32LE(1).u8(0).toBuffer();
      socket.pushPacket(WorldOpcode.SMSG_MONSTER_MOVE, path);
      await settle();
      expect(moves.map((move) => move.guid)).toEqual([0x555n, 0xf130_0000_5900_0abcn]);
      expect(moves[1]?.pos.z).toBeCloseTo(31, 1);

      client.close();
    });

    it("routes a spell someone starts casting to onSpellStart", async () => {
      const casts: SpellCast[] = [];
      const { socket, client } = await connect({ onSpellStart: (cast) => casts.push(cast) });
      const inferno = new PacketWriter()
        .packedGuid(0x2f1an)
        .packedGuid(0x2f1an)
        .u32LE(1122)
        .u16LE(0x2)
        .u32LE(2000)
        .u16LE(0x40)
        .f32LE(10)
        .f32LE(20)
        .f32LE(30)
        .toBuffer();
      socket.pushPacket(WorldOpcode.SMSG_SPELL_START, inferno);
      await settle();
      expect(casts).toEqual([{ caster: 0x2f1an, spellId: 1122, destination: { x: 10, y: 20, z: 30 } }]);
      client.close();
    });

    it("passes on a resurrection offer, and sends the answer", async () => {
      const offers: bigint[] = [];
      const { socket, client } = await connect({ onResurrectRequest: (resurrector) => offers.push(resurrector) });
      socket.pushPacket(
        WorldOpcode.SMSG_RESURRECT_REQUEST,
        new PacketWriter().u64LE(0x4d2n).u32LE(1).cString("").u8(0).toBuffer(),
      );
      await settle();
      expect(offers).toEqual([0x4d2n]);

      client.answerResurrection(0x4d2n, true);
      expect(socket.resurrectAnswers).toEqual([{ resurrector: 0x4d2n, status: 1 }]);
      client.close();
    });

    it("logs out properly, and says when the server refuses", async () => {
      const { socket, client } = await connect({});
      const accepted = client.logout(1_000);
      socket.pushPacket(WorldOpcode.SMSG_LOGOUT_RESPONSE, new PacketWriter().u32LE(0).u8(1).toBuffer());
      socket.pushPacket(WorldOpcode.SMSG_LOGOUT_COMPLETE, Buffer.alloc(0));
      expect(await withTimeout(accepted)).toBe("logged-out");
      expect(await client.logout(1_000)).toBe("not-in-world"); // already out
      client.close();

      const second = await connect({});
      const refused = second.client.logout(1_000);
      second.socket.pushPacket(WorldOpcode.SMSG_LOGOUT_RESPONSE, new PacketWriter().u32LE(1).u8(0).toBuffer()); // in combat
      expect(await withTimeout(refused)).toBe("refused");
      second.client.close();
    });

    it("gives up on a logout the server never answers", async () => {
      const { client } = await connect({});
      expect(await withTimeout(client.logout(20))).toBe("timed-out");
      client.close();
    });

    it("resolves a player's name for a caller who waits on it", async () => {
      const { socket, client } = await connect({});
      socket.setName(0x555n, "Ganker");
      expect(await withTimeout(client.resolveName(0x555n, 1_000))).toBe("Ganker");
      expect(await client.resolveName(0x555n, 1_000)).toBe("Ganker"); // known: not asked again
      expect(socket.nameQueries).toEqual([0x555n]);
      client.close();
    });

    it("answers null when a name does not come back in time", async () => {
      const { socket, client } = await connect({});
      socket.silenceNameQueries();
      expect(await withTimeout(client.resolveName(0x777n, 20))).toBeNull();
      client.close();
    });

    it("drops a combat log line it cannot read without ending the session", async () => {
      const events: CombatEvent[] = [];
      const errors: Error[] = [];
      const { socket, client } = await connect({
        onCombat: (event) => events.push(event),
        onError: (error) => errors.push(error),
      });

      socket.pushPacket(WorldOpcode.SMSG_ATTACKERSTATEUPDATE, Buffer.from([0x01, 0x02]));
      await settle();
      expect(events).toEqual([]);
      expect(errors).toEqual([]);
      expect(client.isReady).toBe(true);

      client.close();
    });

    it("routes a nearby player's say to onPlayerChat, never as a whisper command", async () => {
      const chat: IncomingChat[] = [];
      const whispers: string[] = [];
      const { socket, client } = await connect({
        onPlayerChat: (line) => chat.push(line),
        onWhisper: (_sender, text) => whispers.push(text),
      });

      socket.pushPlayerChat(ChatType.Say, 0x555n, "bye bot");
      await settle();
      expect(chat).toEqual([{ type: ChatType.Say, language: 1, senderGuid: 0x555n, text: "bye bot" }]);
      expect(whispers).toEqual([]);

      client.close();
    });

    it("resolves a player's name once on request and remembers it", async () => {
      const { socket, client } = await connect({});
      socket.setName(0x555n, "Ganker");

      expect(client.playerName(0x555n)).toBeUndefined();
      client.queryName(0x555n);
      client.queryName(0x555n); // still in flight: not asked again
      await settle();
      await settle();
      expect(client.playerName(0x555n)).toBe("Ganker");
      client.queryName(0x555n); // known: not asked again
      expect(socket.nameQueries).toEqual([0x555n]);

      client.close();
    });
  });
  describe("/who replies, which carry no correlation id", () => {
    const LAIR = 2159;
    const SPIRE = 1583;

    async function inWorld(socket: MockServerSocket) {
      const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      let markReady: () => void = () => {};
      const ready = new Promise<void>((resolve) => {
        markReady = resolve;
      });
      const client = new WorldClient({
        socket,
        account: "BOTACCOUNT",
        sessionKey: SESSION_KEY,
        characterName: "Botchar",
        clientSeed: 7,
        pingIntervalMs: 0,
        logger,
        handlers: { onReady: () => markReady() },
      });
      client.start();
      socket.begin(7);
      await withTimeout(ready);
      return { client, logger };
    }

    it("lets a timed-out query's late reply land on nobody, and the next query gets its own", async () => {
      const socket = new MockServerSocket([{ guid: 1n, name: "Botchar" }]);
      socket.holdWhoReplies();
      const { client } = await inWorld(socket);

      await expect(client.whoOnce({ zoneIds: [LAIR] }, 30)).rejects.toThrow("/who timed out after 30ms");
      const spire = client.whoOnce({ zoneIds: [SPIRE] }, 500);
      expect(socket.whoAsked).toBe(1); // held back while the lair's answer may still come
      socket.replyWho([{ name: "Onytank", area: LAIR }]); // it does — and must not be taken as the Spire's
      await vi.waitFor(() => expect(socket.whoAsked).toBe(2), { timeout: 500, interval: 5 });
      socket.replyWho([{ name: "Rendslayer", area: SPIRE }]);
      expect((await spire).players.map((p) => p.name)).toEqual(["Rendslayer"]);
      client.close();
    });

    it("passes over a reply naming only players outside the zones asked about", async () => {
      const socket = new MockServerSocket([{ guid: 1n, name: "Botchar" }]);
      socket.holdWhoReplies();
      const { client, logger } = await inWorld(socket);

      const spire = client.whoOnce({ zoneIds: [SPIRE] }, 500);
      socket.replyWho([{ name: "Onytank", area: LAIR }, { name: "Healbot", area: LAIR }]);
      socket.replyWho([{ name: "Rendslayer", area: SPIRE }]);
      expect((await spire).players.map((p) => p.name)).toEqual(["Rendslayer"]);
      expect(logger.warn).toHaveBeenCalledWith(
        "/who: passed over a reply of 2 in areas [2159], none in the zones asked about — an earlier query's late answer",
      );
      client.close();
    });

    it("takes an empty reply — a zone can be empty, and nothing in it says whose it is", async () => {
      const socket = new MockServerSocket([{ guid: 1n, name: "Botchar" }]);
      socket.holdWhoReplies();
      const { client } = await inWorld(socket);

      const spire = client.whoOnce({ zoneIds: [SPIRE] }, 500);
      socket.replyWho([]);
      expect((await spire).players).toEqual([]);
      client.close();
    });

    it("sends straight away after a query answered in time", async () => {
      const socket = new MockServerSocket([{ guid: 1n, name: "Botchar" }]);
      const { client } = await inWorld(socket);

      await client.whoOnce({ zoneIds: [LAIR] }, 500);
      const second = client.whoOnce({ zoneIds: [LAIR] }, 500);
      expect(socket.whoAsked).toBe(2);
      await second;
      client.close();
    });

    it("refuses a second query while one waits out the quiet, and drops it if the connection closes", async () => {
      const socket = new MockServerSocket([{ guid: 1n, name: "Botchar" }]);
      socket.holdWhoReplies();
      const { client } = await inWorld(socket);

      await expect(client.whoOnce({ zoneIds: [LAIR] }, 30)).rejects.toThrow("timed out");
      const waiting = client.whoOnce({ zoneIds: [SPIRE] }, 500);
      await expect(client.whoOnce({ zoneIds: [LAIR] }, 500)).rejects.toThrow("a /who is already in flight");
      client.close();
      await expect(waiting).rejects.toThrow("world connection closed");
      expect(socket.whoAsked).toBe(1);
    });
  });
});
