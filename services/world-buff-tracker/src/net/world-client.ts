import { randomBytes } from "node:crypto";
import { inflateSync } from "node:zlib";
import { VanillaHeaderCrypt } from "../crypto/header-crypt.js";
import { FatalError } from "../errors.js";
import { AUTH_OK, ChatType, CLIENT_BUILD, GuildEvent, LANG_ADDON, WorldOpcode } from "../protocol/opcodes.js";
import { buildWhoRequestBody, parseWhoResponseBody, type WhoQuery, type WhoResult } from "../protocol/who.js";
import {
  buildAddFriend,
  buildDelFriend,
  buildGuildChat,
  buildJoinChannel,
  buildWhisper,
  buildYell,
  isMonsterChatType,
  parseChannelChat,
  parseFriendList,
  parseFriendStatus,
  parseGuildEvent,
  parseMonsterChat,
  parsePlayerNotFound,
  parseServerChat,
  type FriendListEntry,
  type MonsterChat,
  type FriendStatus,
  type IncomingChat,
} from "../protocol/chat.js";
import {
  parseAttackerStateUpdate,
  parseAttackStart,
  parseEnvironmentalDamage,
  parsePeriodicAuraLog,
  parseSpellDamageLog,
  type CombatEvent,
} from "../protocol/combat-log.js";
import { buildNameQuery, parseNameQueryResponse } from "../protocol/name-query.js";
import { buildCreatureQuery, parseCreatureQueryResponse } from "../protocol/creature-query.js";
import { parseDestroyObject } from "../protocol/update-object.js";
import { parseMonsterMove, parsePlayerMovement, PLAYER_MOVEMENT_OPCODES, type UnitPosition } from "../protocol/movement.js";
import { parseSpellStart, type SpellCast } from "../protocol/spell-cast.js";
import { buildResurrectResponse, parseResurrectRequest } from "../protocol/resurrect.js";
import { silentLogger, type Logger } from "../logger.js";
import type { NodeSocketLike } from "./socket.js";
import {
  buildAuthSessionBody,
  buildGameObjUseBody,
  buildGuildInviteBody,
  buildPingBody,
  buildPlayerLoginBody,
  buildStandStateBody,
  buildWorldClientFrame,
  parseAuthChallenge,
  parseAuthResponse,
  parseCharEnum,
  readServerHeader,
  STAND_STATE_SIT,
  WORLD_CLIENT_HEADER_SIZE,
  WORLD_SERVER_HEADER_SIZE,
} from "./world-packets.js";
import { pongLatency } from "../realm-health.js";

export interface WorldClientHandlers {
  /** Character is in the world; /who can now be requested. */
  onReady?: () => void;
  onWho?: (result: WhoResult) => void;
  /** A player whispered the bot; `sender` is resolved to a character name. */
  onWhisper?: (sender: string, text: string) => void;
  /** A whisper we sent could not be delivered — the target is offline. */
  onWhisperUndelivered?: (target: string) => void;
  /** "<name> is ignoring you": a player with us on their ignore list refused something we said —
   *  a whisper, or a /say or /yell in their earshot. */
  onIgnoredBy?: (player: { readonly guid: bigint; readonly name: string }) => void;
  /** An NPC yelled to the zone (raw). The wiring layer decides if it is a buff yell. */
  onMonsterYell?: (senderName: string, text: string) => void;
  /** Any NPC chat — say, yell or whisper — with its chat type. Separate from `onMonsterYell`
   *  because a buff yell is definitively a YELL and gains nothing from the wider feed, while the
   *  Darkmoon heralds' chat type is unconfirmed on this realm and would be missed by a yell-only
   *  hook. The wiring layer decides what each line means. */
  onMonsterChat?: (chat: MonsterChat) => void;
  /** Reply to a creature query: what an NPC entry is called. `name` is null when the server does
   *  not know the entry. Fires once per entry asked about. */
  onCreatureName?: (entry: number, name: string | null) => void;
  /** A message on a global chat CHANNEL we joined (e.g. Turtle's "LFT" addon-comms channel). The
   *  raw body is passed too, since the channel layout is unconfirmed — the wiring logs it. */
  onChannelMessage?: (channelName: string, senderGuid: bigint, text: string, raw: Buffer) => void;
  /** Result of a friend op / a friend's presence change (SMSG_FRIEND_STATUS): the FriendsResult and
   *  the resolved guid. A fresh add is ADDED_ONLINE/ADDED_OFFLINE — the presence read the broadcast
   *  sweep gates on — and the guid is what a later DEL needs. */
  onFriendStatus?: (status: FriendStatus) => void;
  /** The friends-list reply (SMSG_FRIEND_LIST): the count plus each friend's guid and online flag —
   *  the sweep clears the list by guid. */
  onFriendList?: (list: { count: number; friends: FriendListEntry[] }) => void;
  /** A server SYSTEM message — how the server reports command results/errors (e.g. a guild
   *  invite that failed). The wiring layer decides which ones are errors worth alerting on. */
  onSystemMessage?: (text: string) => void;
  /** A player just JOINED our guild (from SMSG_GUILD_EVENT) — e.g. accepted our invite. */
  onGuildJoin?: (name: string) => void;
  /** A player LEFT or was removed from our guild (SMSG_GUILD_EVENT) — used to keep the count of
   *  active guildies who joined via the bot accurate. */
  onGuildLeave?: (name: string) => void;
  /** A player nearby said, yelled or emoted something — our own lines included, since the server
   *  echoes them back. */
  onPlayerChat?: (chat: IncomingChat) => void;
  /** A combat log line: some unit attacked, hit or was hurt by the world. Every one in range, not
   *  only ours — the wiring filters by target. */
  onCombat?: (event: CombatEvent) => void;
  /** A decompressed nearby-object update block, for parsing GameObjects (e.g. a bench). */
  onWorldObjects?: (body: Buffer) => void;
  /** An object nearby was removed from the world (despawned, dismissed) rather than walking out of view. */
  onObjectDestroyed?: (guid: bigint) => void;
  /** A player or creature near us moved: where it is now (see protocol/movement.ts). */
  onMovement?: (move: UnitPosition) => void;
  /** Someone near us started casting a spell — who, which, and where it is aimed. */
  onSpellStart?: (cast: SpellCast) => void;
  /** A player is offering to resurrect us; answer with `answerResurrection`. */
  onResurrectRequest?: (resurrector: bigint) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  /** Server sent warden data — anticheat is active and unhandled. */
  onWarden?: () => void;
  /** Round-trip latency (ms) of the keepalive ping just answered by SMSG_PONG — the realm's world
   *  latency. Fires once per matched pong (~every pingIntervalMs). */
  onLatency?: (rttMs: number) => void;
}

/** How a logout request ended — see `WorldClient.logout`. */
export type LogoutOutcome = "logged-out" | "refused" | "timed-out" | "not-in-world";

/** Player chat the rest of the zone can hear — the lines worth keeping as context. */
const PLAYER_CHAT_TYPES: ReadonlySet<number> = new Set([ChatType.Say, ChatType.Yell, ChatType.Emote]);

export interface WorldClientOptions {
  readonly socket: NodeSocketLike;
  readonly account: string;
  readonly sessionKey: Buffer;
  readonly characterName: string;
  readonly handlers?: WorldClientHandlers;
  readonly logger?: Logger;
  /** Ping interval once in world; 0 disables. Default 30s. */
  readonly pingIntervalMs?: number;
  /** Test seam: fixed 4-byte client seed. Defaults to secure random. */
  readonly clientSeed?: number;
  /** Client build for the world auth session. Defaults to CLIENT_BUILD. */
  readonly build?: number;
}

/**
 * Drives the world-server session: auth handshake, character login, keep-alive
 * pings, and /who requests. Feeds on a socket-like injected by the caller, so a
 * scripted mock server exercises the whole state machine in tests.
 */
/** A whoOnce() in flight. */
interface PendingWho {
  readonly resolve: (result: WhoResult) => void;
  readonly reject: (error: Error) => void;
  /** Sends the query once the quiet is over, then times it out; null for the moment in between. */
  timer: NodeJS.Timeout | null;
  /** The zones asked about; empty when the query named none. */
  readonly zoneIds: ReadonlySet<number>;
  /** False while the query waits out the quiet — any reply then answers an earlier one. */
  sent: boolean;
}

export class WorldClient {
  readonly #socket: NodeSocketLike;
  readonly #account: string;
  readonly #sessionKey: Buffer;
  readonly #characterName: string;
  #selfGuid: bigint | null = null;
  readonly #handlers: WorldClientHandlers;
  readonly #logger: Logger;
  readonly #pingIntervalMs: number;
  readonly #clientSeed: number;
  readonly #build: number;

  #crypt: VanillaHeaderCrypt | null = null;
  #recvBuffer = Buffer.alloc(0);
  #pendingHeader: { opcode: number; bodyLength: number } | null = null;
  /** Resolver for an in-flight whoOnce() — one /who at a time, so replies are in order. */
  #whoPending: PendingWho | null = null;
  /** Until when a timed-out /who's reply may still straggle in. A /who has no correlation id, so a
   *  query sent before then could be handed the old one's answer; it waits instead. */
  #whoQuietUntil = 0;
  #ready = false;
  #closed = false;
  #pingTimer: NodeJS.Timeout | null = null;
  #pingSequence = 0;
  /** The keepalive ping awaiting its pong, to measure round-trip latency. */
  #pendingPing: { seq: number; sentAt: number } | null = null;
  /** Resolved sender names, and whispers held while a name query is in flight. */
  readonly #nameCache = new Map<bigint, string>();
  readonly #pendingWhispers = new Map<bigint, string[]>();
  /** Name queries sent on request (not for a whisper) and not answered yet. */
  readonly #pendingNames = new Set<bigint>();
  /** Callers waiting on a name query's answer, by guid — see `resolveName`. */
  readonly #nameWaiters = new Map<bigint, ((name: string | null) => void)[]>();
  /** Settles the logout in progress — see `logout`. */
  #pendingLogout: ((outcome: LogoutOutcome) => void) | null = null;

  constructor(options: WorldClientOptions) {
    this.#socket = options.socket;
    this.#account = options.account;
    this.#sessionKey = options.sessionKey;
    this.#characterName = options.characterName;
    this.#handlers = options.handlers ?? {};
    this.#logger = options.logger ?? silentLogger;
    this.#pingIntervalMs = options.pingIntervalMs ?? 30_000;
    this.#clientSeed = options.clientSeed ?? randomBytes(4).readUInt32LE(0);
    this.#build = options.build ?? CLIENT_BUILD;
  }

  get isReady(): boolean {
    return this.#ready;
  }

  /** Attach socket listeners; the server speaks first with SMSG_AUTH_CHALLENGE. */
  start(): void {
    this.#socket.on("data", (chunk: Buffer) => this.#onData(chunk));
    this.#socket.on("error", (error: Error) => this.#handlers.onError?.(error));
    this.#socket.on("close", () => this.#onClose());
  }

  requestWho(query: WhoQuery): void {
    if (!this.#ready) throw new Error("cannot /who before the character is in world");
    this.#send(WorldOpcode.CMSG_WHO, buildWhoRequestBody(query));
  }

  /**
   * Send one /who and resolve with its reply. Only one may be in flight — /who has
   * no correlation id, so the caller must await each before sending the next (used
   * to slice a query by class and merge, beating the 49-result cap).
   *
   * Because nothing ties a reply to its query, a reply that comes after its query timed out would
   * be taken as the NEXT query's — another zone's roster read as the lair's, say. So after a timeout the
   * next query waits as long again before it goes out, letting a straggler land with nothing
   * waiting; and a reply naming only players outside the zones a query asked about is not its
   * reply, so it is passed over while the query waits on.
   */
  whoOnce(query: WhoQuery, timeoutMs = 8_000): Promise<WhoResult> {
    if (!this.#ready) return Promise.reject(new Error("cannot /who before the character is in world"));
    if (this.#whoPending) return Promise.reject(new Error("a /who is already in flight"));
    return new Promise<WhoResult>((resolve, reject) => {
      let started = 0;
      // Surface the round-trip so a creep toward the timeout is visible BEFORE it starts
      // failing — under peak load /who slows down, and a silent timeout hides why.
      const timedResolve = (result: WhoResult): void => {
        const elapsed = Date.now() - started;
        if (elapsed > timeoutMs / 2) this.#logger.warn(`/who slow: ${elapsed}ms (timeout ${timeoutMs}ms)`);
        else this.#logger.debug(`/who replied in ${elapsed}ms`);
        resolve(result);
      };
      const send = (): void => {
        const pending = this.#whoPending;
        if (!pending) return;
        started = Date.now();
        pending.sent = true;
        const timeout = setTimeout(() => {
          this.#whoPending = null;
          this.#whoQuietUntil = Date.now() + timeoutMs;
          reject(new Error(`/who timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        timeout.unref?.();
        pending.timer = timeout;
        this.#send(WorldOpcode.CMSG_WHO, buildWhoRequestBody(query));
      };
      const pending: PendingWho = { resolve: timedResolve, reject, timer: null, zoneIds: new Set(query.zoneIds), sent: false };
      this.#whoPending = pending;
      const quietMs = this.#whoQuietUntil - Date.now();
      if (quietMs <= 0) {
        send();
        return;
      }
      this.#logger.debug(`/who: holding a query ${quietMs}ms, until a timed-out one's reply can no longer straggle in`);
      const wait = setTimeout(send, quietMs);
      wait.unref?.();
      pending.timer = wait;
    });
  }

  /** A /who reply: to the query waiting on it, if it can be that query's; else passed over. */
  #handleWho(result: WhoResult): void {
    const pending = this.#whoPending;
    if (!pending) {
      if (this.#handlers.onWho) this.#handlers.onWho(result);
      else this.#logger.debug(`/who: a reply of ${result.players.length} came with nothing waiting — dropped`);
      return;
    }
    if (!pending.sent) {
      this.#logger.debug(`/who: a late reply of ${result.players.length} came during the quiet — dropped`);
      return;
    }
    const elsewhere =
      pending.zoneIds.size > 0 &&
      result.players.length > 0 &&
      result.players.every((player) => !pending.zoneIds.has(player.areaId));
    if (elsewhere) {
      const areas = [...new Set(result.players.map((player) => player.areaId))].join(", ");
      this.#logger.warn(
        `/who: passed over a reply of ${result.players.length} in areas [${areas}], none in the zones asked about — ` +
          "an earlier query's late answer",
      );
      return;
    }
    if (pending.timer) clearTimeout(pending.timer);
    this.#whoPending = null;
    pending.resolve(result);
  }

  #rejectWho(reason: string): void {
    if (!this.#whoPending) return;
    if (this.#whoPending.timer) clearTimeout(this.#whoPending.timer);
    const { reject } = this.#whoPending;
    this.#whoPending = null;
    reject(new Error(reason));
  }

  /** Whisper a player by character name. */
  whisper(target: string, message: string): void {
    if (!this.#ready) throw new Error("cannot whisper before the character is in world");
    // INFO, not debug: an outgoing whisper is a message this character sent, and we
    // want it visible in the logs (the logger is per-character, so it's already tagged).
    this.#logger.info(`whisper -> ${target}: ${JSON.stringify(message)}`);
    this.#send(WorldOpcode.CMSG_MESSAGECHAT, buildWhisper(target, message));
  }

  /** /yell — heard by everyone nearby in the zone (used to broadcast in a capital). */
  /** Accept or decline `resurrector`'s offer to resurrect us. */
  answerResurrection(resurrector: bigint, accept: boolean): void {
    if (!this.#ready) throw new Error("cannot answer a resurrection before the character is in world");
    this.#send(WorldOpcode.CMSG_RESURRECT_RESPONSE, buildResurrectResponse(resurrector, accept));
  }

  yell(message: string): void {
    if (!this.#ready) throw new Error("cannot yell before the character is in world");
    this.#logger.info(`yell: ${JSON.stringify(message)}`);
    this.#send(WorldOpcode.CMSG_MESSAGECHAT, buildYell(message));
  }

  /** Join a global chat channel (e.g. Turtle's addon-comms "LFT" channel) to READ its messages —
   *  they then arrive as onChannelMessage. We only listen; nothing is ever sent to the channel. */
  joinChannel(name: string): void {
    if (!this.#ready) throw new Error("cannot join a channel before the character is in world");
    this.#logger.info(`joining channel ${JSON.stringify(name)}`);
    this.#send(WorldOpcode.CMSG_JOIN_CHANNEL, buildJoinChannel(name));
  }

  /** Add a player to the friends list by name. The result (with the resolved guid) arrives as
   *  onFriendStatus. A name the server cannot resolve gets no reply at all. */
  addFriend(name: string): void {
    if (!this.#ready) throw new Error("cannot add a friend before the character is in world");
    this.#send(WorldOpcode.CMSG_ADD_FRIEND, buildAddFriend(name));
  }

  /** Remove a friend by guid (the guid comes from onFriendStatus/onFriendList — DEL is never by
   *  name). Used to clear the friends list and to tear down a presence sweep. */
  delFriend(guid: bigint): void {
    if (!this.#ready) throw new Error("cannot remove a friend before the character is in world");
    this.#send(WorldOpcode.CMSG_DEL_FRIEND, buildDelFriend(guid));
  }

  /** Request the friends list; it comes back via onFriendList (count + each guid and online flag). */
  requestFriendList(): void {
    if (!this.#ready) throw new Error("cannot request the friends list before the character is in world");
    this.#send(WorldOpcode.CMSG_FRIEND_LIST, Buffer.alloc(0));
  }

  /** Post to guild chat (/g) — used to welcome a new member. Needs the character guilded. */
  guildChat(message: string): void {
    if (!this.#ready) throw new Error("cannot guild-chat before the character is in world");
    this.#logger.info(`guild chat: ${JSON.stringify(message)}`);
    this.#send(WorldOpcode.CMSG_MESSAGECHAT, buildGuildChat(message));
  }

  /** Sit the character down (the /sit stand-state) — used to look parked in a city. */
  sit(): void {
    if (!this.#ready) throw new Error("cannot sit before the character is in world");
    this.#logger.debug("world: /sit");
    this.#send(WorldOpcode.CMSG_STANDSTATECHANGE, buildStandStateBody(STAND_STATE_SIT));
  }

  /** Our own character's GUID once logged in, else null — used to pick our position out of
   *  an object-update packet that also carries nearby players. */
  get selfGuid(): bigint | null {
    return this.#selfGuid;
  }

  /** Use/interact with a GameObject by guid (e.g. sit on a bench). */
  useGameObject(guid: bigint): void {
    if (!this.#ready) throw new Error("cannot use a game object before the character is in world");
    this.#logger.debug(`world: use gameobject 0x${guid.toString(16)}`);
    this.#send(WorldOpcode.CMSG_GAMEOBJ_USE, buildGameObjUseBody(guid));
  }

  /** Invite a player to the guild by character name (no-op server-side if not guilded). */
  guildInvite(name: string): void {
    if (!this.#ready) throw new Error("cannot guild-invite before the character is in world");
    this.#logger.debug(`world: guild invite -> ${name}`);
    this.#send(WorldOpcode.CMSG_GUILD_INVITE, buildGuildInviteBody(name));
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#pingTimer) clearInterval(this.#pingTimer);
    this.#pingTimer = null;
    this.#socket.destroy();
  }

  #onClose(): void {
    if (this.#pingTimer) clearInterval(this.#pingTimer);
    this.#pingTimer = null;
    this.#rejectWho("world connection closed");
    for (const waiters of this.#nameWaiters.values()) for (const waiter of waiters) waiter(null);
    this.#nameWaiters.clear();
    this.#pendingLogout?.("timed-out");
    if (!this.#closed) {
      this.#closed = true;
      this.#handlers.onClose?.();
    }
  }

  #send(opcode: number, body: Buffer): void {
    const frame = buildWorldClientFrame(opcode, body);
    if (this.#crypt) this.#crypt.encryptSend(frame.subarray(0, WORLD_CLIENT_HEADER_SIZE));
    this.#socket.write(frame);
  }

  #onData(chunk: Buffer): void {
    this.#recvBuffer = Buffer.concat([this.#recvBuffer, chunk]);

    for (;;) {
      if (!this.#pendingHeader) {
        if (this.#recvBuffer.length < WORLD_SERVER_HEADER_SIZE) break;
        const header = Buffer.from(this.#recvBuffer.subarray(0, WORLD_SERVER_HEADER_SIZE));
        if (this.#crypt) this.#crypt.decryptRecv(header);
        this.#pendingHeader = readServerHeader(header);
        this.#recvBuffer = this.#recvBuffer.subarray(WORLD_SERVER_HEADER_SIZE);
      }

      if (this.#recvBuffer.length < this.#pendingHeader.bodyLength) break;
      const { opcode, bodyLength } = this.#pendingHeader;
      const body = Buffer.from(this.#recvBuffer.subarray(0, bodyLength));
      this.#recvBuffer = this.#recvBuffer.subarray(bodyLength);
      this.#pendingHeader = null;
      this.#dispatch(opcode, body);
    }
  }

  #dispatch(opcode: number, body: Buffer): void {
    try {
      switch (opcode) {
        case WorldOpcode.SMSG_AUTH_CHALLENGE:
          this.#handleAuthChallenge(body);
          break;
        case WorldOpcode.SMSG_AUTH_RESPONSE:
          this.#handleAuthResponse(body);
          break;
        case WorldOpcode.SMSG_CHAR_ENUM:
          this.#handleCharEnum(body);
          break;
        case WorldOpcode.SMSG_LOGIN_VERIFY_WORLD:
          this.#handleInWorld();
          break;
        case WorldOpcode.SMSG_WHO:
          this.#handleWho(parseWhoResponseBody(body));
          break;
        case WorldOpcode.SMSG_MESSAGECHAT:
          this.#handleChat(body);
          break;
        case WorldOpcode.SMSG_FRIEND_STATUS:
          this.#handlers.onFriendStatus?.(parseFriendStatus(body));
          break;
        case WorldOpcode.SMSG_FRIEND_LIST:
          this.#handlers.onFriendList?.(parseFriendList(body));
          break;
        case WorldOpcode.SMSG_GUILD_EVENT:
          this.#handleGuildEvent(body);
          break;
        case WorldOpcode.SMSG_UPDATE_OBJECT:
          this.#handleWorldObjects(body, false);
          break;
        case WorldOpcode.SMSG_COMPRESSED_UPDATE_OBJECT:
          this.#handleWorldObjects(body, true);
          break;
        case WorldOpcode.SMSG_DESTROY_OBJECT:
          this.#handleDestroyObject(body);
          break;
        case WorldOpcode.SMSG_MONSTER_MOVE:
          this.#handleMovement(body, parseMonsterMove);
          break;
        case WorldOpcode.SMSG_SPELL_START:
          this.#handleSpellStart(body);
          break;
        case WorldOpcode.SMSG_RESURRECT_REQUEST:
          this.#handleResurrectRequest(body);
          break;
        case WorldOpcode.SMSG_LOGOUT_RESPONSE:
          this.#handleLogoutResponse(body);
          break;
        case WorldOpcode.SMSG_LOGOUT_COMPLETE:
          this.#ready = false;
          this.#pendingLogout?.("logged-out");
          break;
        case WorldOpcode.SMSG_CREATURE_QUERY_RESPONSE:
          this.#handleCreatureQueryResponse(body);
          break;
        case WorldOpcode.SMSG_NAME_QUERY_RESPONSE:
          this.#handleNameQueryResponse(body);
          break;
        case WorldOpcode.SMSG_ATTACKSTART:
          this.#handleCombat(body, parseAttackStart);
          break;
        case WorldOpcode.SMSG_ATTACKERSTATEUPDATE:
          this.#handleCombat(body, parseAttackerStateUpdate);
          break;
        case WorldOpcode.SMSG_SPELLNONMELEEDAMAGELOG:
          this.#handleCombat(body, parseSpellDamageLog);
          break;
        case WorldOpcode.SMSG_PERIODICAURALOG:
          this.#handleCombat(body, parsePeriodicAuraLog);
          break;
        case WorldOpcode.SMSG_ENVIRONMENTALDAMAGELOG:
          this.#handleCombat(body, parseEnvironmentalDamage);
          break;
        case WorldOpcode.SMSG_CHAT_PLAYER_NOT_FOUND:
          this.#handlePlayerNotFound(body);
          break;
        case WorldOpcode.SMSG_PONG:
          this.#handlePong(body);
          break;
        case WorldOpcode.SMSG_WARDEN_DATA:
          this.#logger.warn("world: server sent warden data (anticheat active, unhandled)");
          this.#handlers.onWarden?.();
          break;
        default:
          if (PLAYER_MOVEMENT_OPCODES.has(opcode)) this.#handleMovement(body, parsePlayerMovement);
          else this.#logger.debug(`world: ignoring opcode 0x${opcode.toString(16)}`);
      }
    } catch (error) {
      this.#handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  #handleAuthChallenge(body: Buffer): void {
    const { serverSeed } = parseAuthChallenge(body);
    this.#logger.debug("world: got auth challenge, sending session");
    // Auth session is sent in plaintext; encryption starts immediately after.
    this.#send(
      WorldOpcode.CMSG_AUTH_SESSION,
      buildAuthSessionBody(this.#account, this.#clientSeed, serverSeed, this.#sessionKey, this.#build),
    );
    this.#crypt = new VanillaHeaderCrypt(this.#sessionKey);
  }

  #handleAuthResponse(body: Buffer): void {
    const { result } = parseAuthResponse(body);
    if (result !== AUTH_OK) {
      throw new Error(`world: auth response rejected (code 0x${result.toString(16)})`);
    }
    this.#logger.debug("world: authenticated, requesting character list");
    this.#send(WorldOpcode.CMSG_CHAR_ENUM, Buffer.alloc(0));
  }

  #handleCharEnum(body: Buffer): void {
    const characters = parseCharEnum(body);
    const wanted = this.#characterName.toLowerCase();
    const match = characters.find((entry) => entry.name.toLowerCase() === wanted);
    if (!match) {
      const names = characters.map((entry) => entry.name).join(", ") || "(none)";
      throw new FatalError(
        `world: character "${this.#characterName}" not found. Available: ${names}`,
      );
    }
    this.#logger.debug(`world: logging in character ${match.name}`);
    this.#selfGuid = match.guid; // so update-object parsing can pick OUR position, not a bystander's
    this.#send(WorldOpcode.CMSG_PLAYER_LOGIN, buildPlayerLoginBody(match.guid));
  }

  #handleInWorld(): void {
    if (this.#ready) return;
    this.#ready = true;
    this.#logger.info("world: character is in world");
    if (this.#pingIntervalMs > 0) {
      this.#pingTimer = setInterval(() => this.#sendPing(), this.#pingIntervalMs);
      this.#pingTimer.unref?.();
    }
    this.#handlers.onReady?.();
  }

  /**
   * A player whispered us. The packet carries only the sender's GUID, so if we
   * don't already know the name we hold the text and fire a name query, flushing
   * it when the response arrives. Parsing is guarded: a chat packet we can't read
   * is logged and dropped, never allowed to tear down the session.
   */
  #handleChat(body: Buffer): void {
    this.#logger.debug(`world: chat recv [${body.subarray(0, 80).toString("hex")}]`);
    try {
      if (body.length > 0 && isMonsterChatType(body.readUInt8(0))) {
        this.#handleMonsterChat(body);
        return;
      }
      if (body.length > 0 && body.readUInt8(0) === ChatType.Channel) {
        this.#handleChannelChat(body);
        return;
      }
      const chat = parseServerChat(body);
      this.#logger.debug(
        `world: chat type=0x${chat.type.toString(16)} guid=0x${chat.senderGuid.toString(16)} text=${JSON.stringify(chat.text)}`,
      );
      // Server SYSTEM messages are how command results/errors arrive (a failed guild invite,
      // "player not found", etc.). Surface them so the wiring can alert; they are never commands.
      if (chat.type === ChatType.System) {
        this.#handlers.onSystemMessage?.(chat.text.trim());
        return;
      }
      if (chat.type === ChatType.Ignored) {
        const name = chat.text.trim();
        if (name) this.#handlers.onIgnoredBy?.({ guid: chat.senderGuid, name });
        return;
      }
      // An addon's data riding a chat type is nobody talking. Answered as a whisper, OctoRadio's
      // "SAIO" broadcast once set every character of ours talking to the others without end.
      if (chat.language === LANG_ADDON) return;
      if (PLAYER_CHAT_TYPES.has(chat.type)) {
        this.#handlers.onPlayerChat?.(chat);
        return;
      }
      if (chat.type !== ChatType.Whisper) return; // only inbound whispers are commands
      // A whisper from ourselves is never a player asking something; answering one whispers
      // ourselves again, and the server delivers that too.
      if (chat.senderGuid === this.#selfGuid) return;
      const text = chat.text.trim();
      if (!text) return;

      const known = this.#nameCache.get(chat.senderGuid);
      if (known) {
        this.#handlers.onWhisper?.(known, text);
        return;
      }
      const queued = this.#pendingWhispers.get(chat.senderGuid);
      if (queued) {
        queued.push(text); // a name query is already in flight for this sender
        return;
      }
      this.#pendingWhispers.set(chat.senderGuid, [text]);
      this.#send(WorldOpcode.CMSG_NAME_QUERY, buildNameQuery(chat.senderGuid));
    } catch (error) {
      this.#logger.debug(
        `world: could not read chat [${body.subarray(0, 64).toString("hex")}]: ${(error as Error).message}`,
      );
    }
  }

  #handleMonsterChat(body: Buffer): void {
    try {
      const chat = parseMonsterChat(body);
      // Log every monster yell so the live buff-yell text can be captured/confirmed.
      this.#logger.debug(
        `world: monster chat from ${JSON.stringify(chat.senderName)}: ${JSON.stringify(chat.text)}`,
      );
      this.#handlers.onMonsterChat?.(chat);
      if (chat.type === ChatType.MonsterYell) this.#handlers.onMonsterYell?.(chat.senderName, chat.text);
    } catch (error) {
      this.#logger.debug(
        `world: could not read monster chat [${body.subarray(0, 64).toString("hex")}]: ${(error as Error).message}`,
      );
    }
  }

  /** A CHANNEL message (e.g. from LFT). The layout is unconfirmed, so parsing is best-effort and the
   *  wiring is handed the raw body too; a parse failure is logged and dropped, never fatal. */
  #handleChannelChat(body: Buffer): void {
    try {
      const chat = parseChannelChat(body);
      this.#handlers.onChannelMessage?.(chat.channelName, chat.senderGuid, chat.text, body);
    } catch (error) {
      this.#logger.debug(
        `world: could not read channel chat [${body.subarray(0, 64).toString("hex")}]: ${(error as Error).message}`,
      );
    }
  }

  #handleGuildEvent(body: Buffer): void {
    try {
      const event = parseGuildEvent(body);
      // Log every guild event so the real JOINED layout can be confirmed against a live join.
      this.#logger.info(`guild event: type=${event.type} params=${JSON.stringify(event.params)}`);
      if (event.type === GuildEvent.Joined && event.params[0]) {
        this.#handlers.onGuildJoin?.(event.params[0]);
      } else if ((event.type === GuildEvent.Left || event.type === GuildEvent.Removed) && event.params[0]) {
        this.#handlers.onGuildLeave?.(event.params[0]);
      }
    } catch (error) {
      this.#logger.debug(`world: could not read guild event: ${(error as Error).message}`);
    }
  }

  #handleWorldObjects(body: Buffer, compressed: boolean): void {
    try {
      // Compressed form: a u32 uncompressed size then a zlib stream.
      const raw = compressed ? inflateSync(body.subarray(4)) : body;
      this.#logger.debug(`world: object update (${raw.length}b${compressed ? ", was compressed" : ""})`);
      this.#handlers.onWorldObjects?.(raw);
    } catch (error) {
      this.#logger.debug(`world: could not read object update: ${(error as Error).message}`);
    }
  }

  #handleDestroyObject(body: Buffer): void {
    try {
      this.#handlers.onObjectDestroyed?.(parseDestroyObject(body));
    } catch (error) {
      this.#logger.debug(`world: could not read object destroy: ${(error as Error).message}`);
    }
  }

  /** A combat log packet. One the parser cannot read is logged and dropped — it is only ever
   *  context, never worth the session. */
  #handleCombat(body: Buffer, parse: (body: Buffer) => CombatEvent | null): void {
    try {
      const event = parse(body);
      if (event) this.#handlers.onCombat?.(event);
    } catch (error) {
      this.#logger.debug(
        `world: could not read combat log [${body.subarray(0, 64).toString("hex")}]: ${(error as Error).message}`,
      );
    }
  }

  /** A player's name, if a name query has already resolved it this session. */
  playerName(guid: bigint): string | undefined {
    return this.#nameCache.get(guid);
  }

  /** Resolve a player's name in the background, for `playerName` to answer later. Asks the server
   *  at most once per guid until it replies, and not at all once the name is known. */
  queryName(guid: bigint): void {
    if (!this.#ready || this.#nameCache.has(guid) || this.#pendingNames.has(guid)) return;
    this.#pendingNames.add(guid);
    this.#send(WorldOpcode.CMSG_NAME_QUERY, buildNameQuery(guid));
  }

  /**
   * A player's name, asking the server when it is not known yet — for a caller that needs the answer
   * rather than a later look in `playerName`. Null when no answer comes within `timeoutMs`, or the
   * character is not in world to ask.
   */
  resolveName(guid: bigint, timeoutMs: number): Promise<string | null> {
    const known = this.#nameCache.get(guid);
    if (known !== undefined) return Promise.resolve(known);
    if (!this.#ready) return Promise.resolve(null);
    return new Promise((resolve) => {
      const waiter = (name: string | null): void => {
        clearTimeout(timer);
        resolve(name);
      };
      const timer = setTimeout(() => {
        const left = (this.#nameWaiters.get(guid) ?? []).filter((other) => other !== waiter);
        if (left.length > 0) this.#nameWaiters.set(guid, left);
        else this.#nameWaiters.delete(guid);
        resolve(null);
      }, timeoutMs);
      timer.unref?.();
      this.#nameWaiters.set(guid, [...(this.#nameWaiters.get(guid) ?? []), waiter]);
      this.queryName(guid);
    });
  }

  /**
   * Log the character out properly. In a rest area — a capital — that is instant; a disconnect
   * alone would leave it standing in the world for a while. Settles "logged-out" once the server
   * confirms, "refused" when it will not (in combat, say), "timed-out" when it does not answer in
   * `timeoutMs`, and "not-in-world" when there is nobody to log out. The connection is left open
   * for the caller to close.
   */
  logout(timeoutMs: number): Promise<LogoutOutcome> {
    if (!this.#ready || this.#closed) return Promise.resolve("not-in-world");
    this.#pendingLogout?.("timed-out");
    return new Promise((resolve) => {
      const settle = (outcome: LogoutOutcome): void => {
        clearTimeout(timer);
        if (this.#pendingLogout === settle) this.#pendingLogout = null;
        resolve(outcome);
      };
      const timer = setTimeout(() => settle("timed-out"), timeoutMs);
      timer.unref?.();
      this.#pendingLogout = settle;
      this.#send(WorldOpcode.CMSG_LOGOUT_REQUEST, Buffer.alloc(0));
    });
  }

  #handleLogoutResponse(body: Buffer): void {
    // Accepted is followed by SMSG_LOGOUT_COMPLETE; only a refusal settles the logout here.
    const reason = body.length >= 4 ? body.readUInt32LE(0) : 0;
    if (reason !== 0) this.#pendingLogout?.("refused");
  }

  #handleResurrectRequest(body: Buffer): void {
    try {
      this.#handlers.onResurrectRequest?.(parseResurrectRequest(body));
    } catch (error) {
      this.#logger.debug(`world: could not read resurrect request: ${(error as Error).message}`);
    }
  }

  #handleSpellStart(body: Buffer): void {
    try {
      this.#handlers.onSpellStart?.(parseSpellStart(body));
    } catch (error) {
      this.#logger.debug(`world: could not read spell start: ${(error as Error).message}`);
    }
  }

  #handleMovement(body: Buffer, parse: (body: Buffer) => UnitPosition | null): void {
    try {
      const move = parse(body);
      if (move) this.#handlers.onMovement?.(move);
    } catch (error) {
      this.#logger.debug(`world: could not read movement: ${(error as Error).message}`);
    }
  }

  /** Ask what an NPC entry is called. `guid` is any live instance of it. */
  queryCreature(entry: number, guid: bigint): void {
    if (!this.#ready) return;
    this.#send(WorldOpcode.CMSG_CREATURE_QUERY, buildCreatureQuery(entry, guid));
  }

  #handleCreatureQueryResponse(body: Buffer): void {
    try {
      const { entry, name } = parseCreatureQueryResponse(body);
      this.#handlers.onCreatureName?.(entry, name);
    } catch (error) {
      this.#logger.debug(`world: could not read creature-query response: ${(error as Error).message}`);
    }
  }

  #handleNameQueryResponse(body: Buffer): void {
    try {
      const { guid, name } = parseNameQueryResponse(body);
      this.#nameCache.set(guid, name);
      this.#pendingNames.delete(guid);
      const waiters = this.#nameWaiters.get(guid);
      this.#nameWaiters.delete(guid);
      for (const waiter of waiters ?? []) waiter(name);
      const queued = this.#pendingWhispers.get(guid);
      if (!queued) return;
      this.#pendingWhispers.delete(guid);
      for (const text of queued) this.#handlers.onWhisper?.(name, text);
    } catch (error) {
      this.#logger.debug(`world: could not read name-query response: ${(error as Error).message}`);
    }
  }

  #handlePlayerNotFound(body: Buffer): void {
    try {
      this.#handlers.onWhisperUndelivered?.(parsePlayerNotFound(body));
    } catch (error) {
      this.#logger.debug(`world: could not read player-not-found: ${(error as Error).message}`);
    }
  }

  #sendPing(): void {
    this.#pingSequence += 1;
    this.#pendingPing = { seq: this.#pingSequence, sentAt: Date.now() };
    this.#send(WorldOpcode.CMSG_PING, buildPingBody(this.#pingSequence, 0));
  }

  #handlePong(body: Buffer): void {
    if (body.length < 4) return; // SMSG_PONG echoes the u32 ping sequence
    const rttMs = pongLatency(this.#pendingPing, body.readUInt32LE(0), Date.now());
    if (rttMs === null) return; // a stale/duplicate pong, or none pending
    this.#pendingPing = null;
    this.#handlers.onLatency?.(rttMs);
  }
}
