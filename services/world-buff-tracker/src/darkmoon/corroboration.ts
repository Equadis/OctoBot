import type { FaireLocation } from "./location.js";

/**
 * Tamper resistance for the LFT sighting feed.
 *
 * A `PWB_DMF:` line is just text a player typed on a public channel. Anyone can paste one naming
 * the wrong zone, and without a guard the newest line would win outright — moving the answer AND
 * rewriting the alternation the bot has learned, which then poisons every later month. So one
 * line is never evidence. Two things make it expensive to lie:
 *
 *  1. QUORUM, counted by SENDER. The sender of a channel message is stamped by the server and
 *     cannot be forged; the `witness` inside the payload can be, so it is never counted. This is
 *     the right way round for how PWB actually behaves: each client stores exactly ONE sighting
 *     and rebroadcasts it, so during a real faire the whole realm repeats the SAME witness from
 *     MANY different senders. Honest traffic is therefore wide and shallow — dozens of distinct
 *     senders, one witness — while a troll is deep and narrow. Counting senders rewards the
 *     shape only honest traffic has, and a liar needs that many characters online at once.
 *
 *  2. MAJORITY, not latest. Within the window the location with the most distinct senders wins,
 *     and a tie decides nothing. A troll spamming during a live week is simply outvoted by the
 *     clients quietly agreeing with each other.
 *
 * On top of that the caller applies hysteresis: once a location is settled it is not allowed to
 * move for a cooldown. The faire is in one zone for ten days at a time, so a zone that changes
 * twice in a day is not the faire moving — and the legitimate monthly move happens after weeks of
 * silence, so it is never the thing being blocked.
 */

/** A location claim from one identifiable sender. */
export interface SightingVote {
  readonly location: FaireLocation;
  readonly senderId: string;
  readonly at: number;
}

/** The location currently winning the vote, and how many distinct senders back it. */
export interface Consensus {
  readonly location: FaireLocation;
  readonly senders: number;
}

/**
 * A rolling window of who is claiming what.
 *
 * Deliberately not persisted: it is a live corroboration window, not a fact. After a restart the
 * bot re-gathers it within minutes during a faire week, and the settled sighting it produced is
 * what survives in Mongo.
 */
export class SightingTally {
  readonly #windowMs: number;
  /** One vote per sender — their latest. A client rebroadcasting every 30s must not out-vote a
   *  room, and a sender who changes their claim moves their vote rather than holding two. */
  readonly #votes = new Map<string, { location: FaireLocation; at: number }>();

  constructor(windowMs: number) {
    this.#windowMs = windowMs;
  }

  record(vote: SightingVote): void {
    this.#votes.set(vote.senderId, { location: vote.location, at: vote.at });
    this.#prune(vote.at);
  }

  /** The location with the most distinct senders behind it; null if nothing leads outright. */
  leader(now: number): Consensus | null {
    this.#prune(now);
    const counts = new Map<FaireLocation, number>();
    for (const vote of this.#votes.values()) {
      counts.set(vote.location, (counts.get(vote.location) ?? 0) + 1);
    }
    let best: Consensus | null = null;
    let tied = false;
    for (const [location, senders] of counts) {
      if (best === null || senders > best.senders) {
        best = { location, senders };
        tied = false;
      } else if (senders === best.senders) {
        tied = true;
      }
    }
    // A tie proves nothing — it is exactly what a troll with enough characters would manufacture.
    return tied ? null : best;
  }

  /** Distinct senders currently in the window, for the log line. */
  size(now: number): number {
    this.#prune(now);
    return this.#votes.size;
  }

  #prune(now: number): void {
    for (const [senderId, vote] of this.#votes) {
      if (now - vote.at > this.#windowMs) this.#votes.delete(senderId);
    }
  }
}

/** How the caller is currently answering, for the hysteresis check. */
export interface SettledSighting {
  readonly location: FaireLocation;
  /** When this location was last accepted — refreshed while the realm keeps agreeing. */
  readonly acceptedAt: number;
}

export interface CorroborationPolicy {
  /** Distinct senders needed before a claim counts at all. 1 restores "trust the flood". */
  readonly quorum: number;
  /** How long a settled location is protected from moving to the other zone. */
  readonly changeCooldownMs: number;
}

export const DEFAULT_CORROBORATION: CorroborationPolicy = {
  quorum: 3,
  changeCooldownMs: 12 * 3_600_000,
};

/** The corroboration window: long enough to gather agreement, short enough to stay current. */
export const CORROBORATION_WINDOW_MS = 30 * 60_000;

/**
 * Whether a consensus is allowed to become the answer.
 *
 * Quorum is required even to re-confirm the zone already settled on, because accepting refreshes
 * how recently the faire was seen — which is what "it is up right now" is read off. Without that,
 * one player could keep the faire looking live for weeks after it packed up.
 */
export function shouldSettle(
  policy: CorroborationPolicy,
  settled: SettledSighting | null,
  consensus: Consensus | null,
  now: number,
): boolean {
  if (consensus === null || consensus.senders < policy.quorum) return false;
  if (settled === null || settled.location === consensus.location) return true;
  // A different zone: only after the cooldown. The real monthly move comes after weeks of
  // silence and is never blocked; a mid-week flip is not the faire moving.
  return now - settled.acceptedAt >= policy.changeCooldownMs;
}
