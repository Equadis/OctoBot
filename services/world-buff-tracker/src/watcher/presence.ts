/**
 * Presence tracking, rebuilt to survive real /who behaviour.
 *
 * The old census trusted each /who as a complete, reliable snapshot. It isn't:
 *   - /who caps at 49 results, so a busy lair (multiple raids) is TRUNCATED — players
 *     beyond the cap look like they left, and shift in/out looking like arrivals.
 *   - a single flaky/partial /who shouldn't evict a present raid.
 *   - players already here at boot (or after a blind gap) have no real arrival time,
 *     so their "duration" would be fiction.
 *
 * This tracker takes a `complete` flag per poll (the caller sets it false when the
 * view is truncated — count at the cap) and tags every player and event with
 * confidence:
 *   - Departures are only reported CONFIDENT when detected across consecutive
 *     COMPLETE views (a real leave, not a truncation). A truncated or single flaky
 *     poll never evicts within the grace window; a long hard-timeout still evicts to
 *     bound memory, but LOW-confidence — never a raid event.
 *   - `arrivalObserved` is true only when we witnessed the arrival on a complete view
 *     with a complete view before it, so `stayedMs` is a real, usable duration.
 *
 * Identity is the character name (unique per realm; /who carries no GUID). Rename or
 * name reuse over long spans is out of scope — irrelevant at raid timescales.
 */

export const WHO_RESULT_CAP = 49;

export interface Arrival {
  readonly name: string;
  /** We saw them appear on a trustworthy view — their firstSeen is real. */
  readonly arrivalObserved: boolean;
}

export interface Departure {
  readonly name: string;
  readonly firstSeen: number;
  readonly stayedMs: number;
  /** A real departure across complete views — not a truncation/hard-timeout eviction. */
  readonly confident: boolean;
  /** stayedMs is a real duration (we saw the arrival too). */
  readonly stayKnown: boolean;
}

export interface PresenceChange {
  readonly now: number;
  /** Raw count this poll. */
  readonly present: number;
  /** The view was complete (not truncated at the cap). */
  readonly complete: boolean;
  /** Followed a blind gap — re-baselined, no arrivals/departures reported. */
  readonly blackout: boolean;
  readonly gapMs: number;
  readonly arrivals: readonly Arrival[];
  readonly departures: readonly Departure[];
}

interface Tracked {
  firstSeen: number;
  lastSeen: number;
  arrivalObserved: boolean;
}

export interface PresenceOptions {
  readonly graceMs?: number;
  readonly blackoutMs?: number;
  /** Absent beyond this is evicted even under truncation, to bound memory (low-confidence). */
  readonly hardTimeoutMs?: number;
}

const DEFAULT_GRACE_MS = 120_000;
const DEFAULT_BLACKOUT_MS = 180_000;
const DEFAULT_HARD_TIMEOUT_MS = 15 * 60_000;

export class PresenceTracker {
  readonly #players = new Map<string, Tracked>();
  readonly #graceMs: number;
  readonly #blackoutMs: number;
  readonly #hardTimeoutMs: number;
  #lastObserved: number | null = null;
  #lastComplete = false;

  constructor(options: PresenceOptions = {}) {
    this.#graceMs = options.graceMs ?? DEFAULT_GRACE_MS;
    this.#blackoutMs = options.blackoutMs ?? DEFAULT_BLACKOUT_MS;
    this.#hardTimeoutMs = options.hardTimeoutMs ?? DEFAULT_HARD_TIMEOUT_MS;
  }

  get tracked(): number {
    return this.#players.size;
  }

  observe(names: readonly string[], now: number, complete: boolean): PresenceChange {
    const gapMs = this.#lastObserved === null ? 0 : now - this.#lastObserved;
    const blackout = this.#lastObserved !== null && gapMs > this.#blackoutMs;
    this.#lastObserved = now;

    if (blackout) {
      this.#players.clear();
      for (const name of names) this.#players.set(name, { firstSeen: now, lastSeen: now, arrivalObserved: false });
      this.#lastComplete = complete;
      return { now, present: names.length, complete, blackout: true, gapMs, arrivals: [], departures: [] };
    }

    const trustworthy = complete && this.#lastComplete;
    const presentSet = new Set(names);

    const arrivals: Arrival[] = [];
    for (const name of names) {
      const existing = this.#players.get(name);
      if (existing) {
        existing.lastSeen = now;
      } else {
        this.#players.set(name, { firstSeen: now, lastSeen: now, arrivalObserved: trustworthy });
        arrivals.push({ name, arrivalObserved: trustworthy });
      }
    }

    const departures: Departure[] = [];
    for (const [name, player] of this.#players) {
      if (presentSet.has(name)) continue;
      const absent = now - player.lastSeen;
      const record = (confident: boolean): void => {
        departures.push({
          name,
          firstSeen: player.firstSeen,
          stayedMs: player.lastSeen - player.firstSeen,
          confident,
          stayKnown: player.arrivalObserved,
        });
        this.#players.delete(name);
      };
      if (trustworthy && absent > this.#graceMs) record(true); // real leave across complete views
      else if (absent > this.#hardTimeoutMs) record(false); // bound memory under truncation
      // otherwise keep waiting (grace, or the view is truncated so absence is unreliable)
    }

    this.#lastComplete = complete;
    return { now, present: names.length, complete, blackout: false, gapMs, arrivals, departures };
  }
}

export interface DepartureSummary {
  readonly count: number;
  readonly minStayMs: number;
  readonly maxStayMs: number;
  readonly medianStayMs: number;
  /** Spread of arrival times among the leavers — small means they came in together. */
  readonly arrivalSpanMs: number;
}

/** Summarise a batch of departures — the shape that reveals a raid leaving together. */
export function summarizeDepartures(
  departures: readonly { firstSeen: number; stayedMs: number }[],
): DepartureSummary | null {
  if (departures.length === 0) return null;
  const stays = departures.map((d) => d.stayedMs).sort((a, b) => a - b);
  const firsts = departures.map((d) => d.firstSeen);
  return {
    count: departures.length,
    minStayMs: stays[0] ?? 0,
    maxStayMs: stays[stays.length - 1] ?? 0,
    medianStayMs: stays[Math.floor(stays.length / 2)] ?? 0,
    arrivalSpanMs: Math.max(...firsts) - Math.min(...firsts),
  };
}
