/**
 * Paces outgoing whispers so a raid alert to many subscribers goes out one at a time rather than
 * in a burst the server would treat as spam. The first whisper while idle sends immediately; each
 * subsequent one waits `intervalMs`.
 *
 * The server caps how many DISTINCT recipients you may whisper in a short window and rejects the
 * overflow ("too many different players too quickly") — measured on this realm at ~3 per ~30s. When
 * the caller feeds that signal to `notifyThrottled`, the queue backs off for a cooldown and then
 * resumes with the NEXT recipient. It does NOT re-send the whispers around the throttle: the server
 * accepts them and then blocks, so re-sending only duplicates (measured), and a large backlog is
 * better shed than re-delivered.
 *
 * Time-sensitive alerts carry a `maxAgeMs`, counted from when their event happened; one older is
 * DROPPED unsent — a "park now" that a throttled queue delayed by minutes is worse than silence —
 * and one sent a minute or more after its event says how late it is. Command replies carry no
 * maxAge and always go out. A send that throws (recipient offline,
 * transient socket error) is reported and skipped, never stalling the rest of the queue.
 */

import type { Faction } from "../subscribers/store.js";
import { formatWhisperDelayNote } from "../notify/format.js";

/** What makes a whisper an alert rather than a command reply: the capitals it is about, how long it
 *  stays worth sending, and when the event it tells of happened. */
export interface AlertWhisper {
  /** Capitals this message is about (a "park now" alert). Lets a buff drop in one of them purge
   *  the now-stale queued park alerts for that side. Undefined for messages nothing supersedes. */
  readonly cities?: readonly Faction[];
  /** How long after its event it is still worth sending; one older is dropped unsent. Undefined =
   *  never expires (command replies). */
  readonly maxAgeMs?: number;
  /** When the event it tells of happened (ms epoch). Its age runs from here, not from when it was
   *  queued — so an alert held up before it reached the queue (the online check before a broadcast)
   *  still reads as late, and still expires. Defaults to when it is queued. */
  readonly since?: number;
}

export type WhisperSend = (target: string, message: string) => void;
export type WhisperError = (error: unknown, target: string, message: string) => void;
/** Optional measurement hook: called with a one-line summary when the server throttles this
 *  character's whispers, when a stale whisper is dropped, and when a broadcast finishes draining —
 *  so the live distinct-recipient cap and throughput can be read straight from the deploy logs. */
export type WhisperMetric = (line: string) => void;

interface QueuedWhisper {
  readonly target: string;
  readonly message: string;
  readonly cities?: readonly Faction[];
  /** When its event happened — or, without one, when it was queued (ms epoch). Its age runs from here. */
  readonly since: number;
  readonly maxAgeMs?: number;
}

/** How long to pause after the server throttles us, letting its distinct-recipient window reset. */
const THROTTLE_COOLDOWN_MS = 30_000;

export class WhisperQueue {
  readonly #queue: QueuedWhisper[] = [];
  readonly #send: WhisperSend;
  readonly #intervalMs: number;
  readonly #onError?: WhisperError;
  readonly #onMetric?: WhisperMetric;
  #timer: NodeJS.Timeout | null = null;
  /** While in a throttle cooldown, no whisper is sent before this timestamp. */
  #pausedUntil = 0;
  // Measurement of the live server throttle (see WhisperMetric). An "active window" is one
  // continuous drain from idle; counters reset when the queue next goes idle→active.
  #activeSince = 0;
  #sentSinceActive = 0;
  /** Distinct recipients sent since the window opened OR the last throttle — at the FIRST throttle
   *  this is the server's distinct-recipient cap for this character. */
  #sentSinceThrottle = 0;

  constructor(send: WhisperSend, intervalMs = 1200, onError?: WhisperError, onMetric?: WhisperMetric) {
    this.#send = send;
    this.#intervalMs = intervalMs;
    this.#onError = onError;
    this.#onMetric = onMetric;
  }

  get size(): number {
    return this.#queue.length;
  }

  enqueue(target: string, message: string, alert: AlertWhisper = {}): void {
    this.#queue.push({
      target,
      message,
      cities: alert.cities,
      maxAgeMs: alert.maxAgeMs,
      since: alert.since ?? Date.now(),
    });
    if (!this.#timer) {
      // Idle -> active: a new drain window opens, so reset the throttle measurement.
      this.#activeSince = Date.now();
      this.#sentSinceActive = 0;
      this.#sentSinceThrottle = 0;
      this.#pump();
    }
  }

  /**
   * Drop still-queued messages ABOUT this capital — a fresh buff dropped there, so the pending
   * "park now to catch it" alerts for that side are stale. Returns how many were dropped. Only
   * pending items are affected; anything already sent is gone. Messages with no `cities` (command
   * replies, the drop message itself) are never touched.
   */
  dropForFaction(faction: Faction): number {
    const before = this.#queue.length;
    const kept = this.#queue.filter((w) => !w.cities?.includes(faction));
    this.#queue.length = 0;
    this.#queue.push(...kept);
    return before - this.#queue.length;
  }

  /** Send the same message to many targets, paced. */
  enqueueAll(targets: readonly string[], message: string): void {
    for (const target of targets) this.enqueue(target, message);
  }

  /**
   * The server throttled our whispers. Back off for a cooldown so its distinct-recipient window can
   * reset, then resume with the NEXT recipient — we do not re-send the ones around the throttle
   * (the server accepted them; re-sending only duplicates).
   */
  notifyThrottled(): void {
    const now = Date.now();
    // Measurement: #sentSinceThrottle is how many distinct went through since the last window, and
    // the elapsed time is the window it applied over.
    if (this.#onMetric) {
      const elapsedS = ((now - this.#activeSince) / 1000).toFixed(1);
      this.#onMetric(
        `THROTTLED after ${this.#sentSinceThrottle} distinct this window (${this.#sentSinceActive} total in ${elapsedS}s, interval ${this.#intervalMs}ms)`,
      );
    }
    this.#sentSinceThrottle = 0;
    this.#pausedUntil = now + THROTTLE_COOLDOWN_MS;
    if (this.#timer) clearTimeout(this.#timer);
    this.#schedule(THROTTLE_COOLDOWN_MS);
  }

  stop(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#queue.length = 0;
    this.#pausedUntil = 0;
  }

  #schedule(delayMs: number): void {
    this.#timer = setTimeout(() => this.#pump(), delayMs);
    this.#timer.unref?.();
  }

  #pump(): void {
    const now = Date.now();
    if (now < this.#pausedUntil) {
      this.#schedule(this.#pausedUntil - now); // still cooling down — wait it out
      return;
    }
    // Shed any stale time-sensitive whispers first — they consume no pacing slot, they just go.
    let next = this.#queue.shift();
    while (next && next.maxAgeMs !== undefined && now - next.since > next.maxAgeMs) {
      this.#onMetric?.(`dropped stale whisper to ${next.target} (${Math.round((now - next.since) / 1000)}s old)`);
      next = this.#queue.shift();
    }
    if (!next) {
      // Window drained: report the effective throughput (total distinct sent / wall time).
      if (this.#onMetric && this.#sentSinceActive > 0) {
        const elapsedS = ((now - this.#activeSince) / 1000).toFixed(1);
        this.#onMetric(`drained ${this.#sentSinceActive} whispers in ${elapsedS}s`);
      }
      this.#timer = null;
      return;
    }
    try {
      // Time-sensitive whispers carry a maxAge; those are the alerts, and the only ones where
      // lateness changes what the message means. A command reply is answered when it is answered.
      const late = next.maxAgeMs !== undefined ? formatWhisperDelayNote(now - next.since) : null;
      this.#send(next.target, late === null ? next.message : `${next.message}${late}`);
      this.#sentSinceActive++;
      this.#sentSinceThrottle++;
    } catch (error) {
      this.#onError?.(error, next.target, next.message);
    }
    this.#schedule(this.#intervalMs);
  }
}
