import { FriendsResult } from "../protocol/opcodes.js";
import type { FriendListEntry, FriendStatus } from "../protocol/chat.js";

/** The friend operations the sweep drives — the live world client supplies these. */
export interface FriendOps {
  requestFriendList(): void;
  addFriend(name: string): void;
  delFriend(guid: bigint): void;
}

export interface FriendList {
  readonly count: number;
  readonly friends: readonly FriendListEntry[];
}

interface SweepLogger {
  info(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
}

export interface PresenceSweeperOptions {
  readonly ops: FriendOps;
  readonly logger?: SweepLogger;
  /** How long to await a single add reply before giving up on that name (then fail-open). */
  readonly perOpTimeoutMs?: number;
  /** How long to await the friend-list reply when clearing the list. */
  readonly listTimeoutMs?: number;
  /** After clearing, how long to let the REMOVED acks settle before the first add. */
  readonly settleMs?: number;
  /** Total budget for a whole sweep; names not yet probed past this are kept unprobed (fail-open). */
  readonly sweepDeadlineMs?: number;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_PER_OP_TIMEOUT_MS = 800;
const DEFAULT_LIST_TIMEOUT_MS = 2_000;
const DEFAULT_SETTLE_MS = 400;
const DEFAULT_SWEEP_DEADLINE_MS = 20_000;

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads which of a set of names are ONLINE by briefly friending each: a FRESH add resolves to
 * ADDED_ONLINE / ADDED_OFFLINE, so add → read the result → remove is a presence probe. The list is
 * cleared first, because an add of someone ALREADY on the list carries no online/offline field and
 * the 50-slot cap must be free.
 *
 * FAIL-OPEN throughout: the ONLY name dropped is one the server explicitly reports ADDED_OFFLINE.
 * A name it will not resolve (renamed/deleted char — no reply at all), a timeout, or any other
 * result is KEPT. Presence is only an optimisation to skip players we KNOW are offline; the whisper
 * itself still detects offline (SMSG_CHAT_PLAYER_NOT_FOUND), so a presence miss must never silence a
 * broadcast. A wholly broken sweep returns every name.
 *
 * Serial — one friend op in flight at a time — so a reply is unambiguously the current op's. The
 * friend protocol echoes a guid, not the name, so out-of-order replies could not be correlated; but
 * a resolvable name replies in ~1ms (measured) and an unresolvable one never replies, so serial
 * correlation is exact and the per-op timeout only ever fires for a name that will never answer
 * (no late reply exists to leak into the next op). Stray ONLINE/OFFLINE pushes and the REMOVED acks
 * from clearing or the previous del are filtered out of an add's await for the same reason.
 */
export class PresenceSweeper {
  readonly #ops: FriendOps;
  readonly #log?: SweepLogger;
  readonly #perOpTimeoutMs: number;
  readonly #listTimeoutMs: number;
  readonly #settleMs: number;
  readonly #sweepDeadlineMs: number;
  readonly #now: () => number;
  readonly #sleep: (ms: number) => Promise<void>;

  #pendingStatus: { accept: (s: FriendStatus) => boolean; resolve: (s: FriendStatus) => void } | null = null;
  #pendingList: ((list: FriendList) => void) | null = null;
  #sweeping = false;

  constructor(opts: PresenceSweeperOptions) {
    this.#ops = opts.ops;
    this.#log = opts.logger;
    this.#perOpTimeoutMs = opts.perOpTimeoutMs ?? DEFAULT_PER_OP_TIMEOUT_MS;
    this.#listTimeoutMs = opts.listTimeoutMs ?? DEFAULT_LIST_TIMEOUT_MS;
    this.#settleMs = opts.settleMs ?? DEFAULT_SETTLE_MS;
    this.#sweepDeadlineMs = opts.sweepDeadlineMs ?? DEFAULT_SWEEP_DEADLINE_MS;
    this.#now = opts.now ?? Date.now;
    this.#sleep = opts.sleep ?? realSleep;
  }

  /** Feed from the world client's onFriendStatus handler. */
  handleFriendStatus(status: FriendStatus): void {
    const pending = this.#pendingStatus;
    if (pending && pending.accept(status)) {
      this.#pendingStatus = null;
      pending.resolve(status);
    }
  }

  /** Feed from the world client's onFriendList handler. */
  handleFriendList(list: FriendList): void {
    const resolve = this.#pendingList;
    this.#pendingList = null;
    resolve?.(list);
  }

  /** True while a sweep is in flight (the friends list is a single shared resource). */
  get busy(): boolean {
    return this.#sweeping;
  }

  /**
   * Return the subset of `names` to whisper: everyone the probe did not find explicitly offline.
   * Never throws.
   *
   * `onKeep` streams: it fires the instant a name is decided kept, so a caller can enqueue that
   * whisper immediately rather than wait for the whole sweep — the sweep runs many times faster than
   * the throttled whisper drain, so this overlaps them for free. Every fail-open path (deadline, a
   * busy sweep, a thrown op) routes its kept names through `onKeep` too, so the callback and the
   * returned set never disagree; `onKeep` is called at most once per name.
   */
  async sweep(names: readonly string[], onKeep?: (name: string) => void): Promise<Set<string>> {
    const kept = new Set<string>();
    const keep = (name: string): void => {
      if (!kept.has(name)) {
        kept.add(name);
        onKeep?.(name);
      }
    };
    if (this.#sweeping) {
      // A sweep already owns the friends list — don't interleave. Fail-open: keep everyone rather
      // than block or corrupt the in-flight sweep. (The caller's cache absorbs clustered broadcasts.)
      this.#log?.warn("presence: a sweep is already running — keeping all names for this broadcast");
      for (const name of names) keep(name);
      return kept;
    }
    this.#sweeping = true;
    const start = this.#now();
    try {
      await this.#clear();
      let offline = 0;
      let probed = 0;
      for (let i = 0; i < names.length; i += 1) {
        const name = names[i]!;
        if (this.#now() - start > this.#sweepDeadlineMs) {
          for (let j = i; j < names.length; j += 1) keep(names[j]!); // out of time — keep the rest
          this.#log?.warn(
            `presence: hit the ${this.#sweepDeadlineMs}ms deadline at ${i}/${names.length}; kept the remainder`,
          );
          break;
        }
        const status = await this.#addAndAwait(name);
        probed += 1;
        // Put the slot back whenever the add actually placed (or found) the friend on the list.
        if (
          status &&
          status.guid !== 0n &&
          (status.result === FriendsResult.AddedOnline ||
            status.result === FriendsResult.AddedOffline ||
            status.result === FriendsResult.Already)
        ) {
          this.#ops.delFriend(status.guid);
        }
        if (status?.result === FriendsResult.AddedOffline) offline += 1; // the only name we drop
        else keep(name); // fail-open: online / already / not-found / enemy / timeout are kept
      }
      this.#log?.info(`presence: probed ${probed}/${names.length}, dropped ${offline} offline, kept ${kept.size}`);
      return kept;
    } catch (error) {
      this.#log?.warn(`presence: sweep failed (${String(error)}) — keeping all ${names.length} names`);
      for (const name of names) keep(name); // idempotent — already-kept names are not re-enqueued
      return kept;
    } finally {
      this.#sweeping = false;
      this.#pendingStatus = null;
      this.#pendingList = null;
    }
  }

  async #clear(): Promise<void> {
    const list = await this.#requestList();
    if (!list || list.friends.length === 0) return;
    for (const friend of list.friends) this.#ops.delFriend(friend.guid);
    this.#log?.debug(`presence: clearing ${list.friends.length} existing friend(s) before the sweep`);
    await this.#sleep(this.#settleMs); // let the REMOVED acks land before the first add
  }

  #requestList(): Promise<FriendList | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.#pendingList = null;
        resolve(null);
      }, this.#listTimeoutMs);
      this.#pendingList = (list) => {
        clearTimeout(timer);
        resolve(list);
      };
      this.#ops.requestFriendList();
    });
  }

  #addAndAwait(name: string): Promise<FriendStatus | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.#pendingStatus = null;
        resolve(null);
      }, this.#perOpTimeoutMs);
      this.#pendingStatus = {
        // Accept only an add OUTCOME — never a stray ONLINE/OFFLINE push or a REMOVED ack from the
        // clear or the previous name's del, which would otherwise be read as this add's reply.
        accept: (s) =>
          s.result !== FriendsResult.Online &&
          s.result !== FriendsResult.Offline &&
          s.result !== FriendsResult.Removed,
        resolve: (s) => {
          clearTimeout(timer);
          resolve(s);
        },
      };
      this.#ops.addFriend(name);
    });
  }
}
