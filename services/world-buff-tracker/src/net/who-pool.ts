import type { WhoQuery, WhoResult } from "../protocol/who.js";

/** One character's `/who`: its own one-at-a-time queue on its own socket. */
export type WhoRunner = (query: WhoQuery) => Promise<WhoResult>;

export interface WhoPoolOptions {
  /** The least time between two `/who` from one character. OctoWoW silently ignores one sent sooner
   *  (measured 2026-11-12: every lookup under 30s after the same character's last went unanswered,
   *  every one from 30s on was answered), so the lookup would only time out. */
  readonly minGapMs: number;
  /** The least time between any two `/who` the bot sends, whichever characters send them: the
   *  server also throttles per IP, and lookups fired at once from several characters trip that. */
  readonly minSpacingMs: number;
  /** The clock; injectable for tests. */
  readonly now?: () => number;
}

interface Member {
  readonly run: WhoRunner;
  /** A lookup is out on this character and has not settled yet. */
  busy: boolean;
}

interface Waiting {
  readonly query: WhoQuery;
  readonly resolve: (result: WhoResult) => void;
  readonly reject: (error: Error) => void;
}

/**
 * Every in-world character's `/who`, shared by everything that asks: both lairs' polls, their class
 * slices, the faction lookups. Each lookup goes to the character that has gone longest without one,
 * and only once that character is past `minGapMs` and the bot past `minSpacingMs`. A lookup that
 * cannot go yet waits its turn (first come, first served) rather than being sent into the drop.
 *
 * A character's last send is remembered after it logs out, because the server's clock for it keeps
 * running: a character that reconnects 10s after a lookup is still 20s short of the gap.
 */
export class WhoPool {
  readonly #members = new Map<string, Member>();
  readonly #lastSentAt = new Map<string, number>();
  readonly #waiting: Waiting[] = [];
  readonly #minGapMs: number;
  readonly #minSpacingMs: number;
  readonly #now: () => number;
  #lastAnySentAt = Number.NEGATIVE_INFINITY;
  #timer: NodeJS.Timeout | null = null;

  constructor(options: WhoPoolOptions) {
    this.#minGapMs = options.minGapMs;
    this.#minSpacingMs = options.minSpacingMs;
    this.#now = options.now ?? Date.now;
  }

  /** Offers `id`'s `/who` to the pool, for as long as it is in world. */
  register(id: string, run: WhoRunner): void {
    this.#members.set(id, { run, busy: false });
    this.#pump();
  }

  /** Withdraws `id`'s `/who`. With no character left, every waiting lookup fails: none can run. */
  unregister(id: string): void {
    this.#members.delete(id);
    if (this.#members.size > 0) return;
    this.#stopTimer();
    for (const job of this.#waiting.splice(0)) job.reject(noCharacter());
  }

  /** How many characters can `/who` right now. */
  get size(): number {
    return this.#members.size;
  }

  /** Runs `query` on the next character free to send it. Fails at once when none is in world. */
  readonly who: WhoRunner = (query) =>
    new Promise<WhoResult>((resolve, reject) => {
      if (this.#members.size === 0) {
        reject(noCharacter());
        return;
      }
      this.#waiting.push({ query, resolve, reject });
      this.#pump();
    });

  #pump(): void {
    this.#stopTimer();
    while (this.#waiting.length > 0) {
      const now = this.#now();
      const next = this.#readyMember(now);
      if (next === null) {
        const at = this.#nextReadyAt();
        // Every character busy: the first to settle pumps again.
        if (at !== null) this.#startTimer(Math.max(0, at - now));
        return;
      }
      const job = this.#waiting.shift();
      if (job) this.#dispatch(next.id, next.member, job, now);
    }
  }

  /** The idle character longest without a lookup, if it and the bot are both past their gaps. */
  #readyMember(now: number): { id: string; member: Member } | null {
    if (now < this.#lastAnySentAt + this.#minSpacingMs) return null;
    let best: { id: string; member: Member; sentAt: number } | null = null;
    for (const [id, member] of this.#members) {
      if (member.busy) continue;
      const sentAt = this.#lastSentAt.get(id) ?? Number.NEGATIVE_INFINITY;
      if (now < sentAt + this.#minGapMs) continue;
      if (best === null || sentAt < best.sentAt) best = { id, member, sentAt };
    }
    return best;
  }

  /** When the next idle character can send, or null when every character is busy. */
  #nextReadyAt(): number | null {
    let earliest: number | null = null;
    for (const [id, member] of this.#members) {
      if (member.busy) continue;
      const sentAt = this.#lastSentAt.get(id) ?? Number.NEGATIVE_INFINITY;
      const at = Math.max(sentAt + this.#minGapMs, this.#lastAnySentAt + this.#minSpacingMs);
      if (earliest === null || at < earliest) earliest = at;
    }
    return earliest;
  }

  #dispatch(id: string, member: Member, job: Waiting, now: number): void {
    member.busy = true;
    this.#lastSentAt.set(id, now);
    this.#lastAnySentAt = now;
    member
      .run(job.query)
      .then(job.resolve, job.reject)
      .finally(() => {
        member.busy = false;
        this.#pump();
      });
  }

  #startTimer(ms: number): void {
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.#pump();
    }, ms);
    this.#timer.unref?.();
  }

  #stopTimer(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }
}

function noCharacter(): Error {
  return new Error("no character in world to /who");
}
