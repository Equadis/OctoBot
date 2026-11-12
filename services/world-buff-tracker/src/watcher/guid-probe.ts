import type { FriendStatus } from "../protocol/chat.js";
import { FriendsResult } from "../protocol/opcodes.js";

/**
 * Finds a player's GUID from their name by briefly friending them.
 *
 * Nothing else in the 1.12 protocol turns a name into a GUID, and a GUID is all that tells a player
 * apart standing nearby. The server answers a friend add with the player's GUID whether it added them
 * (online or offline), found them already listed, or refused them for being on the other side; a
 * name it does not know comes back NOT_FOUND. A friend it added is removed again straight away.
 *
 * One lookup at a time, so each answer belongs to the lookup in flight — the friend protocol echoes
 * a GUID, not the name asked about. Run on a listener's own account, whose friends list is otherwise
 * empty, so it never disturbs the presence sweep on Bufftracker's.
 */

export interface FriendOps {
  addFriend(name: string): void;
  delFriend(guid: bigint): void;
}

export interface GuidProbeOptions {
  /** How long to wait for the server's answer to an add. */
  readonly timeoutMs: number;
}

/** The answers to an add that carry the player's GUID. */
const IDENTIFIED: ReadonlySet<number> = new Set([
  FriendsResult.AddedOnline,
  FriendsResult.AddedOffline,
  FriendsResult.Already,
  FriendsResult.Enemy,
]);
/** The answers that mean our add left them on the list, to be taken off again. */
const LISTED: ReadonlySet<number> = new Set([
  FriendsResult.AddedOnline,
  FriendsResult.AddedOffline,
  FriendsResult.Already,
]);
/** Every answer an add can get — anything else (a friend going on- or offline, a removal) is not one. */
const ANSWERS: ReadonlySet<number> = new Set([
  ...IDENTIFIED,
  FriendsResult.NotFound,
  FriendsResult.Self,
  FriendsResult.ListFull,
]);

export class GuidProbe {
  readonly #ops: FriendOps;
  readonly #timeoutMs: number;
  #answer: ((status: FriendStatus | null) => void) | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(ops: FriendOps, options: GuidProbeOptions) {
    this.#ops = ops;
    this.#timeoutMs = options.timeoutMs;
  }

  /** The player's GUID, or null when the server does not know the name or does not answer. */
  lookup(name: string): Promise<bigint | null> {
    const run = async (): Promise<bigint | null> => {
      const status = await this.#ask(name);
      if (!status || !IDENTIFIED.has(status.result) || status.guid === 0n) return null;
      if (LISTED.has(status.result)) this.#ops.delFriend(status.guid);
      return status.guid;
    };
    const result = this.#queue.then(run, run);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  /** A friend status from the server — the answer to the add in flight, or noise to ignore. */
  status(status: FriendStatus): void {
    if (ANSWERS.has(status.result)) this.#answer?.(status);
  }

  #ask(name: string): Promise<FriendStatus | null> {
    return new Promise((resolve) => {
      const settle = (status: FriendStatus | null): void => {
        clearTimeout(timer);
        this.#answer = null;
        resolve(status);
      };
      const timer = setTimeout(() => settle(null), this.#timeoutMs);
      timer.unref?.();
      this.#answer = settle;
      try {
        this.#ops.addFriend(name);
      } catch {
        settle(null); // not in world to ask
      }
    });
  }
}
